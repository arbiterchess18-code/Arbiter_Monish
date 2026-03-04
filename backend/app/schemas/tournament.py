from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Dict, Any
from datetime import date, datetime

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

class TournamentCreate(TournamentBase):
    @model_validator(mode="after")
    def validate_required_workflow_fields(self) -> "TournamentCreate":
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
    current_round: int = 0
    created_at: datetime
    created_by: Optional[int] = None
    registered_count: int = 0

    class Config:
        from_attributes = True

class TournamentViewDetailsResponse(BaseModel):
    tournament: TournamentResponse
    stats: Dict[str, Any]
    tie_breaker_rules: List[str]
    available_tabs: List[str]
