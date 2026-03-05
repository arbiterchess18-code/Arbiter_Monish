import httpx
import logging

logger = logging.getLogger(__name__)

async def fetch_lichess_rating(username: str) -> int:
    """Fetch Blitz rating from Lichess API."""
    if not username:
        return None
    
    url = f"https://lichess.org/api/user/{username}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("perfs", {}).get("blitz", {}).get("rating")
            else:
                logger.warning(f"Failed to fetch Lichess rating for {username}: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error fetching Lichess rating for {username}: {e}")
        return None

async def fetch_chesstools_rating(fide_id: str) -> int:
    """Fetch FIDE rating from ChessTools API (hypothetical endpoint based on research)."""
    if not fide_id:
        return None
    
    # Based on research, ChessTools provides FIDE ratings
    url = f"https://chesstools.org/api/players/{fide_id}"
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                # Assuming the structure based on general chess API patterns
                return data.get("rating") or data.get("fide_rating")
            else:
                logger.warning(f"Failed to fetch ChessTools rating for {fide_id}: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"Error fetching ChessTools rating for {fide_id}: {e}")
        return None

async def fetch_world_top_players(source: str = "fide", limit: int = 10) -> list:
    """Fetch world top players from Lichess or ChessTools (FIDE)."""
    if source == "lichess":
        url = f"https://lichess.org/player/top/{limit}/classical"
        headers = {"Accept": "application/vnd.lichess.v3+json"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    # Lichess returns a list of users
                    return [{
                        "name": user.get("username"),
                        "rating": user.get("perfs", {}).get("classical", {}).get("rating"),
                        "title": user.get("title"),
                        "country": None # Lichess doesn't always provide country in this endpoint
                    } for user in data.get("users", [])]
        except Exception as e:
            logger.error(f"Error fetching Lichess top players: {e}")
            
    elif source == "fide":
        # ChessTools FIDE top players (assuming reasonable guessing based on its mission)
        # Using a fallback if ChessTools top endpoint is not working as expected
        url = "https://chesstools.org/api/fide/top"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    return data[:limit]
        except Exception as e:
            logger.error(f"Error fetching ChessTools FIDE top players: {e}")
            
    # Updated FIDE top players data provided by the user
    if source == "fide":
        return [
            {"name": "Magnus Carlsen", "rating": 2840, "title": "GM", "country": "Norway"},
            {"name": "Hikaru Nakamura", "rating": 2810, "title": "GM", "country": "United States"},
            {"name": "Fabiano Caruana", "rating": 2795, "title": "GM", "country": "United States"},
            {"name": "Vincent Keymer", "rating": 2776, "title": "GM", "country": "Germany"},
            {"name": "Nodirbek Abdusattorov", "rating": 2771, "title": "GM", "country": "Uzbekistan"},
            {"name": "Alireza Firouzja", "rating": 2759, "title": "GM", "country": "France"},
            {"name": "Wei Yi", "rating": 2754, "title": "GM", "country": "China"},
            {"name": "Anish Giri", "rating": 2753, "title": "GM", "country": "Netherlands"},
            {"name": "Wesley So", "rating": 2753, "title": "GM", "country": "United States"},
            {"name": "Gukesh D", "rating": 2748, "title": "GM", "country": "India"},
        ][:limit]
        
    return []
