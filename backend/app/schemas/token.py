from pydantic import BaseModel
from typing import Optional, Dict, Any

class Token(BaseModel):
    access_token: str
    token_type: str
    userData: Optional[Dict[str, Any]] = None

class TokenData(BaseModel):
    username: Optional[str] = None
    roles: Optional[list] = []

class LoginRequest(BaseModel):
    username: str
    password: str
