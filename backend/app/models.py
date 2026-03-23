from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Date, TIMESTAMP, Numeric, JSON
from sqlalchemy.orm import relationship
from .database import Base
import datetime
from sqlalchemy.sql import func
import json


class Role(Base):
    __tablename__ = "roles"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(50), unique=True, nullable=False)
    description = Column(Text)

    user_roles = relationship("UserRole", back_populates="role")


class UserRole(Base):
    __tablename__ = "user_roles"
    user_role_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    role_id = Column(Integer, ForeignKey("roles.role_id", ondelete="CASCADE"))
    assigned_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="user_roles")
    role = relationship("Role", back_populates="user_roles")


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(Text, nullable=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    date_of_birth = Column(Date)
    gender = Column(String(20))
    fide_id = Column(String(20), unique=True)
    fide_rating = Column(Integer, default=0)
    rapid_rating = Column(Integer, default=0)
    blitz_rating = Column(Integer, default=0)
    national_rating = Column(Integer, default=0)
    national_rank = Column(Integer, nullable=True)
    country = Column(String(100), default="India")
    is_active = Column(Boolean, default=True)

    # External Rating Fields
    lichess_username = Column(String(50), nullable=True)
    lichess_rating = Column(Integer, nullable=True)
    chesstools_rating = Column(Integer, nullable=True)
    last_rating_sync = Column(TIMESTAMP, nullable=True)

    # FIDE History Cache — refreshed at most once every 30 days
    fide_history_cache = Column(JSON, nullable=True, default=None)
    fide_history_synced_at = Column(TIMESTAMP, nullable=True, default=None)

    # Arbiter-specific fields
    title = Column(String(100), nullable=True)  # e.g., "International Arbiter"
    location = Column(String(255), nullable=True)  # e.g., "Madrid, Spain"
    phone = Column(String(20), nullable=True)
    bio = Column(Text, nullable=True)
    experience_years = Column(String(50), nullable=True)  # e.g., "18+ years"
    # e.g., ["Team Events", "Grand Master Series"]
    specializations = Column(JSON, default=list)
    is_verified = Column(Boolean, default=False)
    tournaments_conducted = Column(Integer, default=0)
    availability = Column(String(255), default="Year-round")
    profile_picture_url = Column(Text, nullable=True)

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user_roles = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan")
    created_tournaments = relationship("Tournament", back_populates="creator")
    registrations = relationship(
        "TournamentRegistration", back_populates="user")
    white_matches = relationship(
        "Match", foreign_keys="[Match.white_player_id]", back_populates="white_player")
    black_matches = relationship(
        "Match", foreign_keys="[Match.black_player_id]", back_populates="black_player")


class Tournament(Base):
    __tablename__ = "tournaments"
    tournament_id = Column(Integer, primary_key=True, index=True)
    created_by = Column(Integer, ForeignKey(
        "users.user_id", ondelete="SET NULL"))
    tournament_name = Column(String(255), nullable=False, index=True)
    description = Column(Text)
    start_date = Column(Date)
    end_date = Column(Date)
    start_time = Column(String(20))
    venue_name = Column(String(255))
    city = Column(String(100))
    state = Column(String(100))
    country = Column(String(100), default="India")
    google_maps_link = Column(Text)

    contact_person = Column(String(255))
    contact_email = Column(String(255))
    contact_phone = Column(String(20))

    organizer_name = Column(String(255))
    registration_type = Column(String(50))  # open, restricted, invite
    entry_fee = Column(Numeric(10, 2), default=0.0)

    # Swiss, Round Robin, Knockout
    pairing_system = Column(String(50), default="Swiss")
    event_type = Column(String(50))  # Standard, Rapid, Blitz
    time_control = Column(String(50))  # e.g., "90+30"
    increment = Column(Integer, default=0)
    rounds = Column(Integer, default=5)
    current_round = Column(Integer, default=0)
    max_players = Column(Integer)
    min_rating = Column(Integer, default=0)

    is_rated = Column(Boolean, default=False)
    fide_id = Column(String(50))
    aicf_id = Column(String(50))
    is_private = Column(Boolean, default=False)
    tie_break_config_json = Column(
        "tie_break_config", Text, default='["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Direct Encounter", "Number of Wins"]')

    @property
    def tie_break_config(self):
        if not self.tie_break_config_json:
            return ["Buchholz Cut-1", "Buchholz", "Sonneborn-Berger", "Direct Encounter", "Number of Wins"]
        return json.loads(self.tie_break_config_json)

    @tie_break_config.setter
    def tie_break_config(self, value):
        self.tie_break_config_json = json.dumps(value)

    sub_arbiters_json = Column("sub_arbiters", Text, default='[]')

    @property
    def sub_arbiters(self):
        if not self.sub_arbiters_json:
            return []
        return json.loads(self.sub_arbiters_json)

    @sub_arbiters.setter
    def sub_arbiters(self, value):
        self.sub_arbiters_json = json.dumps(value)

    # Note: New relational mapping for Sub-Arbiters
    staff = relationship(
        "TournamentStaff", back_populates="tournament", cascade="all, delete-orphan")

    # upcoming, active, completed
    status = Column(String(30), default="upcoming")
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(
        TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    creator = relationship("User", back_populates="created_tournaments")
    rounds_list = relationship(
        "Round", back_populates="tournament", cascade="all, delete-orphan")
    registrations = relationship(
        "TournamentRegistration", back_populates="tournament", cascade="all, delete-orphan")
    matches = relationship(
        "Match", back_populates="tournament", cascade="all, delete-orphan")
    registration_form_fields = relationship(
        "RegistrationFormField", back_populates="tournament", cascade="all, delete-orphan")


class TournamentStaff(Base):
    __tablename__ = "tournament_staff"
    staff_id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    role_title = Column(String(50), nullable=False)
    fide_id = Column(String(50))
    assigned_at = Column(TIMESTAMP, server_default=func.now())

    tournament = relationship("Tournament", back_populates="staff")
    user = relationship("User")


class Round(Base):
    __tablename__ = "rounds"
    round_id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"))
    round_number = Column(Integer, nullable=False)
    start_time = Column(TIMESTAMP)

    is_submitted = Column(Boolean, default=False)

    tournament = relationship("Tournament", back_populates="rounds_list")
    matches = relationship("Match", back_populates="round",
                           cascade="all, delete-orphan")


class Match(Base):
    __tablename__ = "matches"
    match_id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"))
    round_id = Column(Integer, ForeignKey(
        "rounds.round_id", ondelete="CASCADE"))
    white_player_id = Column(Integer, ForeignKey("users.user_id"))
    black_player_id = Column(Integer, ForeignKey("users.user_id"))
    board_number = Column(Integer)
    result = Column(String(20))  # 1-0, 0-1, 1/2-1/2, Bye
    created_at = Column(TIMESTAMP, server_default=func.now())

    tournament = relationship("Tournament", back_populates="matches")
    round = relationship("Round", back_populates="matches")
    white_player = relationship(
        "User", foreign_keys=[white_player_id], back_populates="white_matches")
    black_player = relationship(
        "User", foreign_keys=[black_player_id], back_populates="black_matches")


class TournamentRegistration(Base):
    __tablename__ = "tournament_registrations"
    registration_id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    registration_date = Column(TIMESTAMP, server_default=func.now())
    status = Column(String(30), default="pending")

    # Fields for pairing algorithm
    current_points = Column(Numeric(4, 1), default=0.0)
    seed = Column(Integer)
    # Stores serialized form payload / color history
    color_history = Column(Text, default="")
    bye_received = Column(Boolean, default=False)

    tournament = relationship("Tournament", back_populates="registrations")
    user = relationship("User", back_populates="registrations")


class RegistrationFormField(Base):
    __tablename__ = "registration_form_fields"
    field_id = Column(Integer, primary_key=True, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"))
    field_name = Column(String(255), nullable=False)
    # Text, Email, Number, Date, Dropdown, Text Area
    field_type = Column(String(50), nullable=False)
    # Optional image data/url for non-input display blocks (e.g. payment QR)
    field_image = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    field_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP, server_default=func.now())

    tournament = relationship(
        "Tournament", back_populates="registration_form_fields")


class RatingHistory(Base):
    __tablename__ = "rating_history"
    rating_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"))
    tournament_id = Column(Integer, ForeignKey("tournaments.tournament_id"))
    old_rating = Column(Integer)
    new_rating = Column(Integer)
    rating_change = Column(Integer)
    calculated_at = Column(TIMESTAMP, server_default=func.now())


class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(
        "users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    tournament_id = Column(Integer, ForeignKey(
        "tournaments.tournament_id", ondelete="CASCADE"), nullable=True)
    # e.g. RESULT_UPDATE, ROUND_PAIRING
    type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)

    user = relationship("User", backref="notifications")
    tournament = relationship("Tournament", backref="notifications")
