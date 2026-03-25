from pydantic import BaseModel
from typing import Optional, List

class MatchBase(BaseModel):
    match_id: int
    round_number: int
    board_number: Optional[int] = None
    white_player_id: Optional[int] = None
    white_player_name: Optional[str] = None
    black_player_id: Optional[int] = None
    black_player_name: Optional[str] = None
    result: Optional[str] = None

class MatchResultUpdate(BaseModel):
    result: str  # 1-0, 0-1, 1/2-1/2, Bye

class PairingResponse(BaseModel):
    approved_participants: int
    current_round: int
    round_status: str
    pairing_system: Optional[str] = None
    tie_breaker_rules: List[str]
    rounds_info: List[dict] = []
    pairings: List[MatchBase]

class UserMatchResponse(BaseModel):
    id: int
    tournamentName: str
    round: int
    white: str
    black: str
    result: Optional[str] = None
    ratingChange: int = 0
    date: str

class UserMatchHistoryList(BaseModel):
    matches: List[UserMatchResponse]
