from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import DataError, DBAPIError, StatementError
from sqlalchemy import text
from typing import List, Dict, Any
import json
from datetime import datetime

from .... import models
from ....database import get_db
from ....core.security import get_current_user, is_tournament_creator_or_admin, is_tournament_staff_or_admin, check_role, has_privileged_role, get_password_hash
from ....schemas.registration import (
    TournamentRegistrationCreate, TournamentRegistrationResponse,
    TournamentRegistrationStatusUpdate, RegistrationFormFieldCreate, RegistrationFormFieldResponse,
    BulkParticipantImport, BulkImportResponse
)
from ....services import notification_service

router = APIRouter()


def _decode_form_data(raw_value: Any) -> Dict[str, Any]:
    if isinstance(raw_value, dict):
        return raw_value
    if not raw_value:
        return {}
    try:
        decoded = json.loads(raw_value)
        return decoded if isinstance(decoded, dict) else {}
    except Exception:
        return {}


def _extract_display_name(form_data: Dict[str, Any], fallback_name: str) -> str:
    if not isinstance(form_data, dict):
        return fallback_name

    candidate_keys = [
        "name",
        "full name",
        "full_name",
        "player name",
        "player_name",
    ]

    lowered_map = {str(key).strip().lower(): value for key,
                   value in form_data.items()}
    for key in candidate_keys:
        value = lowered_map.get(key)
        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned and not cleaned.startswith("data:image"):
                return cleaned

    for key, value in lowered_map.items():
        if "name" in key and isinstance(value, str):
            cleaned = value.strip()
            if cleaned and not cleaned.startswith("data:image"):
                return cleaned

    return fallback_name


def _looks_like_payload_size_error(exc: Exception) -> bool:
    message = str(getattr(exc, "orig", exc)).lower()
    markers = [
        "data too long",
        "value too long",
        "stringdata right truncation",
        "out of range value",
        "too long for type",
        "color_history",
    ]
    return any(marker in message for marker in markers)


def _try_expand_color_history_column(db: Session) -> bool:
    try:
        dialect_name = db.bind.dialect.name if db.bind else ""
        if dialect_name == "postgresql":
            db.execute(
                text(
                    "ALTER TABLE tournament_registrations ALTER COLUMN color_history TYPE TEXT"
                )
            )
            db.commit()
            return True
        if dialect_name in {"mysql", "mariadb"}:
            db.execute(
                text(
                    "ALTER TABLE tournament_registrations MODIFY COLUMN color_history LONGTEXT"
                )
            )
            db.commit()
            return True
    except Exception:
        db.rollback()
        return False
    return False


@router.post("/{tournament_id}/registrations", response_model=TournamentRegistrationResponse, status_code=status.HTTP_201_CREATED)
def register_for_tournament(
    tournament_id: int,
    registration_data: TournamentRegistrationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status == "completed":
        raise HTTPException(
            status_code=400, detail="Registration is closed for completed tournaments")

    if tournament.max_players:
        approved_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
        if approved_count >= tournament.max_players:
            raise HTTPException(
                status_code=400, detail="Tournament registration is full")

    if registration_data.is_manual:
        if not is_tournament_staff_or_admin(tournament, current_user):
            raise HTTPException(
                status_code=403, detail="Only tournament staff or admin can register players manually")
        if not registration_data.player_email or not registration_data.player_name:
            raise HTTPException(
                status_code=400, detail="Player email and name are required for manual registration")

        target_email = registration_data.player_email.lower().strip()
        target_user = db.query(models.User).filter(
            models.User.email == target_email).first()
        if not target_user:
            target_user = models.User(
                username=target_email.split("@")[0] + "_onsite",
                email=target_email,
                first_name=registration_data.player_name,
                hashed_password=get_password_hash("onsite123"),  # placeholder
                fide_id=registration_data.player_fide_id,
                fide_rating=registration_data.player_rating or 0,
                is_active=True
            )
            db.add(target_user)
            db.flush()

        user_to_register_id = target_user.user_id
        status_value = "approved"
        payload = registration_data.form_data or {}
        payload["is_manual"] = True
        if registration_data.player_phone:
            payload["phone"] = registration_data.player_phone
    else:
        user_to_register_id = current_user.user_id
        status_value = "pending"
        payload = registration_data.form_data or {}

    existing = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.user_id == user_to_register_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="Player has already registered for this tournament")

    if not registration_data.is_manual:
        form_fields = db.query(models.RegistrationFormField).filter(
            models.RegistrationFormField.tournament_id == tournament_id
        ).order_by(models.RegistrationFormField.field_order).all()

        for field in form_fields:
            if field.is_required:
                value = payload.get(field.field_name)
                if value is None or (isinstance(value, str) and not value.strip()):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Missing required registration field: {field.field_name}",
                    )

    serialized_payload = json.dumps(payload)
    if len(serialized_payload) > 60000:
        raise HTTPException(
            status_code=422,
            detail="Submitted form data is too large. Please upload a smaller image.",
        )

    new_registration = models.TournamentRegistration(
        tournament_id=tournament_id,
        user_id=user_to_register_id,
        status=status_value,
        color_history=serialized_payload,
    )
    db.add(new_registration)
    try:
        db.commit()
    except (DataError, DBAPIError, StatementError) as exc:
        db.rollback()

        if _looks_like_payload_size_error(exc) and _try_expand_color_history_column(db):
            try:
                db.add(new_registration)
                db.commit()
            except (DataError, DBAPIError, StatementError) as retry_exc:
                db.rollback()
                if _looks_like_payload_size_error(retry_exc):
                    raise HTTPException(
                        status_code=422,
                        detail="Submitted form data is too large. Please upload a smaller image.",
                    )
                raise HTTPException(
                    status_code=422,
                    detail="Unable to save registration data. Please verify your form values and retry.",
                )
        elif _looks_like_payload_size_error(exc):
            raise HTTPException(
                status_code=422,
                detail="Submitted form data is too large. Please upload a smaller image.",
            )

        raise HTTPException(
            status_code=422,
            detail="Unable to save registration data. Please verify your form values and retry.",
        )

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=422,
            detail="Unable to save registration data. Please verify your form values and retry.",
        )
    db.refresh(new_registration)

    target_user_model = db.query(models.User).filter(
        models.User.user_id == user_to_register_id).first()
    full_name = f"{target_user_model.first_name or ''} {target_user_model.last_name or ''}".strip(
    ) or target_user_model.username
    form_data = _decode_form_data(new_registration.color_history)
    display_name = _extract_display_name(form_data, full_name)
    return {
        "registration_id": new_registration.registration_id,
        "tournament_id": tournament_id,
        "user_id": user_to_register_id,
        "user_name": display_name,
        "user_email": target_user_model.email,
        "registration_date": new_registration.registration_date,
        "status": new_registration.status,
        "current_points": float(new_registration.current_points or 0),
        "seed": new_registration.seed,
        "player_rating": target_user_model.fide_rating or target_user_model.national_rating or 0,
        "form_data": form_data,
    }


@router.get("/{tournament_id}/registrations", response_model=List[TournamentRegistrationResponse])
def get_tournament_registrations(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    is_privileged = is_tournament_staff_or_admin(tournament, current_user)

    # Arbiters/admins see all registrations (including pending)
    # Regular players only see approved/active registrations
    query = db.query(models.TournamentRegistration).options(
        joinedload(models.TournamentRegistration.user)
    ).filter(
        models.TournamentRegistration.tournament_id == tournament_id
    )

    if not is_privileged:
        query = query.filter(
            models.TournamentRegistration.status.in_(["approved", "active"])
        )

    registrations = query.order_by(
        models.TournamentRegistration.registration_date.desc()).all()

    response = []
    for registration in registrations:
        user = registration.user
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip(
        ) or user.username
        form_data = _decode_form_data(registration.color_history)
        display_name = _extract_display_name(form_data, full_name)
        response.append({
            "registration_id": registration.registration_id,
            "tournament_id": registration.tournament_id,
            "user_id": registration.user_id,
            "user_name": display_name,
            "user_email": user.email,
            "registration_date": registration.registration_date,
            "status": registration.status,
            "current_points": float(registration.current_points or 0),
            "seed": registration.seed,
            "player_rating": user.fide_rating or user.national_rating or 0,
            "form_data": form_data,
        })
    return response


@router.patch("/{tournament_id}/registrations/{registration_id}/status", response_model=TournamentRegistrationResponse)
def update_registration_status(
    tournament_id: int,
    registration_id: int,
    status_update: TournamentRegistrationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_staff_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament staff or admin can manage registrations")

    # Rule 3: Can only accept registrations after tournament has started
    if status_update.status == "approved" and tournament.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Registrations can only be approved after the tournament has started"
        )

    registration = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.registration_id == registration_id,
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    registration.status = status_update.status
    db.commit()
    db.refresh(registration)

    # Notify player of status change
    notification_service.notify_registration_status(
        db,
        user_id=registration.user_id,
        tournament_name=tournament.tournament_name,
        tournament_id=tournament.tournament_id,
        status=registration.status
    )
    db.commit()

    user = db.query(models.User).filter(
        models.User.user_id == registration.user_id).first()
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip(
    ) or user.username
    form_data = _decode_form_data(registration.color_history)
    display_name = _extract_display_name(form_data, full_name)
    return {
        "registration_id": registration.registration_id,
        "tournament_id": registration.tournament_id,
        "user_id": registration.user_id,
        "user_name": display_name,
        "user_email": user.email,
        "registration_date": registration.registration_date,
        "status": registration.status,
        "current_points": float(registration.current_points or 0),
        "seed": registration.seed,
        "player_rating": user.fide_rating or user.national_rating or 0,
        "form_data": form_data,
    }

# Registration form fields endpoints


@router.post("/{tournament_id}/registration-form-fields", response_model=RegistrationFormFieldResponse, status_code=status.HTTP_201_CREATED)
def create_form_field(
    tournament_id: int,
    field: RegistrationFormFieldCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER", "ORGANIZATION"]))
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only modify your own tournament forms")

    new_field = models.RegistrationFormField(
        tournament_id=tournament_id,
        **field.model_dump()
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field


@router.get("/{tournament_id}/registration-form-fields", response_model=List[RegistrationFormFieldResponse])
def get_form_fields(tournament_id: int, db: Session = Depends(get_db)):
    fields = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).order_by(models.RegistrationFormField.field_order).all()
    return fields


@router.put("/{tournament_id}/registration-form-fields", response_model=List[RegistrationFormFieldResponse])
def replace_form_fields(
    tournament_id: int,
    fields: List[RegistrationFormFieldCreate],
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER", "ORGANIZATION"]))
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only modify your own tournament forms")

    db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).delete(synchronize_session=False)

    created_fields = []
    for index, field in enumerate(fields):
        new_field = models.RegistrationFormField(
            tournament_id=tournament_id,
            field_name=field.field_name,
            field_type=field.field_type,
            is_required=field.is_required,
            field_order=index,
        )
        db.add(new_field)
        created_fields.append(new_field)

    db.commit()

    refreshed = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).order_by(models.RegistrationFormField.field_order).all()
    return refreshed


@router.put("/{tournament_id}/registration-form-fields/{field_id}", response_model=RegistrationFormFieldResponse)
def update_form_field(
    tournament_id: int,
    field_id: int,
    field_update: RegistrationFormFieldCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER", "ORGANIZATION"]))
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only modify your own tournament forms")

    form_field = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id,
        models.RegistrationFormField.field_id == field_id,
    ).first()
    if not form_field:
        raise HTTPException(
            status_code=404, detail="Registration form field not found")

    form_field.field_name = field_update.field_name
    form_field.field_type = field_update.field_type
    form_field.is_required = field_update.is_required
    form_field.field_order = field_update.field_order

    db.commit()
    db.refresh(form_field)
    return form_field


@router.delete("/{tournament_id}/registration-form-fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form_field(
    tournament_id: int,
    field_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER", "ORGANIZATION"]))
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only modify your own tournament forms")

    form_field = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id,
        models.RegistrationFormField.field_id == field_id,
    ).first()
    if not form_field:
        # Idempotent delete: if already removed, return success.
        return None

    db.delete(form_field)
    db.commit()
    return None


@router.post("/{tournament_id}/registrations/bulk-import", response_model=BulkImportResponse)
def bulk_import_participants(
    tournament_id: int,
    import_data: BulkParticipantImport,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Bulk import participants from Excel/CSV file"""

    # Verify tournament exists and user is authorized
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id
    ).first()

    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Check if current user is tournament staff or admin
    if not is_tournament_staff_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403,
            detail="Only tournament staff or admin can import participants"
        )

    if tournament.status == "completed":
        raise HTTPException(
            status_code=400,
            detail="Cannot import participants for completed tournaments"
        )

    # Process imports
    successful_registrations = []
    failed_imports = []

    for idx, participant in enumerate(import_data.participants):
        try:
            # Validate required fields
            if not participant.player_name or not participant.player_email:
                failed_imports.append({
                    "row": idx + 1,
                    "player_name": participant.player_name,
                    "error": "Missing player name or email"
                })
                continue

            # Check if already registered
            existing_reg = db.query(models.TournamentRegistration).join(
                models.User,
                models.TournamentRegistration.user_id == models.User.user_id
            ).filter(
                models.TournamentRegistration.tournament_id == tournament_id,
                models.User.email == participant.player_email.lower()
            ).first()

            if existing_reg:
                failed_imports.append({
                    "row": idx + 1,
                    "player_name": participant.player_name,
                    "error": "Player already registered for this tournament"
                })
                continue

            # Check max players limit
            if tournament.max_players:
                approved_count = db.query(models.TournamentRegistration).filter(
                    models.TournamentRegistration.tournament_id == tournament_id,
                    models.TournamentRegistration.status.in_(
                        ["approved", "active"])
                ).count()
                if approved_count >= tournament.max_players:
                    failed_imports.append({
                        "row": idx + 1,
                        "player_name": participant.player_name,
                        "error": "Tournament registration is full"
                    })
                    continue

            # Get or create user
            target_email = participant.player_email.lower().strip()
            target_user = db.query(models.User).filter(
                models.User.email == target_email
            ).first()

            if not target_user:
                # Create an onsite player account if the user does not exist yet.
                username_base = target_email.split("@")[0]
                username_candidate = f"{username_base}_import"
                suffix = 1
                while db.query(models.User).filter(models.User.username == username_candidate).first():
                    username_candidate = f"{username_base}_import_{suffix}"
                    suffix += 1

                target_user = models.User(
                    username=username_candidate,
                    email=target_email,
                    first_name=participant.player_name,
                    hashed_password=get_password_hash("imported123"),
                    fide_rating=participant.player_rating or 0,
                    is_active=True,
                    is_verified=True,
                )
                db.add(target_user)
                db.flush()  # Get the user_id

            # Create registration
            registration = models.TournamentRegistration(
                tournament_id=tournament_id,
                user_id=target_user.user_id,
                status="approved",  # Bulk imported are auto-approved
                registration_date=datetime.utcnow(),
                color_history=json.dumps({
                    "rating": participant.player_rating,
                    "email": target_email,
                    "imported": True,
                    "import_date": datetime.utcnow().isoformat()
                })
            )

            # Update user rating if provided
            if participant.player_rating:
                target_user.fide_rating = participant.player_rating

            db.add(registration)
            db.flush()
            db.refresh(registration)

            # Build response object
            response_obj = TournamentRegistrationResponse(
                registration_id=registration.registration_id,
                tournament_id=registration.tournament_id,
                user_id=registration.user_id,
                user_name=(f"{target_user.first_name or ''} {target_user.last_name or ''}".strip(
                ) or target_user.username),
                user_email=target_user.email,
                registration_date=registration.registration_date,
                status=registration.status,
                current_points=0.0,
                seed=registration.seed,
                player_rating=participant.player_rating or 0
            )
            successful_registrations.append(response_obj)

        except Exception as e:
            failed_imports.append({
                "row": idx + 1,
                "player_name": participant.player_name,
                "error": str(e)
            })

    # Commit all changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=f"Error saving imports: {str(e)}"
        )

    return BulkImportResponse(
        total_processed=len(import_data.participants),
        successful=len(successful_registrations),
        failed=len(failed_imports),
        imported=successful_registrations,
        errors=failed_imports
    )
