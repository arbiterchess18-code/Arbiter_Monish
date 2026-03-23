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


class BulkParticipantImport(BaseModel):
    """Schema for bulk participant import from Excel"""
    class ParticipantData(BaseModel):
        player_name: str
        player_email: str
        player_rating: Optional[int] = 0
        registered_date: Optional[str] = None

    participants: List[ParticipantData]


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
    form_data: Dict[str, Any] = {}

    class Config:
        from_attributes = True


class BulkImportResponse(BaseModel):
    """Response for bulk participant import"""
    total_processed: int
    successful: int
    failed: int
    imported: List[TournamentRegistrationResponse] = []
    errors: List[Dict[str, Any]] = []


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
        normalized = (value or "").strip()
        lowered = normalized.lower()
        compact = "".join(ch for ch in lowered if ch.isalpha())

        if (
            "screenshot" in lowered
            or "image" in lowered
            or "file" in lowered
            or "file upload" in lowered
            or "screenshot" in compact
            or "image" in compact
            or "file" in compact
        ):
            return "Image"

        alias_map = {
            "text": "Text",
            "email": "Email",
            "number": "Number",
            "date": "Date",
            "dropdown": "Dropdown",
            "textarea": "Text Area",
            "text area": "Text Area",
            "image": "Image",
            "images": "Image",
            "file": "Image",
            "files": "Image",
            "file upload": "Image",
            "screenshot": "Image",
            "screenshots": "Image",
        }
        canonical = alias_map.get(lowered, alias_map.get(compact, normalized))
        allowed = {"Text", "Email", "Number",
                   "Date", "Dropdown", "Text Area", "Image"}
        if canonical not in allowed:
            raise ValueError(
                "Invalid field type. Use one of: text, email, number, date, dropdown, text area, image/file")
        return canonical


class RegistrationFormFieldResponse(RegistrationFormFieldCreate):
    field_id: int
    tournament_id: int
    created_at: datetime

    class Config:
        from_attributes = True
