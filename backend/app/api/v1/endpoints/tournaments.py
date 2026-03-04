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
async def get_standings(
    tournament_id: int,
    db: Session = Depends(get_db)
):
    import json
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    registrations = db.query(models.TournamentRegistration).options(
        joinedload(models.TournamentRegistration.user)
    ).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    # Initialize points for all approved players
    player_points = {reg.user_id: 0.0 for reg in registrations}
    
    player_data = {reg.user_id: {
        "opponent_scores": [],
        "sonneborn_berger": 0.0,
        "seed": reg.seed or 0
    } for reg in registrations}

    # Fetch all completed matches for the tournament
    matches = db.query(models.Match).filter(
        models.Match.tournament_id == tournament_id,
        models.Match.result.isnot(None)
    ).all()

    # Calculate points and tie-breaker components from matches
    for match in matches:
        w_id = match.white_player_id
        b_id = match.black_player_id
        res = match.result

        if not w_id:
            continue

        # Map results to points
        w_pts_inc = 0.0
        b_pts_inc = 0.0
        if res == "1-0":
            w_pts_inc = 1.0
        elif res == "0-1":
            b_pts_inc = 1.0
        elif res == "1/2-1/2":
            w_pts_inc = 0.5
            b_pts_inc = 0.5
        elif res == "Bye": # Explicit Bye result
            w_pts_inc = 1.0

        # Update points
        if w_id in player_points:
            player_points[w_id] += w_pts_inc
        if b_id and b_id in player_points:
            player_points[b_id] += b_pts_inc

        # Tie-breaker logic (only if both players are present)
        if w_id in player_data and b_id and b_id in player_data:
            # We will use the final points for Buchholz, so we just collect opponents for now
            # Note: Standard Buchholz uses the opponent's FINAL score.
            # We'll calculate Buchholz in a second pass after all points are summed.
            player_data[w_id]["opponent_ids"] = player_data[w_id].get("opponent_ids", []) + [b_id]
            player_data[b_id]["opponent_ids"] = player_data[b_id].get("opponent_ids", []) + [w_id]

            # SB is based on opponent's current points relative to the result
            # Actually, standard SB also uses FINAL points.
            # But we can only calculate it accurately after we have all player_points.

    # Second pass: Calculate Tie-breakers using the summed player_points
    for match in matches:
        w_id = match.white_player_id
        b_id = match.black_player_id
        res = match.result
        
        if w_id in player_data and b_id and b_id in player_data:
            w_pts = player_points[w_id]
            b_pts = player_points[b_id]
            
            # Buchholz components
            player_data[w_id]["opponent_scores"].append(player_points[b_id])
            player_data[b_id]["opponent_scores"].append(player_points[w_id])
            
            # SB calculation
            if res == "1-0":
                player_data[w_id]["sonneborn_berger"] += player_points[b_id]
            elif res == "0-1":
                player_data[b_id]["sonneborn_berger"] += player_points[w_id]
            elif res == "1/2-1/2":
                player_data[w_id]["sonneborn_berger"] += (player_points[b_id] / 2.0)
                player_data[b_id]["sonneborn_berger"] += (player_points[w_id] / 2.0)

    standings = []
    for registration in registrations:
        player = registration.user
        uid = registration.user_id
        data = player_data[uid]
        opp_scores = data["opponent_scores"]
        
        # Buchholz Total
        bh_total = sum(opp_scores)
        # Buchholz Cut 1 (Standard)
        bh_cut1 = bh_total - min(opp_scores) if opp_scores else 0.0

        # Try to extract extra info from registration payload
        extra_info = {}
        try:
            if registration.color_history and registration.color_history.startswith("{"):
                extra_info = json.loads(registration.color_history)
        except:
            pass

        title = extra_info.get("title", "")
        base_name = f"{player.first_name or ''} {player.last_name or ''}".strip() or player.username
        full_name = f"{title} {base_name}".strip()

        # Determine federation: extra_info -> player.country -> default "IND"
        fed = extra_info.get("federation")
        if not fed:
            country = player.country or "India"
            fed = "IND" if country.lower() == "india" else country[:3].upper()

        standings.append({
            "user_id": uid,
            "starting_no": data["seed"],
            "player_name": full_name,
            "federation": fed,
            "rating": player.fide_rating or player.national_rating or 0,
            "points": player_points[uid],
            "buchholz": bh_cut1,
            "buchholz_total": bh_total,
            "sonneborn_berger": data["sonneborn_berger"],
        })

    standings.sort(
        key=lambda item: (
            item["points"],
            item["buchholz"],
            item["buchholz_total"],
            item["sonneborn_berger"],
        ),
        reverse=True,
    )

    for idx, item in enumerate(standings, start=1):
        item["rank"] = idx

    return {
        "tie_breaker_rules": ["Buchholz Cut 1", "Buchholz Total", "Sonneborn-Berger"],
        "standings": standings,
    }
