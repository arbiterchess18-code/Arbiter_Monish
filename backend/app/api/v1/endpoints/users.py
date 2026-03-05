from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel

from .... import models
from ....database import get_db
from ....core.security import get_current_user

router = APIRouter()


class UserProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    fide_id: Optional[str] = None
    fide_rating: Optional[int] = None
    national_rating: Optional[int] = None
    country: Optional[str] = None
    bio: Optional[str] = None


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

    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "first_name": current_user.first_name or "",
        "last_name": current_user.last_name or "",
        "name": full_name,
        "fide_id": current_user.fide_id or "",
        "fide_rating": current_user.fide_rating or 0,
        "national_rating": current_user.national_rating or 0,
        "country": current_user.country or "India",
        "role": primary_role,
        "is_active": current_user.is_active,
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
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
        if profile_update.fide_id and profile_update.fide_id != current_user.fide_id:
            existing = db.query(models.User).filter(
                models.User.fide_id == profile_update.fide_id,
                models.User.user_id != current_user.user_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=400, detail="FIDE ID already registered to another user")
        current_user.fide_id = profile_update.fide_id or None
    if profile_update.fide_rating is not None:
        current_user.fide_rating = profile_update.fide_rating
    if profile_update.national_rating is not None:
        current_user.national_rating = profile_update.national_rating
    if profile_update.country is not None:
        current_user.country = profile_update.country

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
        "national_rating": current_user.national_rating or 0,
        "country": current_user.country or "India",
        "updated_at": current_user.updated_at.isoformat() if current_user.updated_at else None,
    }


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
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
