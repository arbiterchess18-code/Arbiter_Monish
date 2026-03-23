import base64
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import httpx

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


def _get_cookie_security() -> tuple[bool, str]:
    cookie_secure_env = os.getenv("COOKIE_SECURE")
    if cookie_secure_env is not None:
        secure = cookie_secure_env.strip().lower() == "true"
    else:
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        backend_public_url = os.getenv(
            "BACKEND_PUBLIC_URL", "http://localhost:8000")
        secure = frontend_url.startswith(
            "https://") and backend_public_url.startswith("https://")

    samesite = "none" if secure else "lax"
    return secure, samesite


def _get_user_roles(user: models.User) -> list[str]:
    return [ur.role.role_name.upper() for ur in user.user_roles]


def _get_primary_role(roles: list[str]) -> str:
    if "ORGANIZATION" in roles:
        return "organization"
    if "SUPER_ADMIN" in roles or "ADMIN" in roles or "ARBITER" in roles:
        return "arbiter"
    return "player"


def _build_user_data(user: models.User, roles: list[str]) -> dict:
    return {
        "user_id": user.user_id,
        "firstName": user.first_name or user.username,
        "lastName": user.last_name or "",
        "email": user.email,
        "role": _get_primary_role(roles),
        "profile_picture_url": user.profile_picture_url,
    }


def _create_auth_payload(user: models.User) -> dict:
    roles = _get_user_roles(user)

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "roles": roles},
        expires_delta=access_token_expires,
    )

    refresh_token_expires = timedelta(days=7)
    refresh_token = create_access_token(
        data={"sub": user.username, "roles": roles},
        expires_delta=refresh_token_expires,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "userData": _build_user_data(user, roles),
    }


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    secure, samesite = _get_cookie_security()

    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/refresh",
        max_age=7 * 24 * 60 * 60,
    )


def _build_google_oauth_state(mode: str, role: str) -> str:
    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:5173").rstrip("/")
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    return jwt.encode(
        {
            "mode": mode,
            "role": role,
            "frontend_url": frontend_url,
            "exp": int(expires_at.timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_google_oauth_state(state: str) -> dict:
    try:
        payload = jwt.decode(state, SECRET_KEY, algorithms=[ALGORITHM])
        mode = (payload.get("mode") or "login").lower()
        role = (payload.get("role") or "player").lower()
        frontend_url = (payload.get("frontend_url") or "").strip().rstrip("/")
        return {"mode": mode, "role": role, "frontend_url": frontend_url}
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid OAuth state") from exc


def _extract_origin_from_url(url: str) -> str:
    try:
        parsed = httpx.URL(url)
        if not parsed.scheme or not parsed.host:
            return ""
        port = f":{parsed.port}" if parsed.port else ""
        return f"{parsed.scheme}://{parsed.host}{port}".rstrip("/")
    except Exception:
        return ""


def _resolve_frontend_origin(request: Request) -> str:
    fallback = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")

    candidates: list[str] = []
    origin_header = (request.headers.get("origin") or "").strip()
    referer_header = (request.headers.get("referer") or "").strip()

    if origin_header:
        candidates.append(_extract_origin_from_url(origin_header))
    if referer_header:
        candidates.append(_extract_origin_from_url(referer_header))
    candidates.append(fallback)

    allowed_origins = {
        fallback,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    }

    raw_allowed = os.getenv("ALLOWED_ORIGINS", "")
    for origin in [o.strip().rstrip("/") for o in raw_allowed.split(",") if o.strip()]:
        normalized = _extract_origin_from_url(origin)
        if normalized:
            allowed_origins.add(normalized)

    for candidate in candidates:
        if candidate and candidate in allowed_origins:
            return candidate

    return fallback


def _normalize_role(requested_role: str) -> str:
    role = (requested_role or "player").upper()
    if role == "ARBITER":
        return "ARBITER"
    if role == "ORGANIZATION":
        return "ORGANIZATION"
    return "PLAYER"


def _ensure_role_assignment(db: Session, user: models.User, role_name: str) -> None:
    from sqlalchemy import func

    target_role = db.query(models.Role).filter(
        func.upper(models.Role.role_name) == role_name
    ).first()
    if not target_role:
        target_role = models.Role(
            role_name=role_name, description=f"{role_name} role")
        db.add(target_role)
        db.commit()
        db.refresh(target_role)

    already_assigned = db.query(models.UserRole).filter(
        models.UserRole.user_id == user.user_id,
        models.UserRole.role_id == target_role.role_id,
    ).first()
    if not already_assigned:
        db.add(models.UserRole(user_id=user.user_id, role_id=target_role.role_id))
        db.commit()


def _build_unique_username(db: Session, email: str) -> str:
    base = (email.split("@", 1)[0] or "google_user").strip()
    sanitized = "".join(ch for ch in base if ch.isalnum() or ch in {"_", "."})
    if not sanitized:
        sanitized = "google_user"
    sanitized = sanitized[:50]

    candidate = sanitized
    index = 1
    while db.query(models.User).filter(models.User.username == candidate).first():
        suffix = f"_{index}"
        candidate = f"{sanitized[:50 - len(suffix)]}{suffix}"
        index += 1
    return candidate


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

    auth_payload = _create_auth_payload(user)

    json_response = JSONResponse(content={
        "access_token": auth_payload["access_token"],
        "token_type": "bearer",
        "userData": auth_payload["userData"],
    })

    _set_auth_cookies(
        json_response,
        auth_payload["access_token"],
        auth_payload["refresh_token"],
    )

    return json_response


@router.get("/auth/google/login")
async def google_login(request: Request, mode: str = Query(default="login"), role: str = Query(default="player")):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    backend_public_url = os.getenv(
        "BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")

    if not google_client_id:
        raise HTTPException(
            status_code=500, detail="Google OAuth is not configured")

    callback_url = f"{backend_public_url}/auth/google/callback"
    frontend_origin = _resolve_frontend_origin(request)
    state = jwt.encode(
        {
            "mode": mode,
            "role": role,
            "frontend_url": frontend_origin,
            "exp": int((datetime.now(timezone.utc) + timedelta(minutes=10)).timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    params = {
        "client_id": google_client_id,
        "redirect_uri": callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{httpx.QueryParams(params)}"
    return RedirectResponse(url=auth_url, status_code=302)


@router.get("/auth/google/callback")
async def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    backend_public_url = os.getenv(
        "BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:5173").rstrip("/")

    if not google_client_id or not google_client_secret:
        raise HTTPException(
            status_code=500, detail="Google OAuth is not configured")

    oauth_state = _decode_google_oauth_state(state)
    requested_role = _normalize_role(oauth_state.get("role", "player"))
    state_frontend_url = (oauth_state.get("frontend_url")
                          or "").strip().rstrip("/")
    if state_frontend_url:
        frontend_url = state_frontend_url

    callback_url = f"{backend_public_url}/auth/google/callback"

    async with httpx.AsyncClient(timeout=20.0) as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": google_client_id,
                "client_secret": google_client_secret,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            },
        )

        if token_response.status_code >= 400:
            raise HTTPException(
                status_code=400, detail="Google token exchange failed")

        token_data = token_response.json()
        google_access_token = token_data.get("access_token")
        if not google_access_token:
            raise HTTPException(
                status_code=400, detail="Google access token is missing")

        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {google_access_token}"},
        )

        if userinfo_response.status_code >= 400:
            raise HTTPException(
                status_code=400, detail="Failed to fetch Google profile")

        userinfo = userinfo_response.json()

    email = (userinfo.get("email") or "").strip().lower()
    email_verified = bool(userinfo.get("email_verified"))
    if not email or not email_verified:
        raise HTTPException(
            status_code=400, detail="Google account email is not verified")

    existing_user = db.query(models.User).filter(
        models.User.email == email).first()
    user_created = False

    if not existing_user:
        existing_user = models.User(
            username=_build_unique_username(db, email),
            email=email,
            hashed_password=get_password_hash(secrets.token_urlsafe(32)),
            first_name=(userinfo.get("given_name") or "").strip() or None,
            last_name=(userinfo.get("family_name") or "").strip() or None,
            profile_picture_url=(userinfo.get("picture") or None),
            is_active=True,
        )
        db.add(existing_user)
        db.commit()
        db.refresh(existing_user)
        user_created = True
    else:
        updated = False
        if userinfo.get("picture") and existing_user.profile_picture_url != userinfo.get("picture"):
            existing_user.profile_picture_url = userinfo.get("picture")
            updated = True
        if not existing_user.first_name and userinfo.get("given_name"):
            existing_user.first_name = userinfo.get("given_name")
            updated = True
        if not existing_user.last_name and userinfo.get("family_name"):
            existing_user.last_name = userinfo.get("family_name")
            updated = True
        if updated:
            db.add(existing_user)
            db.commit()

    if user_created or oauth_state.get("mode") == "signup":
        _ensure_role_assignment(db, existing_user, requested_role)

    auth_payload = _create_auth_payload(existing_user)
    encoded_user_data = quote(
        base64.urlsafe_b64encode(
            json.dumps(auth_payload["userData"],
                       separators=(",", ":")).encode("utf-8")
        ).decode("utf-8")
    )
    redirect_url = f"{frontend_url}/oauth-success?user_data={encoded_user_data}"

    response = RedirectResponse(url=redirect_url, status_code=302)
    _set_auth_cookies(
        response, auth_payload["access_token"], auth_payload["refresh_token"])
    return response


@router.post("/refresh")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    secure, samesite = _get_cookie_security()

    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=401, detail="Invalid refresh token")

        user = db.query(models.User).filter(
            models.User.username == username).first()
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
            secure=secure,
            samesite=samesite,
            max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60
        )

        return {"access_token": access_token, "token_type": "bearer"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@router.post("/logout")
async def logout(response: Response):
    secure, samesite = _get_cookie_security()
    response.delete_cookie(
        key="access_token", samesite=samesite, secure=secure)
    response.delete_cookie(key="refresh_token",
                           path="/refresh", samesite=samesite, secure=secure)
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
                raise HTTPException(
                    status_code=400, detail="FIDE ID already claimed")

            fide_data = await fetch_fide_player_info(user_in.fide_id)
            new_user.fide_id = str(fide_data.get("fide_id"))
            new_user.fide_rating = fide_data.get("classical_rating")
            new_user.title = fide_data.get("fide_title")
            new_user.country = fide_data.get("federation")
        except HTTPException as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid FIDE ID: {e.detail}")

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
