from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from datetime import datetime
from ....database import get_db
from ....models import User
from ....services.external_api import fetch_lichess_rating, fetch_chesstools_rating, fetch_world_top_players

router = APIRouter()

@router.get("/")
async def get_leaderboard(
    type: str = "fide", # fide, lichess, chesstools
    limit: int = 50,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    
    if type == "lichess":
        query = query.filter(User.lichess_rating != None).order_by(desc(User.lichess_rating))
    elif type == "chesstools":
        query = query.filter(User.chesstools_rating != None).order_by(desc(User.chesstools_rating))
    else:
        query = query.order_by(desc(User.fide_rating))
        
    users = query.limit(limit).all()
    
    leaderboard = []
    for i, user in enumerate(users):
        rating = user.fide_rating
        if type == "lichess":
            rating = user.lichess_rating
        elif type == "chesstools":
            rating = user.chesstools_rating
            
        leaderboard.append({
            "rank": i + 1,
            "player": {
                "id": user.user_id,
                "name": f"{user.first_name} {user.last_name}" if user.first_name else user.username,
                "country": user.country,
                "rating": rating,
                "title": None # Could be expanded if titles are stored
            },
            "points": 0, # Placeholder for global leaderboard
            "lichess_username": user.lichess_username
        })
        
    return leaderboard

@router.post("/sync")
async def sync_ratings(db: Session = Depends(get_db)):
    """Manually trigger rating sync for users who have external IDs."""
    users = db.query(User).filter(
        (User.lichess_username != None) | (User.fide_id != None)
    ).all()
    
    updated_count = 0
    for user in users:
        updated = False
        if user.lichess_username:
            new_rating = await fetch_lichess_rating(user.lichess_username)
            if new_rating:
                user.lichess_rating = new_rating
                updated = True
        
        if user.fide_id:
            new_rating = await fetch_chesstools_rating(user.fide_id)
            if new_rating:
                user.chesstools_rating = new_rating
                updated = True
                
        if updated:
            user.last_rating_sync = datetime.utcnow()
            updated_count += 1
            
    db.commit()
    return {"message": f"Successfully synced ratings for {updated_count} users."}

@router.get("/world-top")
async def get_world_top(source: str = "fide", limit: int = 10):
    """Fetch world top players from external APIs."""
    top_players = await fetch_world_top_players(source=source, limit=limit)
    
    formatted_leaderboard = []
    for i, player in enumerate(top_players):
        formatted_leaderboard.append({
            "rank": i + 1,
            "player": {
                "id": f"world-{i}",
                "name": player.get("name"),
                "country": player.get("country"),
                "rating": player.get("rating"),
                "title": player.get("title")
            },
            "points": 0
        })
        
    return formatted_leaderboard
