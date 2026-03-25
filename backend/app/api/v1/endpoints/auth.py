import base64
import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional
import httpx
from pydantic import BaseModel, EmailStr

from .... import models
from ....database import get_db
from ....core.security import verify_password, get_password_hash, create_access_token
from ....core.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM
import jwt
from ....schemas.token import Token
from ....schemas.user import UserCreate
from ....services.fide import fetch_fide_player_info
from ....services import email_service
from ....core.limiter import limiter

router = APIRouter()


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class VerifyOtpRequest(BaseModel):
    otp_session_token: str
    otp: str


class SignupSendOtpRequest(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class SignupVerifyOtpRequest(BaseModel):
    otp_session_token: str
    otp: str


RESET_PASSWORD_TOKEN_EXPIRE_MINUTES = 30
OTP_TOKEN_EXPIRE_MINUTES = 10
SIGNUP_VERIFICATION_TOKEN_EXPIRE_MINUTES = 30


def _create_reset_password_token(email: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=RESET_PASSWORD_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {
            "sub": email,
            "type": "reset_password",
            "exp": int(expires_at.timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _create_otp_session_token(email: str, otp: str) -> str:
    otp_hash = hashlib.sha256(
        f"{otp}:{SECRET_KEY}".encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + \
        timedelta(minutes=OTP_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {
            "sub": email,
            "type": "reset_password_otp",
            "otp_hash": otp_hash,
            "exp": int(expires_at.timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_otp_session_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=400, detail="OTP expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid OTP session") from exc

    if payload.get("type") != "reset_password_otp":
        raise HTTPException(status_code=400, detail="Invalid OTP session")
    return payload


def _create_signup_otp_session_token(email: str, otp: str) -> str:
    otp_hash = hashlib.sha256(
        f"{otp}:{SECRET_KEY}".encode("utf-8")).hexdigest()
    expires_at = datetime.now(timezone.utc) + \
        timedelta(minutes=OTP_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(
        {
            "sub": email,
            "type": "signup_otp",
            "otp_hash": otp_hash,
            "exp": int(expires_at.timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_signup_otp_session_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=400, detail="Signup OTP expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid signup OTP session") from exc

    if payload.get("type") != "signup_otp":
        raise HTTPException(
            status_code=400, detail="Invalid signup OTP session")
    return payload


def _create_signup_verification_token(email: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=SIGNUP_VERIFICATION_TOKEN_EXPIRE_MINUTES
    )
    return jwt.encode(
        {
            "sub": email,
            "type": "signup_verified_email",
            "exp": int(expires_at.timestamp()),
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def _decode_signup_verification_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=400, detail="Signup verification expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid signup verification") from exc

    if payload.get("type") != "signup_verified_email":
        raise HTTPException(
            status_code=400, detail="Invalid signup verification")

    email = (payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=400, detail="Invalid signup verification")
    return email


def _decode_reset_password_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=400, detail="Reset token expired") from exc
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=400, detail="Invalid reset token") from exc

    if payload.get("type") != "reset_password":
        raise HTTPException(status_code=400, detail="Invalid reset token")

    email = (payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    return email


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


def _get_google_callback_url() -> str:
    explicit_callback_url = (
        os.getenv("GOOGLE_REDIRECT_URI") or "").strip().rstrip("/")
    if explicit_callback_url:
        return explicit_callback_url

    backend_public_url = os.getenv(
        "BACKEND_PUBLIC_URL", "http://localhost:8000").rstrip("/")
    return f"{backend_public_url}/auth/google/callback"


def _normalize_role(requested_role: str) -> str:
    role = (requested_role or "player").upper()
    if role == "ARBITER":
        return "ARBITER"
    if role == "ORGANIZATION":
        return "ORGANIZATION"
    return "PLAYER"


def _ensure_signup_role_allowed(role_name: str) -> None:
    if role_name in {"ARBITER", "ORGANIZATION"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized for this signup.",
        )


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
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        client_ip = request.client.host if request.client else "Unknown"
        user_agent = request.headers.get("user-agent", "Unknown")
        email_service.send_login_alert_email(
            email=user.email,
            name=(user.first_name or user.username or "Player"),
            ip_address=client_ip,
            user_agent=user_agent,
        )
    except Exception as exc:
        print(f"Login alert notification failed for {user.username}: {exc}")

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
def google_login(request: Request, mode: str = Query(default="login"), role: str = Query(default="player")):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")

    if not google_client_id:
        raise HTTPException(
            status_code=500, detail="Google OAuth is not configured")

    normalized_mode = (mode or "login").lower()
    normalized_role = _normalize_role(role)

    if normalized_mode == "signup":
        _ensure_signup_role_allowed(normalized_role)

    callback_url = _get_google_callback_url()
    frontend_origin = _resolve_frontend_origin(request)
    state = jwt.encode(
        {
            "mode": normalized_mode,
            "role": normalized_role,
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


@router.get("/api/v1/auth/google/login")
async def google_login_alias(request: Request, mode: str = Query(default="login"), role: str = Query(default="player")):
    return await google_login(request=request, mode=mode, role=role)


@router.get("/auth/google/callback")
async def google_callback(code: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    google_client_id = os.getenv("GOOGLE_CLIENT_ID")
    google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    frontend_url = os.getenv(
        "FRONTEND_URL", "http://localhost:5173").rstrip("/")

    if not google_client_id or not google_client_secret:
        raise HTTPException(
            status_code=500, detail="Google OAuth is not configured")

    if not code or not state:
        return {
            "message": "Google OAuth callback endpoint is reachable.",
            "expected_query_params": ["code", "state"],
        }

    oauth_state = _decode_google_oauth_state(state)
    oauth_mode = (oauth_state.get("mode") or "login").lower()
    requested_role = _normalize_role(oauth_state.get("role", "player"))
    if oauth_mode == "signup":
        _ensure_signup_role_allowed(requested_role)

    state_frontend_url = (oauth_state.get("frontend_url")
                          or "").strip().rstrip("/")
    if state_frontend_url:
        frontend_url = state_frontend_url

    callback_url = _get_google_callback_url()

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

    if user_created or oauth_mode == "signup":
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


@router.get("/api/v1/auth/google/callback")
async def google_callback_alias(code: Optional[str] = None, state: Optional[str] = None, db: Session = Depends(get_db)):
    return await google_callback(code=code, state=state, db=db)


@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
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
def logout(response: Response):
    secure, samesite = _get_cookie_security()
    response.delete_cookie(
        key="access_token", samesite=samesite, secure=secure)
    response.delete_cookie(key="refresh_token",
                           path="/refresh", samesite=samesite, secure=secure)
    return {"message": "Logged out successfully"}


@router.post("/auth/forgot-password")
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(
        func.lower(models.User.email) == email
    ).first()

    # Prevent user enumeration by returning the same response whether user exists or not.
    success_message = {
        "message": "If an account with that email exists, a password reset link has been sent."
    }

    if not user:
        return success_message

    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_session_token = _create_otp_session_token(email, otp)

    email_service.send_password_reset_otp_email(
        email=email,
        otp=otp,
        name=user.first_name or user.username or "Player",
    )

    return {
        "message": "OTP has been sent to your email.",
        "otp_session_token": otp_session_token,
    }


@router.post("/auth/verify-reset-otp")
@limiter.limit("10/minute")
async def verify_reset_otp(
    request: Request,
    payload: VerifyOtpRequest,
):
    otp = (payload.otp or "").strip()
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(
            status_code=400, detail="OTP must be a 6-digit code")

    token_payload = _decode_otp_session_token(payload.otp_session_token)
    expected_hash = token_payload.get("otp_hash")
    submitted_hash = hashlib.sha256(
        f"{otp}:{SECRET_KEY}".encode("utf-8")).hexdigest()

    if submitted_hash != expected_hash:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    email = (token_payload.get("sub") or "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Invalid OTP session")

    reset_token = _create_reset_password_token(email)
    return {
        "message": "OTP verified successfully",
        "reset_token": reset_token,
    }


@router.post("/auth/signup/send-otp")
@limiter.limit("5/minute")
async def signup_send_otp(
    request: Request,
    payload: SignupSendOtpRequest,
    db: Session = Depends(get_db),
):
    email = payload.email.strip().lower()
    existing_user = db.query(models.User).filter(
        func.lower(models.User.email) == email
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    otp = f"{secrets.randbelow(1_000_000):06d}"
    otp_session_token = _create_signup_otp_session_token(email, otp)
    email_service.send_signup_otp_email(
        email=email,
        otp=otp,
        name=(payload.name or "Player").strip() or "Player",
    )

    return {
        "message": "Signup OTP sent to your email.",
        "otp_session_token": otp_session_token,
    }


@router.post("/auth/signup/verify-otp")
@limiter.limit("10/minute")
async def signup_verify_otp(
    request: Request,
    payload: SignupVerifyOtpRequest,
):
    otp = (payload.otp or "").strip()
    if len(otp) != 6 or not otp.isdigit():
        raise HTTPException(
            status_code=400, detail="OTP must be a 6-digit code")

    token_payload = _decode_signup_otp_session_token(payload.otp_session_token)
    expected_hash = token_payload.get("otp_hash")
    submitted_hash = hashlib.sha256(
        f"{otp}:{SECRET_KEY}".encode("utf-8")).hexdigest()

    if submitted_hash != expected_hash:
        raise HTTPException(status_code=400, detail="Invalid OTP")

    email = (token_payload.get("sub") or "").strip().lower()
    signup_verification_token = _create_signup_verification_token(email)

    return {
        "message": "Email verified for signup",
        "signup_verification_token": signup_verification_token,
    }


@router.post("/auth/reset-password")
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    new_password = payload.new_password or ""
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400,
            detail="New password must be at least 8 characters long",
        )

    email = _decode_reset_password_token(payload.token)
    user = db.query(models.User).filter(
        func.lower(models.User.email) == email
    ).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset request")

    user.hashed_password = get_password_hash(new_password)
    db.add(user)
    db.commit()

    return {"message": "Password reset successful"}


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    user_in: UserCreate,
    role: Optional[str] = Query(default=None),
    signup_verification_token: str = Query(default=""),
    db: Session = Depends(get_db)
):
    user_email = user_in.email.strip().lower()
    if signup_verification_token:
        verified_email = _decode_signup_verification_token(
            signup_verification_token)
        if verified_email != user_email:
            raise HTTPException(
                status_code=400, detail="Email is not verified for signup")

    if db.query(models.User).filter(models.User.username == user_in.username).first():
        raise HTTPException(
            status_code=400, detail="Username already registered")

    if db.query(models.User).filter(func.lower(models.User.email) == user_email).first():
        raise HTTPException(
            status_code=400, detail="Email already registered")

    hashed_password = get_password_hash(user_in.password)
    new_user = models.User(
        username=user_in.username,
        email=user_email,
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
            new_user.rapid_rating = fide_data.get("rapid_rating")
            new_user.blitz_rating = fide_data.get("blitz_rating")
            new_user.title = fide_data.get("fide_title")
            new_user.country = fide_data.get("federation")
        except HTTPException as e:
            raise HTTPException(
                status_code=400, detail=f"Invalid FIDE ID: {e.detail}")

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    requested_role = _normalize_role(role or user_in.role or "player")
    _ensure_signup_role_allowed(requested_role)
    role_name = requested_role

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

    email_service.send_onesignal_signup_email(
        email=new_user.email,
        name=(new_user.first_name or new_user.username or "Player"),
    )

    return {"message": "User created successfully"}
