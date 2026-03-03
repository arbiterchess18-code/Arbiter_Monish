import os
import bcrypt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
import jwt
from dotenv import load_dotenv

# Load environment variables at the very beginning
load_dotenv()

from passlib.context import CryptContext
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, field_validator, model_validator
import json

import models
from database import engine, get_db

app = FastAPI(title="Chess Orbiter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "your-secret-key-keep-it-secret"
    print("\n" + "!"*60)
    print("WARNING: SECRET_KEY NOT FOUND IN ENVIRONMENT!")
    print("Falling back to insecure default key.")
    print("THIS WILL CAUSE SIGNATURE VERIFICATION ERRORS IF PREVIOUSLY CHANGED.")
    print("!" * 60 + "\n")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Utils

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

# Dependencies


async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("Auth Error: Username not found in token payload")
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        print("Auth Error: Token has expired")
        raise credentials_exception
    except jwt.PyJWTError as e:
        print(f"Auth Error: JWT Decode Error: {str(e)}")
        raise credentials_exception

    user = db.query(models.User).filter(
        models.User.username == username).first()
    if user is None:
        print(f"Auth Error: User '{username}' not found in database")
        raise credentials_exception
    return user


def check_role(roles: list):
    async def role_checker(current_user: models.User = Depends(get_current_user)):
        user_roles = [ur.role.role_name for ur in current_user.user_roles]
        if not any(role in user_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have enough permissions to access this resource"
            )
        return current_user
    return role_checker


def has_privileged_role(user: models.User) -> bool:
    user_roles = [ur.role.role_name for ur in user.user_roles]
    return "SUPER_ADMIN" in user_roles or "ADMIN" in user_roles


def get_user_roles(user: models.User) -> set:
    return {ur.role.role_name for ur in user.user_roles}


def is_tournament_creator_or_admin(tournament: models.Tournament, user: models.User) -> bool:
    return tournament.created_by == user.user_id or has_privileged_role(user)

# Routes


@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    roles = [ur.role.role_name.upper() for ur in user.user_roles]
    # Simplify role for frontend: pick the most powerful one or just pick first
    primary_role = "player"
    if "SUPER_ADMIN" in roles or "ADMIN" in roles or "ARBITER" in roles:
        primary_role = "arbiter"  # Frontend uses 'arbiter' or 'player'

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "roles": roles},
        expires_delta=access_token_expires
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "userData": {
            "firstName": user.first_name or user.username,
            "lastName": user.last_name or "",
            "email": user.email,
            "role": primary_role  # Matching frontend expected 'arbiter' or 'player'
        }
    }


@app.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    username: str,
    email: str,
    password: str,
    firstName: Optional[str] = None,
    lastName: Optional[str] = None,
    role: str = "player",
    db: Session = Depends(get_db)
):
    # Check if user exists
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(
            status_code=400, detail="Username already registered")

    hashed_password = get_password_hash(password)
    new_user = models.User(
        username=username,
        email=email,
        hashed_password=hashed_password,
        first_name=firstName,
        last_name=lastName,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Assign role
    role_name = "PLAYER"
    if role.upper() == "ARBITER":
        role_name = "ARBITER"

    # Case-insensitive role lookup
    from sqlalchemy import func
    target_role = db.query(models.Role).filter(
        func.upper(models.Role.role_name) == role_name).first()
    if target_role:
        db.add(models.UserRole(user_id=new_user.user_id,
               role_id=target_role.role_id))
        db.commit()

    return {"message": "User created successfully"}


@app.get("/admin-only", dependencies=[Depends(check_role(["SUPER_ADMIN"]))])
async def admin_only_route():
    return {"message": "Welcome, Master of the Chess Arena (Super Admin)"}


@app.get("/arbiter-only", dependencies=[Depends(check_role(["SUPER_ADMIN", "ARBITER"]))])
async def arbiter_only_route():
    return {"message": "Welcome, Tournament Arbiter"}

# --- SCHEMAS ---


class TournamentBase(BaseModel):
    tournament_name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    organizer_name: Optional[str] = None
    registration_type: Optional[str] = None
    entry_fee: Optional[float] = 0.0
    pairing_system: Optional[str] = "Swiss"
    event_type: Optional[str] = None
    time_control: Optional[str] = None
    increment: Optional[int] = 0
    rounds: Optional[int] = 5
    max_players: Optional[int] = None
    min_rating: Optional[int] = 0
    is_rated: bool = False
    fide_id: Optional[str] = None
    aicf_id: Optional[str] = None
    is_private: bool = False

    @field_validator("tournament_name", "venue_name", "organizer_name", "contact_person", mode="before")
    @classmethod
    def validate_required_text_fields(cls, value):
        if value is None:
            return value
        cleaned = value.strip() if isinstance(value, str) else value
        if isinstance(cleaned, str) and len(cleaned) < 2:
            raise ValueError("Must be at least 2 characters")
        return cleaned

    @field_validator("contact_email")
    @classmethod
    def validate_contact_email(cls, value):
        if value is None:
            return value
        if "@" not in value:
            raise ValueError("Invalid contact email")
        return value

    @field_validator("contact_phone")
    @classmethod
    def validate_contact_phone(cls, value):
        if value is None:
            return value
        normalized = "".join(ch for ch in value if ch.isdigit())
        if len(normalized) < 10 or len(normalized) > 15:
            raise ValueError("Contact phone must be 10-15 digits")
        return value

    @field_validator("registration_type")
    @classmethod
    def validate_registration_type(cls, value):
        if value is None:
            return value
        allowed = {"Free", "Paid", "Open", "Restricted", "Invite"}
        if value not in allowed:
            raise ValueError("Invalid registration type")
        return value

    @field_validator("pairing_system")
    @classmethod
    def validate_pairing_system(cls, value):
        if value is None:
            return value
        allowed = {"Swiss", "Round Robin", "Knockout", "Arena"}
        if value not in allowed:
            raise ValueError("Invalid pairing system")
        return value

    @field_validator("rounds", "increment")
    @classmethod
    def validate_positive_numeric_fields(cls, value):
        if value is None:
            return value
        if value <= 0:
            raise ValueError("Must be greater than 0")
        return value

    @field_validator("max_players")
    @classmethod
    def validate_max_players(cls, value):
        if value is None:
            return value
        if value < 2:
            raise ValueError("Max players must be at least 2")
        return value

    @field_validator("entry_fee")
    @classmethod
    def validate_entry_fee(cls, value):
        if value is None:
            return value
        if value < 0:
            raise ValueError("Entry fee cannot be negative")
        return value

    @field_validator("fide_id", "aicf_id")
    @classmethod
    def validate_rating_ids(cls, value):
        if value is None:
            return value
        if value and not value.isalnum():
            raise ValueError("Rating IDs must be alphanumeric")
        return value

    @model_validator(mode="after")
    def validate_required_workflow_fields(self):
        required_text = {
            "tournament_name": self.tournament_name,
            "start_time": self.start_time,
            "venue_name": self.venue_name,
            "city": self.city,
            "country": self.country,
            "contact_person": self.contact_person,
            "contact_email": self.contact_email,
            "contact_phone": self.contact_phone,
            "organizer_name": self.organizer_name,
            "registration_type": self.registration_type,
            "event_type": self.event_type,
            "pairing_system": self.pairing_system,
            "time_control": self.time_control,
        }
        missing = [k for k, v in required_text.items() if not v or (
            isinstance(v, str) and not v.strip())]
        if not self.start_date:
            missing.append("start_date")
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValueError("end_date cannot be before start_date")

        if self.is_rated and not (self.fide_id or self.aicf_id):
            raise ValueError(
                "At least one rating ID (FIDE or AICF) is required for rated tournaments")

        return self


class TournamentCreate(TournamentBase):
    pass


class TournamentUpdate(BaseModel):
    tournament_name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[str] = None
    venue_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    google_maps_link: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    organizer_name: Optional[str] = None
    registration_type: Optional[str] = None
    entry_fee: Optional[float] = None
    pairing_system: Optional[str] = None
    event_type: Optional[str] = None
    time_control: Optional[str] = None
    increment: Optional[int] = None
    rounds: Optional[int] = None
    max_players: Optional[int] = None
    min_rating: Optional[int] = None
    is_rated: Optional[bool] = None
    fide_id: Optional[str] = None
    aicf_id: Optional[str] = None
    is_private: Optional[bool] = None
    status: Optional[str] = None


class TournamentResponse(TournamentBase):
    tournament_id: int
    status: str
    created_at: datetime
    created_by: Optional[int] = None
    registered_count: int = 0

    class Config:
        from_attributes = True


class RegistrationFormFieldCreate(BaseModel):
    field_name: str
    field_type: str
    is_required: bool = False
    field_order: int = 0

    @field_validator("field_name")
    @classmethod
    def validate_field_name(cls, value):
        if not value or len(value.strip()) < 2:
            raise ValueError("Field name must be at least 2 characters")
        return value.strip()

    @field_validator("field_type")
    @classmethod
    def validate_field_type(cls, value):
        allowed = {"Text", "Email", "Number", "Date", "Dropdown", "Text Area"}
        if value not in allowed:
            raise ValueError("Invalid field type")
        return value


class RegistrationFormFieldResponse(RegistrationFormFieldCreate):
    field_id: int
    tournament_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TournamentRegistrationCreate(BaseModel):
    form_data: Dict[str, Any] = {}


class TournamentRegistrationStatusUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, value):
        allowed = {"pending", "approved", "rejected", "active"}
        normalized = (value or "").strip().lower()
        if normalized not in allowed:
            raise ValueError(
                "Status must be one of: pending, approved, rejected, active")
        return normalized


class TournamentRegistrationResponse(BaseModel):
    registration_id: int
    tournament_id: int
    user_id: int
    user_name: str
    user_email: str
    registration_date: datetime
    status: str
    current_points: float
    seed: Optional[int] = None


class PairingResponse(BaseModel):
    match_id: int
    round_number: int
    board_number: Optional[int] = None
    white_player_id: Optional[int] = None
    white_player_name: Optional[str] = None
    black_player_id: Optional[int] = None
    black_player_name: Optional[str] = None
    result: Optional[str] = None


class TournamentViewDetailsResponse(BaseModel):
    tournament: TournamentResponse
    stats: Dict[str, Any]
    tie_breaker_rules: List[str]
    available_tabs: List[str]

# --- ROUTES ---


@app.post("/tournaments", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
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
        print(f"Error creating tournament: {str(e)}")
        raise HTTPException(
            status_code=400, detail=f"Failed to create tournament: {str(e)}")


@app.get("/tournaments", response_model=List[TournamentResponse])
async def list_tournaments(db: Session = Depends(get_db)):
    tournaments = db.query(models.Tournament).all()
    for t in tournaments:
        t.registered_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == t.tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
    return tournaments


@app.get("/arbiter/tournaments", response_model=List[TournamentResponse])
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


@app.get("/tournaments/{tournament_id}", response_model=TournamentResponse)
async def get_tournament(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return tournament


@app.put("/tournaments/{tournament_id}", response_model=TournamentResponse)
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

    # Check if user is the creator
    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only update your own tournaments")

    # Update fields
    for key, value in tournament_update.model_dump(exclude_unset=True).items():
        setattr(tournament, key, value)

    db.commit()
    db.refresh(tournament)
    return tournament


@app.delete("/tournaments/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
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

    # Check if user is the creator
    if tournament.created_by != current_user.user_id and not has_privileged_role(current_user):
        raise HTTPException(
            status_code=403, detail="You can only delete your own tournaments")

    db.delete(tournament)
    db.commit()


@app.get("/tournaments/{tournament_id}/view-details", response_model=TournamentViewDetailsResponse)
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
        available_tabs = ["overview", "management",
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


@app.get("/tournaments/{tournament_id}/standings")
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


@app.post("/tournaments/{tournament_id}/registrations", response_model=TournamentRegistrationResponse, status_code=status.HTTP_201_CREATED)
async def register_for_tournament(
    tournament_id: int,
    registration_data: TournamentRegistrationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if tournament.status == "completed":
        raise HTTPException(
            status_code=400, detail="Registration is closed for completed tournaments")

    if tournament.max_players:
        approved_count = db.query(models.TournamentRegistration).filter(
            models.TournamentRegistration.tournament_id == tournament_id,
            models.TournamentRegistration.status.in_(["approved", "active"])
        ).count()
        if approved_count >= tournament.max_players:
            raise HTTPException(
                status_code=400, detail="Tournament registration is full")

    existing = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.user_id == current_user.user_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, detail="You have already registered for this tournament")

    form_fields = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).order_by(models.RegistrationFormField.field_order).all()

    payload = registration_data.form_data or {}
    for field in form_fields:
        if field.is_required:
            value = payload.get(field.field_name)
            if value is None or (isinstance(value, str) and not value.strip()):
                raise HTTPException(
                    status_code=422,
                    detail=f"Missing required registration field: {field.field_name}",
                )

    status_value = "pending"
    new_registration = models.TournamentRegistration(
        tournament_id=tournament_id,
        user_id=current_user.user_id,
        status=status_value,
        color_history=json.dumps(payload),
    )
    db.add(new_registration)
    db.commit()
    db.refresh(new_registration)

    full_name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip(
    ) or current_user.username
    return {
        "registration_id": new_registration.registration_id,
        "tournament_id": tournament_id,
        "user_id": current_user.user_id,
        "user_name": full_name,
        "user_email": current_user.email,
        "registration_date": new_registration.registration_date,
        "status": new_registration.status,
        "current_points": float(new_registration.current_points or 0),
        "seed": new_registration.seed,
    }


@app.get("/tournaments/{tournament_id}/registrations", response_model=List[TournamentRegistrationResponse])
async def get_tournament_registrations(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can view registrations")

    registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id
    ).order_by(models.TournamentRegistration.registration_date.desc()).all()

    response = []
    for registration in registrations:
        user = db.query(models.User).filter(
            models.User.user_id == registration.user_id).first()
        full_name = f"{user.first_name or ''} {user.last_name or ''}".strip(
        ) or user.username
        response.append({
            "registration_id": registration.registration_id,
            "tournament_id": registration.tournament_id,
            "user_id": registration.user_id,
            "user_name": full_name,
            "user_email": user.email,
            "registration_date": registration.registration_date,
            "status": registration.status,
            "current_points": float(registration.current_points or 0),
            "seed": registration.seed,
        })
    return response


@app.patch("/tournaments/{tournament_id}/registrations/{registration_id}/status", response_model=TournamentRegistrationResponse)
async def update_registration_status(
    tournament_id: int,
    registration_id: int,
    status_update: TournamentRegistrationStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can manage registrations")

    registration = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.registration_id == registration_id,
    ).first()
    if not registration:
        raise HTTPException(status_code=404, detail="Registration not found")

    registration.status = status_update.status
    db.commit()
    db.refresh(registration)

    user = db.query(models.User).filter(
        models.User.user_id == registration.user_id).first()
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip(
    ) or user.username
    return {
        "registration_id": registration.registration_id,
        "tournament_id": registration.tournament_id,
        "user_id": registration.user_id,
        "user_name": full_name,
        "user_email": user.email,
        "registration_date": registration.registration_date,
        "status": registration.status,
        "current_points": float(registration.current_points or 0),
        "seed": registration.seed,
    }


@app.get("/tournaments/{tournament_id}/pairings")
async def get_tournament_pairings(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    approved_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    rounds = db.query(models.Round).filter(
        models.Round.tournament_id == tournament_id
    ).order_by(models.Round.round_number.asc()).all()

    pairings: List[Dict[str, Any]] = []
    for round_item in rounds:
        matches = db.query(models.Match).filter(
            models.Match.round_id == round_item.round_id
        ).order_by(models.Match.board_number.asc()).all()

        for match in matches:
            white_player = db.query(models.User).filter(
                models.User.user_id == match.white_player_id).first() if match.white_player_id else None
            black_player = db.query(models.User).filter(
                models.User.user_id == match.black_player_id).first() if match.black_player_id else None
            pairings.append({
                "match_id": match.match_id,
                "round_number": round_item.round_number,
                "board_number": match.board_number,
                "white_player_id": match.white_player_id,
                "white_player_name": (f"{white_player.first_name or ''} {white_player.last_name or ''}".strip() if white_player else None) or (white_player.username if white_player else None),
                "black_player_id": match.black_player_id,
                "black_player_name": (f"{black_player.first_name or ''} {black_player.last_name or ''}".strip() if black_player else None) or (black_player.username if black_player else None),
                "result": match.result,
            })

    return {
        "approved_participants": len(approved_registrations),
        "current_round": tournament.current_round or 0,
        "round_status": "not_started" if len(rounds) == 0 else "in_progress",
        "pairing_system": tournament.pairing_system,
        "tie_breaker_rules": ["Buchholz", "Sonneborn-Berger", "Wins with Black"],
        "pairings": pairings,
    }


@app.post("/tournaments/{tournament_id}/pairings/start")
async def start_pairing_round(
    tournament_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    if not is_tournament_creator_or_admin(tournament, current_user):
        raise HTTPException(
            status_code=403, detail="Only tournament creator or admin can start pairings")

    approved_registrations = db.query(models.TournamentRegistration).filter(
        models.TournamentRegistration.tournament_id == tournament_id,
        models.TournamentRegistration.status.in_(["approved", "active"])
    ).all()

    if len(approved_registrations) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 approved participants are required")

    next_round = (tournament.current_round or 0) + 1
    if tournament.rounds and next_round > tournament.rounds:
        raise HTTPException(
            status_code=400, detail="All configured rounds are already generated")

    round_record = models.Round(
        tournament_id=tournament_id,
        round_number=next_round,
    )
    db.add(round_record)
    db.flush()

    sorted_regs = approved_registrations
    pairing_system = (tournament.pairing_system or "Swiss").lower()

    if "knockout" in pairing_system:
        sorted_regs = sorted(
            approved_registrations,
            key=lambda registration: (
                float(registration.current_points or 0), registration.registration_id),
            reverse=True,
        )
        reordered = []
        left = 0
        right = len(sorted_regs) - 1
        while left <= right:
            if left == right:
                reordered.append(sorted_regs[left])
            else:
                reordered.append(sorted_regs[left])
                reordered.append(sorted_regs[right])
            left += 1
            right -= 1
        sorted_regs = reordered
    elif "round robin" in pairing_system:
        sorted_regs = sorted(
            approved_registrations, key=lambda registration: registration.registration_id)
        rotation = (next_round - 1) % max(len(sorted_regs), 1)
        sorted_regs = sorted_regs[rotation:] + sorted_regs[:rotation]
    else:
        sorted_regs = sorted(
            approved_registrations,
            key=lambda registration: (
                float(registration.current_points or 0), registration.registration_id),
            reverse=True,
        )

    board_number = 1
    index = 0
    while index < len(sorted_regs):
        white_reg = sorted_regs[index]
        black_reg = sorted_regs[index + 1] if index + \
            1 < len(sorted_regs) else None

        new_match = models.Match(
            tournament_id=tournament_id,
            round_id=round_record.round_id,
            white_player_id=white_reg.user_id,
            black_player_id=black_reg.user_id if black_reg else None,
            board_number=board_number,
            result="1-0" if not black_reg else None,
        )
        db.add(new_match)

        if not black_reg:
            white_reg.current_points = float(
                white_reg.current_points or 0) + 1.0

        board_number += 1
        index += 2

    tournament.current_round = next_round
    if tournament.status == "upcoming":
        tournament.status = "active"

    db.commit()
    return {"message": f"Round {next_round} pairings generated successfully"}

# --- REGISTRATION FORM FIELDS ENDPOINTS ---


@app.post("/tournaments/{tournament_id}/registration-form-fields", response_model=RegistrationFormFieldResponse, status_code=status.HTTP_201_CREATED)
async def create_form_field(
    tournament_id: int,
    field: RegistrationFormFieldCreate,
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
            status_code=403, detail="You can only modify your own tournament forms")

    new_field = models.RegistrationFormField(
        tournament_id=tournament_id,
        **field.model_dump()
    )
    db.add(new_field)
    db.commit()
    db.refresh(new_field)
    return new_field


@app.get("/tournaments/{tournament_id}/registration-form-fields", response_model=List[RegistrationFormFieldResponse])
async def get_form_fields(tournament_id: int, db: Session = Depends(get_db)):
    tournament = db.query(models.Tournament).filter(
        models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")

    fields = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.tournament_id == tournament_id
    ).order_by(models.RegistrationFormField.field_order).all()
    return fields


@app.put("/tournaments/{tournament_id}/registration-form-fields/{field_id}", response_model=RegistrationFormFieldResponse)
async def update_form_field(
    tournament_id: int,
    field_id: int,
    field_update: RegistrationFormFieldCreate,
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
            status_code=403, detail="You can only modify your own tournament forms")

    field = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.field_id == field_id,
        models.RegistrationFormField.tournament_id == tournament_id
    ).first()

    if not field:
        raise HTTPException(status_code=404, detail="Form field not found")

    for key, value in field_update.model_dump().items():
        setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return field


@app.delete("/tournaments/{tournament_id}/registration-form-fields/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_form_field(
    tournament_id: int,
    field_id: int,
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
            status_code=403, detail="You can only modify your own tournament forms")

    field = db.query(models.RegistrationFormField).filter(
        models.RegistrationFormField.field_id == field_id,
        models.RegistrationFormField.tournament_id == tournament_id
    ).first()

    if not field:
        raise HTTPException(status_code=404, detail="Form field not found")

    db.delete(field)
    db.commit()


@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
