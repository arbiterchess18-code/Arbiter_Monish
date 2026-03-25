from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
import json

from .... import models
from ....database import get_db
from ....core.security import get_current_user, is_tournament_creator_or_admin, get_password_hash
from ....schemas.match import PairingResponse, MatchResultUpdate
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


def _normalize_match_result(raw_result: str) -> str:
    normalized = (raw_result or "").strip()

    allowed_results = {"1-0", "0-1", "1/2-1/2", "0-0", "Bye"}
    if normalized not in allowed_results:
        raise HTTPException(
            status_code=400,
            detail="Invalid result. Allowed: 1-0, 0-1, 1/2-1/2, 0-0, Bye",
        )

    return normalized


@router.post("/{tournament_id}/matches/{match_id}/result")
def submit_match_result(
    tournament_id: int,
    match_id: int,
    result_data: MatchResultUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can submit results")

    match = db.query(models.Match).filter(
        models.Match.match_id == match_id,
        models.Match.tournament_id == tournament_id
    ).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    old_result = match.result
    new_result = _normalize_match_result(result_data.result)

    # Update Match
    match.result = new_result

    # Update Player Points
    white_reg = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.user_id == match.white_player_id
    ).first()

    black_reg = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.user_id == match.black_player_id
    ).first() if match.black_player_id else None

    def get_points(res, player_color):
        if res == "1-0":
            return 1.0 if player_color == "white" else 0.0
        if res == "0-1":
            return 0.0 if player_color == "white" else 1.0
        if res == "1/2-1/2":
            return 0.5
        if res == "0-0":
            return 0.0
        if res == "Bye":
            return 1.0 if player_color == "white" else 0.0
        return 0.0

    # Revert old points
    if old_result:
        if white_reg:
            white_reg.current_points = float(
                white_reg.current_points or 0) - get_points(old_result, "white")
        if black_reg:
            black_reg.current_points = float(
                black_reg.current_points or 0) - get_points(old_result, "black")

    # Apply new points
    new_white_pts = 0.0
    if white_reg:
        white_reg.current_points = float(
            white_reg.current_points or 0) + get_points(new_result, "white")
        new_white_pts = float(white_reg.current_points)
    
    if black_reg:
        black_reg.current_points = float(
            black_reg.current_points or 0) + get_points(new_result, "black")

    # Final commit for match and points
    db.commit()

    # Fire result notifications for both players (non-blocking, non-critical)
    if match.black_player_id and new_result in ("1-0", "0-1", "1/2-1/2", "0-0"):
        try:
            notification_service.notify_match_result(
                db,
                match=match,
                tournament=tournament,
                result=new_result,
            )
            db.commit()
        except Exception as e:
            print(f"Notification Error: {str(e)}")
            db.rollback() # Ensure session is clean

    return {"message": "Result updated successfully", "white_points": new_white_pts}


@router.get("/{tournament_id}/pairings", response_model=PairingResponse)
def get_tournament_pairings(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    approved_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    registration_display_names = {}
    for reg in approved_registrations:
        form_data = _decode_form_data(reg.color_history)
        user = db.query(models.User).filter(
            models.User.user_id == reg.user_id).first()
        if not user:
            continue
        fallback = (
            f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username)
        registration_display_names[reg.user_id] = _extract_display_name(
            form_data, fallback)

    rounds = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id
    ).order_by(models.Round.round_number.asc()).all()

    pairings = []
    for round_item in rounds:
        matches = db.query(models.Match).filter(
            models.Match.round_id == round_item.round_id
        ).order_by(models.Match.board_number.asc()).all()

        for match in matches:
            white_player = db.query(models.User).filter(
                models.User.user_id == match.white_player_id).first() if match.white_player_id else None
            black_player = db.query(models.User).filter(
                models.User.user_id == match.black_player_id).first() if match.black_player_id else None
            pairings.append({
                "match_id": match.match_id,
                "round_number": round_item.round_number,
                "board_number": match.board_number,
                "white_player_id": match.white_player_id,
                "white_player_name": registration_display_names.get(
                    match.white_player_id,
                    (f"{white_player.first_name or ''} {white_player.last_name or ''}".strip(
                    ) if white_player else None) or (white_player.username if white_player else None),
                ),
                "black_player_id": match.black_player_id,
                "black_player_name": registration_display_names.get(
                    match.black_player_id,
                    (f"{black_player.first_name or ''} {black_player.last_name or ''}".strip(
                    ) if black_player else None) or (black_player.username if black_player else None),
                ),
                "result": match.result,
            })

    return {
        "approved_participants": len(approved_registrations),
        "current_round": tournament.current_round or 0,
        "round_status": "not_started" if len(rounds) == 0 else "in_progress",
        "rounds_info": [{"round_number": r.round_number, "is_submitted": r.is_submitted} for r in rounds],
        "pairing_system": tournament.pairing_system,
        "tie_breaker_rules": tournament.tie_break_config or ["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"],
        "pairings": pairings,
    }


@router.post("/{tournament_id}/rounds/{round_number}/finalize")
def finalize_round(
    tournament_id: int,
    round_number: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"--- Finalizing Round {round_number} ---")
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can finalize rounds")

    round_item = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id,
        models.Round.round_number == round_number
    ).first()
    if not round_item:
        raise HTTPException(status_code=404, detail="Round not found")

    # Check for incomplete matches
    incomplete_matches = db.query(models.Match).filter(
        models.Match.round_id == round_item.round_id,
        models.Match.result == None
    ).count()

    if incomplete_matches > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot finalize Round {round_number}: {incomplete_matches} matches have no result entered."
        )

    round_item.is_submitted = True
    db.commit()

    return {"message": f"Round {round_number} finalized successfully", "is_submitted": True}


def _generate_pairings_for_round(db: Session, tournament: models.Tournament, round_record: models.Round, approved_registrations: list):
    """
    Core pairing logic extracted for reuse (Start and Regenerate).
    """
    sorted_regs = approved_registrations
    pairing_system = (tournament.pairing_system or "Swiss").lower()
    next_round = round_record.round_number

    if "knockout" in pairing_system:
        sorted_regs = sorted(
            approved_registrations,
            key=lambda registration: (
                float(registration.current_points or 0), registration.registration_id),
            reverse=True,
        )
        reordered = []
        left = 0
        right = len(sorted_regs) - 1
        while left <= right:
            if left == right:
                reordered.append(sorted_regs[left])
            else:
                reordered.append(sorted_regs[left])
                reordered.append(sorted_regs[right])
            left += 1
            right -= 1
        sorted_regs = reordered
    elif "round robin" in pairing_system:
        sorted_regs = sorted(
            approved_registrations, key=lambda registration: registration.registration_id)
        rotation = (next_round - 1) % max(len(sorted_regs), 1)
        sorted_regs = sorted_regs[rotation:] + sorted_regs[:rotation]
    else:
        # Standard Swiss-ish sorting by points then ID
        sorted_regs = sorted(
            approved_registrations,
            key=lambda registration: (
                float(registration.current_points or 0), registration.registration_id),
            reverse=True,
        )

    board_number = 1
    index = 0
    while index < len(sorted_regs):
        white_reg = sorted_regs[index]
        black_reg = sorted_regs[index + 1] if index + \
            1 < len(sorted_regs) else None

        new_match = models.Match(
            tournament_id=tournament.tournament_id,
            round_id=round_record.round_id,
            white_player_id=white_reg.user_id,
            black_player_id=black_reg.user_id if black_reg else None,
            board_number=board_number,
            result="1-0" if not black_reg else None,  # BYE gives 1 point
        )
        db.add(new_match)

        # Update cache points for BYE (Standings will recalculate anyway, but for immediate UI consistency)
        if not black_reg:
            white_reg.current_points = float(
                white_reg.current_points or 0) + 1.0

        board_number += 1
        index += 2


@router.post("/{tournament_id}/pairings/start")
def start_pairing_round(
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
            status_code=403, detail="Only tournament creator or admin can start pairings")

    if (tournament.current_round or 0) == 0 and tournament.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Tournament must be officially started before generating Round 1 pairings"
        )

    approved_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    if len(approved_registrations) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 approved participants are required")

    next_round = (tournament.current_round or 0) + 1
    if tournament.rounds and next_round > tournament.rounds:
        raise HTTPException(
            status_code=400, detail="All configured rounds are already generated")

    if tournament.current_round and tournament.current_round > 0:
        prev_round = db.query(models.Round).filter(
            models.Round.tournament_id == tournament_id,
            models.Round.round_number == tournament.current_round
        ).first()
        if prev_round and not prev_round.is_submitted:
            raise HTTPException(
                status_code=400,
                detail=f"Round {tournament.current_round} must be finalized before starting Round {next_round}."
            )

    round_record = models.Round(
        tournament_id=tournament_id,
        round_number=next_round,
    )
    db.add(round_record)
    db.flush()

    _generate_pairings_for_round(
        db, tournament, round_record, approved_registrations)

    tournament.current_round = next_round
    if tournament.status == "upcoming":
        tournament.status = "active"

    db.commit()

    # Notify all players
    player_ids = [reg.user_id for reg in approved_registrations if reg.user_id]
    notification_service.notify_round_pairing(
        db, tournament=tournament, round_number=next_round, player_ids=player_ids
    )
    db.commit()

    return {"message": f"Round {next_round} pairings generated successfully"}


@router.post("/{tournament_id}/pairings/regenerate")
def regenerate_pairing_round(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    print(f"--- Regenerating Pairings for Tournament {tournament_id} ---")
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can regenerate pairings")

    if not tournament.current_round or tournament.current_round == 0:
        print(
            f"❌ Regenerate failed: current_round is {tournament.current_round}")
        raise HTTPException(
            status_code=400, detail="No round exists to regenerate")

    round_item = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id,
        models.Round.round_number == tournament.current_round
    ).first()

    if not round_item:
        print(
            f"❌ Regenerate failed: Round record for {tournament.current_round} not found in DB")
        raise HTTPException(status_code=404, detail="Current round not found")

    if round_item.is_submitted:
        print(
            f"❌ Regenerate failed: Round {tournament.current_round} is already submitted")
        raise HTTPException(
            status_code=400, detail="Cannot regenerate pairings after round results are submitted")

    # Delete existing matches for this round
    db.query(models.Match).filter(
        models.Match.round_id == round_item.round_id).delete()
    db.commit()

    # Refresh registrations to clear BYE points if they exist
    # (Actually, points are best recalculated from scratch, but let's be safe)
    from ...logic.standings import calculate_standings
    _, standings_data = calculate_standings(db, tournament_id)

    # Sync current_points cache on registrations
    reg_map = {reg.user_id: reg for reg in db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id).all()}
    for entry in standings_data:
        if entry["user_id"] in reg_map:
            reg_map[entry["user_id"]].current_points = entry["points"]

    db.commit()

    approved_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    _generate_pairings_for_round(
        db, tournament, round_item, approved_registrations)
    db.commit()

    return {"message": f"Round {tournament.current_round} pairings regenerated successfully"}


@router.post("/{tournament_id}/seed-players")
def seed_players(
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
            status_code=403, detail="Only tournament creator or admin can seed players")

    # Create 8 dummy players
    test_players = [
        {"username": f"test_player_{i}_{tournament_id}",
            "email": f"test_{i}_{tournament_id}@example.com", "name": f"Test Player {i}"}
        for i in range(1, 9)
    ]

    seeded_count = 0
    for p_data in test_players:
        # Check if user exists
        user = db.query(models.User).filter(
            models.User.email == p_data["email"]).first()
        if not user:
            user = models.User(
                username=p_data["username"],
                email=p_data["email"],
                hashed_password=get_password_hash("password123"),
                first_name=p_data["name"],
                country="India",
                is_active=True
            )
            db.add(user)
            db.flush()

        # Check if already registered
        reg = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == tournament_id,
            models.TournamentRegistration.user_id == user.user_id
        ).first()

        if not reg:
            reg = models.TournamentRegistration(
                tournament_id=tournament_id,
                user_id=user.user_id,
                status="approved",  # Auto-approve for seeding
            )
            db.add(reg)
            seeded_count += 1

    db.commit()
    return {"message": f"Successfully seeded {seeded_count} players", "total_players": len(test_players)}
