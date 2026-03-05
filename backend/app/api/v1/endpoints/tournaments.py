from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from .... import models
from ....database import get_db
from ....core.security import get_current_user, check_role, get_user_roles, has_privileged_role
from ....schemas.tournament import (
    TournamentCreate, TournamentUpdate, TournamentResponse, TournamentViewDetailsResponse
)

router = APIRouter()

@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    tournament: TournamentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        check_role(["SUPER_ADMIN", "ADMIN", "ARBITER"]))
):
    try:
        new_tournament = models.Tournament(
            **tournament.model_dump(),
            created_by=current_user.user_id,
            status="upcoming"
        )
        db.add(new_tournament)
        db.commit()
        db.refresh(new_tournament)
        return new_tournament
    except Exception as e:
        import traceback
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"❌ Error creating tournament: {error_msg}")
        # print(traceback.format_exc()) # Uncomment for full stack trace in terminal
        raise HTTPException(
            status_code=400, detail=f"Failed to create tournament: {error_msg}")

@router.get("/public", response_model=List[TournamentResponse])
async def get_public_tournaments(db: Session = Depends(get_db)):
    """Players can see all non-private tournaments that are published, upcoming, or active"""
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.is_private == False,
        models.Tournament.status.in_(["published", "upcoming", "active"])
    ).order_by(models.Tournament.start_date.asc()).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments

@router.get("", response_model=List[TournamentResponse])
async def list_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(models.Tournament).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments

@router.get("/arbiter", response_model=List[TournamentResponse])
async def list_arbiter_tournaments(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tournaments created by the current arbiter"""
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.created_by == current_user.user_id
    ).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments

@router.get("/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament

@router.put("/{tournament_id}", response_model=TournamentResponse)
async def update_tournament(
    tournament_id: int,
    tournament_update: TournamentUpdate,
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
            status_code=403, detail="You can only update your own tournaments")

    from datetime import date
    today = date.today()

    # Rule 1: Cannot start tournament before scheduled date
    if tournament_update.status == "active" and tournament.status != "active":
        if tournament.start_date and today < tournament.start_date:
            raise HTTPException(
                status_code=400, 
                detail=f"Tournament cannot be started before {tournament.start_date}"
            )

    # Rule 2: Cannot unpublish once tournament date has arrived
    if tournament_update.status == "upcoming" and tournament.status == "published":
        if tournament.start_date and today >= tournament.start_date:
            raise HTTPException(
                status_code=400,
                detail="Tournament cannot be unpublished once the start date has arrived"
            )

    # Rule 6: Notifications on Start
    if tournament_update.status == "active" and tournament.status != "active":
        from ....services import notification_service, email_service
        # Get all approved/active registrations to notify
        player_ids = [reg.user_id for reg in tournament.registrations if reg.user_id and reg.status in ("approved", "active")]
        if player_ids:
            notification_service.notify_tournament_started(db, tournament=tournament, player_ids=player_ids)
            email_service.send_tournament_started_email(db, tournament_id=tournament.tournament_id)

    # Notifications on Completion
    if tournament_update.status == "completed" and tournament.status != "completed":
        from ....services import email_service
        email_service.send_tournament_results_email(db, tournament_id=tournament.tournament_id)

    for key, value in tournament_update.model_dump(exclude_unset=True).items():
        setattr(tournament, key, value)

    db.commit()
    db.refresh(tournament)
    return tournament

@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tournament(
    tournament_id: int,
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
            status_code=403, detail="You can only delete your own tournaments")

    # Rule 4: Cannot delete ongoing tournament
    if tournament.status == "active":
        raise HTTPException(
            status_code=400,
            detail="Ongoing tournaments cannot be deleted"
        )

    db.delete(tournament)
    db.commit()

@router.get("/{tournament_id}/view-details", response_model=TournamentViewDetailsResponse)
async def get_tournament_view_details(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    roles = get_user_roles(current_user)
    is_creator = tournament.created_by == current_user.user_id
    can_manage = is_creator or has_privileged_role(
        current_user) or "ARBITER" in roles

    approved_count = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status == "approved"
    ).count()
    total_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id
    ).count()

    rounds_started = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id
    ).count()

    available_tabs = ["overview", "participants", "pairings", "standings"]
    if can_manage:
        available_tabs = ["overview", "participants",
                          "registrations", "pairings", "standings", "settings"]

    return {
        "tournament": tournament,
        "stats": {
            "players": f"{approved_count}/{tournament.max_players or 0}",
            "total_registrations": total_registrations,
            "approved_players": approved_count,
            "rounds": f"{rounds_started}/{tournament.rounds or 0}",
            "entry_fee": float(tournament.entry_fee or 0),
            "rating_requirement": tournament.min_rating or 0,
            "format": tournament.pairing_system or "Swiss",
            "prize_pool": "TBD"
        },
        "tie_breaker_rules": ["Buchholz", "Sonneborn-Berger", "Wins with Black"],
        "available_tabs": available_tabs,
    }

@router.get("/{tournament_id}/standings")
async def get_standings(tournament_id: int, db: Session = Depends(get_db)):
    from ....logic.standings import calculate_standings
    
    tournament, standings_data = calculate_standings(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Get the top 3 tie-break names for display
    tb_config = tournament.tie_break_config or ["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"]
    top_tbs = [tb for tb in tb_config if tb != "Direct Encounter"][:3]

    final_standings = []
    for p in standings_data:
        row = {
            "rank": p["rank"],
            "user_id": p["user_id"],
            "starting_no": p["starting_no"],
            "player_name": p["player_name"],
            "rating": p["rating"],
            "points": p["points"],
        }
        # Add the 3 display columns
        for i, label in enumerate(top_tbs, start=1):
            row[f"tb{i}"] = p["tb_map"].get(label, 0.0)
        
        final_standings.append(row)

    return {
        "tie_break_names": top_tbs,
        "standings": final_standings,
    }
