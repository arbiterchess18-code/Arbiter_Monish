from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List

from .... import models
from ....database import get_db
from ....core.security import (
    get_current_user, check_role, get_user_roles,
    has_privileged_role, is_tournament_staff_or_admin
)
from ....schemas.tournament import (
    TournamentCreate, TournamentUpdate, TournamentResponse, TournamentViewDetailsResponse
)

router = APIRouter()


@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
def create_tournament(
    tournament: TournamentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        user_roles = get_user_roles(current_user)
        allowed_roles = {
            "SUPER_ADMIN",
            "ADMIN",
            "ARBITER",
            "ORGANIZATION",
        }
        # Some legacy accounts can have missing role links even though they are
        # authenticated and expected to manage tournaments. Only block when
        # roles are present and explicitly outside the allowed set.
        if user_roles and user_roles.isdisjoint(allowed_roles):
            raise HTTPException(
                status_code=403,
                detail="Only Admin, Arbiter, or Organization users can create tournaments",
            )

        data = tournament.model_dump()
        sub_arbiters_data = data.pop("sub_arbiters", [])

        new_tournament = models.Tournament(
            **data,
            created_by=current_user.user_id,
            status="upcoming"
        )
        db.add(new_tournament)
        db.flush()

        # Add sub arbiters to the relational table
        for staff_member in sub_arbiters_data:
            if staff_member.get('user_id'):
                new_staff = models.TournamentStaff(
                    tournament_id=new_tournament.tournament_id,
                    user_id=int(staff_member.get('user_id')),
                    role_title=staff_member.get('position', 'Sub-Arbiter'),
                    fide_id=staff_member.get('fide_id', '')
                )
                db.add(new_staff)

        db.commit()
        db.refresh(new_tournament)
        return new_tournament
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        print(f"❌ Error creating tournament: {error_msg}")
        raise HTTPException(
            status_code=400, detail=f"Failed to create tournament: {error_msg}")


@router.get("/public", response_model=List[TournamentResponse])
def get_public_tournaments(
    search: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Players can see all non-private tournaments that are published, upcoming, or active"""
    query = db.query(models.Tournament).filter(
        models.Tournament.is_private == False)

    if status and status != "all":
        query = query.filter(models.Tournament.status == status)
    else:
        query = query.filter(models.Tournament.status.in_(
            ["published", "upcoming", "active", "completed"]))

    if search:
        query = query.filter(
            models.Tournament.tournament_name.ilike(f"%{search}%"))

    if type and type != "all":
        query = query.filter(
            (models.Tournament.pairing_system == type) |
            (models.Tournament.event_type == type)
        )

    tournaments = query.order_by(models.Tournament.start_date.asc()).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments


@router.get("", response_model=List[TournamentResponse])
def list_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(models.Tournament).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments


@router.get("/arbiter", response_model=List[TournamentResponse])
def list_arbiter_tournaments(
    role: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tournaments created by the current arbiter or where they are a sub-arbiter"""
    from sqlalchemy import or_

    uid = current_user.user_id

    query = db.query(models.Tournament).options(
        joinedload(models.Tournament.staff))

    if role == "sub_arbiter":
        query = query.join(models.TournamentStaff).filter(
            models.TournamentStaff.user_id == uid
        ).distinct()
    else:
        query = query.outerjoin(models.TournamentStaff).filter(
            or_(
                models.Tournament.created_by == uid,
                models.TournamentStaff.user_id == uid
            )
        ).distinct()

    tournaments = query.all()

    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()

    return tournaments


@router.get("/stats/overview")
def get_statistics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get tournament statistics for the current arbiter/organizer"""
    from sqlalchemy import func, extract
    from datetime import datetime, timedelta

    # Get all tournaments created by the current user
    tournaments = db.query(models.Tournament).filter(
        models.Tournament.created_by == current_user.user_id
    ).all()

    tournament_ids = [t.tournament_id for t in tournaments]

    if not tournament_ids:
        return {
            "totalMatches": 0,
            "completedTournaments": len([t for t in tournaments if t.status == "completed"]),
            "avgPlayers": 0,
            "avgRating": 0,
            "monthlyMatches": [],
            "matchResults": []
        }

    # Calculate total matches
    total_matches = db.query(func.count(models.Match.match_id)).filter(
        models.Match.tournament_id.in_(tournament_ids)
    ).scalar() or 0

    # Count completed tournaments
    completed_tournaments = len(
        [t for t in tournaments if t.status == "completed"])

    # Calculate average players per tournament
    avg_players = 0
    if tournament_ids:
        player_counts = []
        for tid in tournament_ids:
            count = db.query(models.TournamentRegistration).filter(
                models.TournamentRegistration.tournament_id == tid,
                models.TournamentRegistration.status.in_(
                    ["approved", "active"])
            ).count()
            player_counts.append(count)
        avg_players = int(sum(player_counts) /
                          len(player_counts)) if player_counts else 0

    # Calculate average rating of players
    avg_rating = 0
    all_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id.in_(tournament_ids)
    ).all()

    if all_registrations:
        ratings = []
        for reg in all_registrations:
            user = db.query(models.User).filter(
                models.User.user_id == reg.user_id).first()
            if user:
                ratings.append(user.fide_rating or 0)
        avg_rating = int(sum(ratings) / len(ratings)) if ratings else 0

    # Get monthly match data for the last 6 months
    now = datetime.now()
    six_months_ago = now - timedelta(days=180)

    monthly_data = {}
    for i in range(6):
        date = now - timedelta(days=30*i)
        month_key = date.strftime("%b")
        monthly_data[month_key] = 0

    matches = db.query(models.Match).filter(
        models.Match.tournament_id.in_(tournament_ids),
        models.Match.created_at >= six_months_ago
    ).all()

    for match in matches:
        month_key = match.created_at.strftime("%b")
        if month_key in monthly_data:
            monthly_data[month_key] += 1

    monthly_matches = [{"month": month, "matches": count}
                       for month, count in reversed(list(monthly_data.items()))]

    # Get match result distribution
    match_results = db.query(models.Match.result, func.count(models.Match.match_id)).filter(
        models.Match.tournament_id.in_(tournament_ids)
    ).group_by(models.Match.result).all()

    result_dist = []
    for result, count in match_results:
        if result == "1-0":
            result_dist.append({"result": "White Wins", "count": count})
        elif result == "0-1":
            result_dist.append({"result": "Black Wins", "count": count})
        elif result == "1/2-1/2":
            result_dist.append({"result": "Draws", "count": count})

    return {
        "totalMatches": total_matches,
        "completedTournaments": completed_tournaments,
        "avgPlayers": avg_players,
        "avgRating": avg_rating,
        "monthlyMatches": monthly_matches,
        "matchResults": result_dist
    }


@router.get("/{tournament_id}", response_model=TournamentResponse)
def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@router.put("/{tournament_id}", response_model=TournamentResponse)
def update_tournament(
    tournament_id: int,
    tournament_update: TournamentUpdate,
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
        player_ids = [reg.user_id for reg in tournament.registrations if reg.user_id and reg.status in (
            "approved", "active")]
        if player_ids:
            notification_service.notify_tournament_started(
                db, tournament=tournament, player_ids=player_ids)
            email_service.send_tournament_started_email(
                db, tournament_id=tournament.tournament_id)

    # Notifications on Completion
    if tournament_update.status == "completed" and tournament.status != "completed":
        from ....services import email_service
        email_service.send_tournament_results_email(
            db, tournament_id=tournament.tournament_id)

    for key, value in tournament_update.model_dump(exclude_unset=True).items():
        setattr(tournament, key, value)

    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: int,
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
def get_tournament_view_details(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    can_manage = is_tournament_staff_or_admin(tournament, current_user)

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
def get_standings(tournament_id: int, db: Session = Depends(get_db)):
    from ....logic.standings import calculate_standings

    tournament, standings_data = calculate_standings(db, tournament_id)
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    # Get the top 3 tie-break names for display
    tb_config = tournament.tie_break_config or [
        "Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Number of Wins", "Direct Encounter"]
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
