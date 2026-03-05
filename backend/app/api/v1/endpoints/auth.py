from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional

from .... import models
from ....database import get_db
from ....core.security import verify_password, get_password_hash, create_access_token
from ....core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from ....schemas.token import Token
from ....schemas.user import UserCreate
from ....core.limiter import limiter

router = APIRouter()


@router.post("/token", response_model=Token)
@limiter.limit("5/minute")
async def login(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    roles = [ur.role.role_name.upper() for ur in user.user_roles]
    primary_role = "player"
    if "ORGANIZATION" in roles:
        primary_role = "organization"
    elif "SUPER_ADMIN" in roles or "ADMIN" in roles or "ARBITER" in roles:
        primary_role = "arbiter"

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "roles": roles},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "userData": {
            "user_id": user.user_id,          # needed for Supabase Realtime filter
            "firstName": user.first_name or user.username,
            "lastName": user.last_name or "",
            "email": user.email,
            "role": primary_role
        }
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    user_in: UserCreate,
    role: Optional[str] = Query(default=None),
    db: Session = Depends(get_db)
):
    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(
            status_code=400, detail="Username already registered")

    if db.query(models.User).filter(models.User.email == user_in.email).first():
        raise HTTPException(
            status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_in.password)
    new_user = models.User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=hashed_password,
        first_name=user_in.first_name,
        last_name=user_in.last_name,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    requested_role = (role or user_in.role or "player").upper()
    role_name = "PLAYER"
    if requested_role == "ARBITER":
        role_name = "ARBITER"
    elif requested_role == "ORGANIZATION":
        role_name = "ORGANIZATION"

    from sqlalchemy import func
    target_role = db.query(models.Role).filter(
        func.upper(models.Role.role_name) == role_name).first()
    if not target_role:
        target_role = models.Role(
            role_name=role_name, description=f"{role_name} role")
        db.add(target_role)
        db.commit()
        db.refresh(target_role)

    db.add(models.UserRole(user_id=new_user.user_id,
           role_id=target_role.role_id))
    db.commit()

    return {"message": "User created successfully"}
