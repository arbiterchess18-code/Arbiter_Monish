from pydantic import BaseModel, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime

class TournamentRegistrationBase(BaseModel):
    form_data: Dict[str, Any] = {}

class TournamentRegistrationCreate(TournamentRegistrationBase):
    is_manual: Optional[bool] = False
    player_email: Optional[str] = None
    player_name: Optional[str] = None
    player_phone: Optional[str] = None
    player_rating: Optional[int] = None
    player_fide_id: Optional[str] = None

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
    player_rating: Optional[int] = 0

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
