from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: Optional[str] = "player"

class UserResponse(UserBase):
    user_id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
