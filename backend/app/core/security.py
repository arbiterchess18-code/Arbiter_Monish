import bcrypt
from datetime import datetime, timedelta
import jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .. import models
from ..database import get_db
from .config import SECRET_KEY, ALGORITHM

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token", auto_error=False)


def _canonical_role_name(role_name: str) -> str:
    normalized = (role_name or "").strip().upper().replace(
        "-", "_").replace(" ", "_")
    aliases = {
        "ORBITER": "ARBITER",
        "ORGANIZER": "ORGANIZATION",
    }
    return aliases.get(normalized, normalized)


def _extract_db_roles(user: models.User) -> set:
    return {
        _canonical_role_name(ur.role.role_name)
        for ur in (getattr(user, "user_roles", None) or [])
        if ur and ur.role and ur.role.role_name
    }


def _extract_token_roles(user: models.User) -> set:
    token_roles = getattr(user, "_token_roles", None) or []
    return {
        _canonical_role_name(role)
        for role in token_roles
        if role
    }


def _collect_token_roles(payload: dict) -> list:
    if not isinstance(payload, dict):
        return []

    collected = []

    roles_claim = payload.get("roles")
    if isinstance(roles_claim, list):
        collected.extend([role for role in roles_claim if role])
    elif isinstance(roles_claim, str) and roles_claim.strip():
        collected.append(roles_claim.strip())

    for key in ("role", "user_role", "userRole"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            collected.append(value.strip())

    user_data = payload.get("userData")
    if isinstance(user_data, dict):
        nested_role = user_data.get("role")
        if isinstance(nested_role, str) and nested_role.strip():
            collected.append(nested_role.strip())

    # De-duplicate while preserving original order for easier debugging.
    seen = set()
    unique = []
    for role in collected:
        key = role.strip().upper()
        if not key or key in seen:
            continue
        seen.add(key)
        unique.append(role)
    return unique


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(request: Request, token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    cookie_token = request.cookies.get("access_token")
    resolved_token = token

    if cookie_token:
        if cookie_token.startswith("Bearer "):
            resolved_token = cookie_token.split(" ")[1]
        else:
            resolved_token = cookie_token

    if not resolved_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = jwt.decode(resolved_token, SECRET_KEY,
                             algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print(f"Auth Error: 'sub' missing from token payload: {payload}")
            raise credentials_exception
        # print(f"✅ Token validated for user: {username}")
    except jwt.ExpiredSignatureError:
        print("Auth Error: Token signature has expired")
        raise credentials_exception
    except jwt.PyJWTError as e:
        print(f"Auth Error: JWT Decode Error: {str(e)}")
        # This helps identify if SECRET_KEY or ALGORITHM mismatches
        raise credentials_exception

    from sqlalchemy.orm import joinedload
    user = db.query(models.User).options(
        joinedload(models.User.user_roles).joinedload(models.UserRole.role)
    ).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception

    # Fallback for legacy data where role relations may be incomplete.
    user._token_roles = _collect_token_roles(payload)

    return user


def check_role(roles: list):
    async def role_checker(current_user: models.User = Depends(get_current_user)):
        user_roles = _extract_db_roles(
            current_user) | _extract_token_roles(current_user)
        required_roles = {_canonical_role_name(role) for role in roles}
        if user_roles.isdisjoint(required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions to access this resource"
            )
        return current_user
    return role_checker


def has_privileged_role(user: models.User) -> bool:
    user_roles = _extract_db_roles(user) | _extract_token_roles(user)
    return "SUPER_ADMIN" in user_roles or "ADMIN" in user_roles


def get_user_roles(user: models.User) -> set:
    return _extract_db_roles(user) | _extract_token_roles(user)


def is_tournament_creator_or_admin(tournament: models.Tournament, user: models.User) -> bool:
    return tournament.created_by == user.user_id or has_privileged_role(user)


def is_tournament_staff_or_admin(tournament: models.Tournament, user: models.User) -> bool:
    if is_tournament_creator_or_admin(tournament, user):
        return True

    try:
        # Lazy-load the staff relationship if available and check for assignment
        if any(staff.user_id == user.user_id for staff in tournament.staff):
            return True
    except Exception:
        pass

    return False
