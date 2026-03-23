from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import Optional

from .... import models
from ....database import get_db
from ....core.security import verify_password, get_password_hash, create_access_token
from ....core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM
import jwt
from ....schemas.token import Token
from ....schemas.user import UserCreate
from ....services.fide import fetch_fide_player_info
from ....core.limiter import limiter

router = APIRouter()


@router.post("/token")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
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
    
    refresh_token_expires = timedelta(days=7)
    refresh_token = create_access_token(
        data={"sub": user.username, "roles": roles},
        expires_delta=refresh_token_expires
    )

    json_response = JSONResponse(content={
        "access_token": access_token, # keep for backwards compatibility briefly if needed
        "token_type": "bearer",
        "userData": {
            "user_id": user.user_id,
            "firstName": user.first_name or user.username,
            "lastName": user.last_name or "",
            "email": user.email,
            "role": primary_role,
            "profile_picture_url": user.profile_picture_url
        }
    })
    
    json_response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=True,
        samesite="none",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    
    json_response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/refresh",
        max_age=7 * 24 * 60 * 60
    )

    return json_response

@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
            
        roles = [ur.role.role_name.upper() for ur in user.user_roles]
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "roles": roles},
            expires_delta=access_token_expires
        )
        
        response.set_cookie(
            key="access_token",
            value=f"Bearer {access_token}",
            httponly=True,
            secure=True,
            samesite="none",
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", samesite="none", secure=True)
    response.delete_cookie(key="refresh_token", path="/refresh", samesite="none", secure=True)
    return {"message": "Logged out successfully"}


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

    if user_in.fide_id:
        try:
            if db.query(models.User).filter(models.User.fide_id == user_in.fide_id).first():
                raise HTTPException(status_code=400, detail="FIDE ID already claimed")
            
            fide_data = await fetch_fide_player_info(user_in.fide_id)
            new_user.fide_id = str(fide_data.get("fide_id"))
            new_user.fide_rating = fide_data.get("classical_rating")
            new_user.rapid_rating = fide_data.get("rapid_rating")
            new_user.blitz_rating = fide_data.get("blitz_rating")
            new_user.title = fide_data.get("fide_title")
            new_user.country = fide_data.get("federation")
        except HTTPException as e:
            raise HTTPException(status_code=400, detail=f"Invalid FIDE ID: {e.detail}")

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
