from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
import jwt
import os
from dotenv import load_dotenv
from passlib.context import CryptContext
from typing import List, Optional
from pydantic import BaseModel, EmailStr

import models
from database import engine, get_db

load_dotenv()

app = FastAPI(title="Chess Orbiter API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Config
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-keep-it-secret")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

import bcrypt

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
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
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

# Routes
@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    roles = [ur.role.role_name for ur in user.user_roles]
    # Simplify role for frontend: pick the most powerful one or just pick first
    primary_role = "player"
    if "SUPER_ADMIN" in roles or "ADMIN" in roles or "ARBITER" in roles:
        primary_role = "arbiter" # Frontend uses 'arbiter' or 'player'

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
            "role": primary_role # Matching frontend expected 'arbiter' or 'player'
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
        raise HTTPException(status_code=400, detail="Username already registered")
    
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
    
    target_role = db.query(models.Role).filter(models.Role.role_name == role_name).first()
    if target_role:
        db.add(models.UserRole(user_id=new_user.user_id, role_id=target_role.role_id))
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

class TournamentCreate(TournamentBase):
    pass

class TournamentResponse(TournamentBase):
    tournament_id: int
    status: str
    created_at: datetime
    created_by: Optional[int] = None

    class Config:
        from_attributes = True

# --- ROUTES ---
@app.post("/tournaments", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
async def create_tournament(
    tournament: TournamentCreate, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(check_role(["SUPER_ADMIN", "ARBITER"]))
):
    new_tournament = models.Tournament(
        **tournament.model_dump(),
        created_by=current_user.user_id,
        status="upcoming"
    )
    db.add(new_tournament)
    db.commit()
    db.refresh(new_tournament)
    return new_tournament

@app.get("/tournaments", response_model=List[TournamentResponse])
async def list_tournaments(db: Session = Depends(get_db)):
    return db.query(models.Tournament).all()

@app.get("/tournaments/{tournament_id}/standings")
async def get_standings(tournament_id: int, db: Session = Depends(get_db)):
    # Basic logic: fetch tournament and registered players
    tournament = db.query(models.Tournament).filter(models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Return registered players as standing entries for now
    # In a full Swiss system, we would calculate points from match results
    return []

@app.post("/tournaments/{tournament_id}/register")
async def register_player(
    tournament_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    tournament = db.query(models.Tournament).filter(models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Logic to add player to tournament (e.g. create a TournamentPlayer link)
    # For now, let's just return success
    return {"message": "Successfully registered"}

@app.post("/tournaments/{tournament_id}/start")
async def start_tournament(
    tournament_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role(["SUPER_ADMIN", "ARBITER"]))
):
    tournament = db.query(models.Tournament).filter(models.Tournament.tournament_id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    tournament.status = "active"
    db.commit()
    return {"message": "Tournament started"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
