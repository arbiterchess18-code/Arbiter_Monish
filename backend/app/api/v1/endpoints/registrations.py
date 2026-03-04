from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict, Any
import json

from .... import models
from ....database import get_db
from ....core.security import get_current_user, is_tournament_creator_or_admin, check_role, has_privileged_role, get_password_hash
from ....schemas.registration import (
    TournamentRegistrationCreate, TournamentRegistrationResponse, 
    TournamentRegistrationStatusUpdate, RegistrationFormFieldCreate, RegistrationFormFieldResponse
)
from ....services import notification_service

router = APIRouter()

@router.post("/{tournament_id}/registrations", response_model=TournamentRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_tournament(
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
        if not is_tournament_creator_or_admin(tournament, current_user):
            raise HTTPException(status_code=403, detail="Only tournament creator or admin can register players manually")
        if not registration_data.player_email or not registration_data.player_name:
            raise HTTPException(status_code=400, detail="Player email and name are required for manual registration")
            
        target_email = registration_data.player_email.lower().strip()
        target_user = db.query(models.User).filter(models.User.email == target_email).first()
        if not target_user:
            target_user = models.User(
                username=target_email.split("@")[0] + "_onsite",
                email=target_email,
                first_name=registration_data.player_name,
                hashed_password=get_password_hash("onsite123"), # placeholder
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

    new_registration = models.TournamentRegistration(
        tournament_id=tournament_id,
        user_id=user_to_register_id,
        status=status_value,
        color_history=json.dumps(payload),
    )
    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)

    target_user_model = db.query(models.User).filter(models.User.user_id == user_to_register_id).first()
    full_name = f"{target_user_model.first_name or ''} {target_user_model.last_name or ''}".strip() or target_user_model.username
    return {
        "registration_id": new_registration.registration_id,
        "tournament_id": tournament_id,
        "user_id": user_to_register_id,
        "user_name": full_name,
        "user_email": target_user_model.email,
        "registration_date": new_registration.registration_date,
        "status": new_registration.status,
        "current_points": float(new_registration.current_points or 0),
        "seed": new_registration.seed,
        "player_rating": target_user_model.fide_rating or target_user_model.national_rating or 0,
    }

@router.get("/{tournament_id}/registrations", response_model=List[TournamentRegistrationResponse])
async def get_tournament_registrations(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can view registrations")

    registrations = db.query(models.TournamentRegistration).options(
        joinedload(models.TournamentRegistration.user)
    ).filter(
        models.TournamentRegistration.tournament_id == tournament_id
    ).order_by(models.TournamentRegistration.registration_date.desc()).all()

    response = []
    for registration in registrations:
        user = registration.user
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip(
        ) or user.username
        response.append({
            "registration_id": registration.registration_id,
            "tournament_id": registration.tournament_id,
            "user_id": registration.user_id,
            "user_name": full_name,
            "user_email": user.email,
            "registration_date": registration.registration_date,
            "status": registration.status,
            "current_points": float(registration.current_points or 0),
            "seed": registration.seed,
            "player_rating": user.fide_rating or user.national_rating or 0,
        })
    return response

@router.patch("/{tournament_id}/registrations/{registration_id}/status", response_model=TournamentRegistrationResponse)
async def update_registration_status(
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

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can manage registrations")

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
    return {
        "registration_id": registration.registration_id,
        "tournament_id": registration.tournament_id,
        "user_id": registration.user_id,
        "user_name": full_name,
        "user_email": user.email,
        "registration_date": registration.registration_date,
        "status": registration.status,
        "current_points": float(registration.current_points or 0),
        "seed": registration.seed,
        "player_rating": user.fide_rating or user.national_rating or 0,
    }

# Registration form fields endpoints
@router.post("/{tournament_id}/registration-form-fields", response_model=RegistrationFormFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_form_field(
    tournament_id: int,
    field: RegistrationFormFieldCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER"]))
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
async def get_form_fields(tournament_id: int, db: Session = Depends(get_db)):
    fields = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).order_by(models.RegistrationFormField.field_order).all()
    return fields
