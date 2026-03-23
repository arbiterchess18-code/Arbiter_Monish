from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from .... import models
from ....database import get_db
from ....core.security import get_current_user
from ....services.fide import get_fide_history_cached, fetch_fide_player_info

router = APIRouter()


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    fide_id: Optional[str] = None
    fide_rating: Optional[int] = None
    rapid_rating: Optional[int] = None
    blitz_rating: Optional[int] = None
    national_rating: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None
    profile_picture_url: Optional[str] = None


@router.get("/me")
async def get_my_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current logged-in user's profile"""
    full_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(
    ) or current_user.username
    roles = [ur.role.role_name.upper() for ur in current_user.user_roles]
    primary_role = "arbiter" if any(
        r in roles for r in ["SUPER_ADMIN", "ADMIN", "ARBITER"]) else "player"

    history = []
    if current_user.fide_id:
        # Auto-refresh ratings from FIDE API if any are still 0 or missing (legacy/pre-migration accounts)
        needs_refresh = (
            not current_user.fide_rating or current_user.fide_rating == 0 or
            not current_user.rapid_rating or current_user.rapid_rating == 0 or
            not current_user.blitz_rating or current_user.blitz_rating == 0 or
            current_user.national_rank is None
        )
        if needs_refresh:
            try:
                fide_data = await fetch_fide_player_info(current_user.fide_id)
                if fide_data:
                    if not current_user.fide_rating or current_user.fide_rating == 0:
                        current_user.fide_rating = fide_data.get("classical_rating", 0)
                    if not current_user.rapid_rating or current_user.rapid_rating == 0:
                        current_user.rapid_rating = fide_data.get("rapid_rating", 0)
                    if not current_user.blitz_rating or current_user.blitz_rating == 0:
                        current_user.blitz_rating = fide_data.get("blitz_rating", 0)
                    if not current_user.title:
                        current_user.title = fide_data.get("fide_title")
                    if not current_user.country or current_user.country == "India":
                        current_user.country = fide_data.get("federation") or current_user.country
                    if fide_data.get("national_rank_all"):
                        current_user.national_rank = fide_data.get("national_rank_all")
                    # Also try to populate name if missing
                    if not current_user.first_name and fide_data.get("name"):
                        name_parts = fide_data.get("name").strip().split(" ", 1)
                        current_user.first_name = name_parts[0]
                        current_user.last_name = name_parts[1] if len(name_parts) > 1 else ""

                    db.commit()
                    db.refresh(current_user)
            except Exception:
                pass  # Don't fail the request if FIDE API is down

        # Use the cached history — only calls FIDE API if cache is missing or >30 days old
        history = await get_fide_history_cached(current_user, db)

    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name or "",
        "last_name": current_user.last_name or "",
        "name": full_name,
        "fide_id": current_user.fide_id or "",
        "fide_rating": current_user.fide_rating or 0,
        "rapid_rating": current_user.rapid_rating or 0,
        "blitz_rating": current_user.blitz_rating or 0,
        "national_rating": current_user.national_rating or 0,
        "national_rank": current_user.national_rank or None,
        "country": current_user.country or "India",
        "title": current_user.title or "",
        "rating_history": history,
        "role": primary_role,
        "is_active": current_user.is_active,
        "profile_picture_url": current_user.profile_picture_url,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }


@router.get("/me/player-stats")
async def get_my_player_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dynamic player dashboard stats for the current user."""
    total_matches = db.query(func.count(models.Match.match_id)).filter(
        or_(
            models.Match.white_player_id == current_user.user_id,
            models.Match.black_player_id == current_user.user_id,
        ),
        models.Match.result.isnot(None),
    ).scalar() or 0

    wins = db.query(func.count(models.Match.match_id)).filter(
        or_(
            (models.Match.white_player_id == current_user.user_id) & (
                models.Match.result == "1-0"),
            (models.Match.black_player_id == current_user.user_id) & (
                models.Match.result == "0-1"),
        )
    ).scalar() or 0

    draws = db.query(func.count(models.Match.match_id)).filter(
        or_(
            models.Match.white_player_id == current_user.user_id,
            models.Match.black_player_id == current_user.user_id,
        ),
        models.Match.result == "1/2-1/2",
    ).scalar() or 0

    tournaments = db.query(func.count(func.distinct(models.TournamentRegistration.tournament_id))).filter(
        models.TournamentRegistration.user_id == current_user.user_id,
        models.TournamentRegistration.status.in_(
            ["pending", "approved", "active"]),
    ).scalar() or 0

    losses = max(total_matches - wins - draws, 0)
    win_rate = round((wins / total_matches) * 100) if total_matches else 0
    current_rating = current_user.fide_rating or current_user.national_rating or 0

    return {
        "currentRating": int(current_rating),
        "totalMatches": int(total_matches),
        "wins": int(wins),
        "draws": int(draws),
        "losses": int(losses),
        "winRate": int(win_rate),
        "totalTournaments": int(tournaments),
    }


@router.patch("/me")
async def update_my_profile(
    profile_update: UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update the current logged-in user's profile"""
    if profile_update.first_name is not None:
        current_user.first_name = profile_update.first_name
    if profile_update.last_name is not None:
        current_user.last_name = profile_update.last_name
    if profile_update.fide_id is not None:
        # Check fide_id uniqueness if it changed
        new_fide_id = profile_update.fide_id.strip() if profile_update.fide_id else None
        if new_fide_id and new_fide_id != current_user.fide_id:
            existing = db.query(models.User).filter(
                models.User.fide_id == new_fide_id,
                models.User.user_id != current_user.user_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, detail="FIDE ID already registered to another user")

            # Auto-sync ratings and name from FIDE API — same as signup
            try:
                fide_data = await fetch_fide_player_info(new_fide_id)
                if fide_data:
                    current_user.fide_rating = fide_data.get("classical_rating") or current_user.fide_rating
                    current_user.rapid_rating = fide_data.get("rapid_rating") or current_user.rapid_rating
                    current_user.blitz_rating = fide_data.get("blitz_rating") or current_user.blitz_rating
                    if fide_data.get("fide_title"):
                        current_user.title = fide_data.get("fide_title")
                    if fide_data.get("federation"):
                        current_user.country = fide_data.get("federation")
                    if fide_data.get("national_rank_all"):
                        current_user.national_rank = fide_data.get("national_rank_all")
                    # Parse full name into first/last name
                    fide_name = fide_data.get("name", "").strip()
                    if fide_name:
                        name_parts = fide_name.split(" ", 1)
                        current_user.first_name = name_parts[0]
                        current_user.last_name = name_parts[1] if len(name_parts) > 1 else ""
            except Exception:
                pass  # Don't fail the save if FIDE API is down

        current_user.fide_id = new_fide_id
        # Invalidate history cache when FIDE ID changes
        current_user.fide_history_cache = None
        current_user.fide_history_synced_at = None

    if profile_update.fide_rating is not None:
        current_user.fide_rating = profile_update.fide_rating
    if profile_update.rapid_rating is not None:
        current_user.rapid_rating = profile_update.rapid_rating
    if profile_update.blitz_rating is not None:
        current_user.blitz_rating = profile_update.blitz_rating
    if profile_update.national_rating is not None:
        current_user.national_rating = profile_update.national_rating
    if profile_update.country is not None:
        current_user.country = profile_update.country
    if profile_update.profile_picture_url is not None:
        current_user.profile_picture_url = profile_update.profile_picture_url

    db.commit()
    db.refresh(current_user)

    full_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(
    ) or current_user.username
    return {
        "message": "Profile updated successfully",
        "user_id": current_user.user_id,
        "name": full_name,
        "first_name": current_user.first_name or "",
        "last_name": current_user.last_name or "",
        "fide_id": current_user.fide_id or "",
        "fide_rating": current_user.fide_rating or 0,
        "rapid_rating": current_user.rapid_rating or 0,
        "blitz_rating": current_user.blitz_rating or 0,
        "national_rating": current_user.national_rating or 0,
        "title": current_user.title or "",
        "country": current_user.country or "India",
        "profile_picture_url": current_user.profile_picture_url,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }



@router.get("/me/achievements")
async def get_my_achievements(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Aggregate match stats and return unlocked achievement titles"""
    from sqlalchemy import or_, and_

    # Fetch all matches for this user
    matches = db.query(models.Match, models.Tournament).join(
        models.Tournament, models.Match.tournament_id == models.Tournament.tournament_id
    ).filter(
        or_(
            models.Match.white_player_id == current_user.user_id,
            models.Match.black_player_id == current_user.user_id
        )
    ).all()

    stats = {
        "blitz_wins": 0,
        "rapid_wins": 0,
        "total_wins": 0,
        "total_draws": 0,
        "total_losses": 0,
        "total_matches": len(matches),
        "classical_games": 0,
        "tournaments_played": len(set(tournament.tournament_id for match, tournament in matches)),
        "white_wins": 0,
        "white_draws": 0,
        "white_losses": 0,
        "black_wins": 0,
        "black_draws": 0,
        "black_losses": 0
    }

    for match, tournament in matches:
        is_white = match.white_player_id == current_user.user_id

        # Check result
        if match.result == "1-0":
            if is_white:
                stats["total_wins"] += 1
                stats["white_wins"] += 1
                if tournament.event_type and "blitz" in tournament.event_type.lower():
                    stats["blitz_wins"] += 1
                elif tournament.event_type and "rapid" in tournament.event_type.lower():
                    stats["rapid_wins"] += 1
            else:
                stats["total_losses"] += 1
                stats["black_losses"] += 1
        elif match.result == "0-1":
            if not is_white:
                stats["total_wins"] += 1
                stats["black_wins"] += 1
                if tournament.event_type and "blitz" in tournament.event_type.lower():
                    stats["blitz_wins"] += 1
                elif tournament.event_type and "rapid" in tournament.event_type.lower():
                    stats["rapid_wins"] += 1
            else:
                stats["total_losses"] += 1
                stats["white_losses"] += 1
        elif match.result == "1/2-1/2":
            stats["total_draws"] += 1
            if is_white:
                stats["white_draws"] += 1
            else:
                stats["black_draws"] += 1

        # Check total games per type
        if tournament.event_type and "standard" in tournament.event_type.lower():
            stats["classical_games"] += 1

    stats["win_rate"] = int((stats["total_wins"] / stats["total_matches"])
                            * 100) if stats["total_matches"] > 0 else 0
    stats["current_rating"] = current_user.fide_rating or 0

    unlocked_achievement_ids = []

    if stats["blitz_wins"] >= 10:
        unlocked_achievement_ids.append("Blitz King")
    if stats["rapid_wins"] >= 10:  # Simplified from "win tournament" to 10 wins
        unlocked_achievement_ids.append("Rapid Master")
    if stats["total_wins"] >= 5:   # Simplified for Streak Master
        unlocked_achievement_ids.append("Streak Master")
    if stats["total_wins"] >= 20:  # Simplified for Endgame Specialist
        unlocked_achievement_ids.append("Endgame Specialist")
    if stats["classical_games"] >= 50:
        unlocked_achievement_ids.append("Classical Specialist")
    if stats["total_wins"] >= 30:  # Simplified for Tournament Champion
        unlocked_achievement_ids.append("Tournament Champion")
    if stats["total_draws"] >= 10:
        unlocked_achievement_ids.append("Iron Draw")
    if current_user.fide_rating and current_user.fide_rating > 1500:
        unlocked_achievement_ids.append("Rating Climber")

    return {
        "unlocked": unlocked_achievement_ids,
        "stats": stats
    }


@router.get("/me/registrations")
async def get_my_registrations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of tournament IDs the current user has registered for"""
    registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.user_id == current_user.user_id,
        models.TournamentRegistration.status.in_(
            ["pending", "approved", "active"])
    ).all()
    return [r.tournament_id for r in registrations]


@router.get("/me/tournaments")
async def get_my_tournaments(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get full tournament details for tournaments the current user has registered for"""
    registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.user_id == current_user.user_id,
        models.TournamentRegistration.status.in_(
            ["pending", "approved", "active"])
    ).all()

    result = []
    for reg in registrations:
        t = db.query(models.Tournament).filter(
            models.Tournament.tournament_id == reg.tournament_id
        ).first()
        if not t:
            continue
        registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
        result.append({
            "tournament_id": t.tournament_id,
            "tournament_name": t.tournament_name,
            "id": t.tournament_id,
            "name": t.tournament_name,
            "status": t.status,
            "pairing_system": t.pairing_system,
            "pairingSystem": t.pairing_system,
            "is_rated": t.is_rated,
            "isRated": t.is_rated,
            "time_control": t.time_control,
            "timeControl": t.time_control,
            "start_date": str(t.start_date) if t.start_date else None,
            "startDate": str(t.start_date) if t.start_date else None,
            "max_players": t.max_players,
            "maxPlayers": t.max_players,
            "venue_name": t.venue_name,
            "city": t.city,
            "rounds": t.rounds,
            "current_round": t.current_round,
            "currentRound": t.current_round,
            "registered_count": registered_count,
            "registration_status": reg.status,
            "entry_fee": t.entry_fee,
        })
    return result


@router.get("/arbiters")
async def get_all_arbiters(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get only users with ARBITER role"""
    arbiters = db.query(models.User).join(
        models.UserRole,
        models.User.user_id == models.UserRole.user_id
    ).join(
        models.Role,
        models.UserRole.role_id == models.Role.role_id
    ).filter(
        models.Role.role_name.ilike("ARBITER")
    ).all()

    result = []
    for member in arbiters:
        first_name = member.first_name or ""
        last_name = member.last_name or ""

        if not first_name and not last_name:
            first_name = member.username or "Member"

        result.append({
            "user_id": member.user_id,
            "username": member.username,
            "email": member.email,
            "first_name": first_name,
            "last_name": last_name,
            "title": member.title or "Arbiter",
            "location": member.location or member.country or "",
            "rating": member.fide_rating or 0,
            "tournaments_conducted": member.tournaments_conducted or 0,
            "is_verified": member.is_verified or False,
            "bio": member.bio or "",
            "profile_picture_url": member.profile_picture_url,
        })

    return result


@router.get("/{user_id}")
async def get_user_details(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get details of a specific user (including arbiters)"""
    user = db.query(models.User).filter(
        models.User.user_id == user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get user's roles
    roles = [ur.role.role_name.upper() for ur in user.user_roles]

    # Build response with all available data
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "title": user.title or ("Arbiter" if "ARBITER" in roles else "Member"),
        "location": user.location or user.country or "",
        "phone": user.phone or "",
        "rating": user.fide_rating or 0,
        "tournaments_conducted": user.tournaments_conducted or 0,
        "experience_years": user.experience_years or "",
        "is_verified": user.is_verified or False,
        "bio": user.bio or "",
        "specializations": user.specializations or [],
        "availability": user.availability or "Year-round",
        "roles": roles,
        "profile_picture_url": user.profile_picture_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
