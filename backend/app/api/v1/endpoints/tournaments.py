from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    """Players only see what is ready"""
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.is_private == False,
        models.Tournament.status == "published"
    ).all()
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

    available_tabs = ["overview", "pairings"]
    if can_manage:
        available_tabs = ["overview", "participants",
                          "registrations", "pairings", "settings"]

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
async def get_standings(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    standings = []
    for registration in registrations:
        player = db.query(models.User).filter(
            models.User.user_id == registration.user_id).first()
        standings.append({
            "user_id": registration.user_id,
            "player_name": f"{player.first_name or ''} {player.last_name or ''}".strip() or player.username,
            "points": float(registration.current_points or 0),
            "buchholz": 0.0,
            "sonneborn_berger": 0.0,
            "wins_with_black": 0,
        })

    standings.sort(
        key=lambda item: (
            item["points"],
            item["buchholz"],
            item["sonneborn_berger"],
            item["wins_with_black"],
        ),
        reverse=True,
    )

    for idx, item in enumerate(standings, start=1):
        item["rank"] = idx

    return {
        "tie_breaker_rules": ["Buchholz", "Sonneborn-Berger", "Wins with Black"],
        "standings": standings,
    }
