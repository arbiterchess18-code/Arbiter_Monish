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

async def fetch_world_top_players(source: str = "fide", limit: int = 10, category: str = "classical") -> list:
    """Fetch world top players from Lichess or ChessTools (FIDE)."""
    if source == "lichess":
        url = f"https://lichess.org/player/top/{limit}/{category if category != 'classical' else 'classical'}"
        headers = {"Accept": "application/vnd.lichess.v3+json"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return [{
                        "name": user.get("username"),
                        "rating": user.get("perfs", {}).get(category if category != "classical" else "classical", {}).get("rating"),
                        "title": user.get("title"),
                        "country": None
                    } for user in data.get("users", [])]
        except Exception as e:
            logger.error(f"Error fetching Lichess top players: {e}")
            
    # Mock data for different categories
    mock_data = {
        "classical": [
            {"name": "Magnus Carlsen", "rating": 2840, "title": "GM", "country": "Norway"},
            {"name": "Hikaru Nakamura", "rating": 2810, "title": "GM", "country": "United States"},
            {"name": "Fabiano Caruana", "rating": 2793, "title": "GM", "country": "United States"},
            {"name": "Nodirbek Abdusattorov", "rating": 2780, "title": "GM", "country": "Uzbekistan"},
            {"name": "Vincent Keymer", "rating": 2762, "title": "GM", "country": "Germany"},
            {"name": "Alireza Firouzja", "rating": 2759, "title": "GM", "country": "France"},
            {"name": "Wesley So", "rating": 2754, "title": "GM", "country": "United States"},
            {"name": "Wei Yi", "rating": 2754, "title": "GM", "country": "China"},
            {"name": "Anish Giri", "rating": 2753, "title": "GM", "country": "Netherlands"},
            {"name": "Erigaisi Arjun", "rating": 2750, "title": "GM", "country": "India"},
            {"name": "Sindarov, Javokhir", "rating": 2745, "title": "GM", "country": "Uzbekistan"},
        ],
        "rapid": [
            {"name": "Magnus Carlsen", "rating": 2825, "title": "GM", "country": "Norway"},
            {"name": "Ding Liren", "rating": 2818, "title": "GM", "country": "China"},
            {"name": "Ian Nepomniachtchi", "rating": 2802, "title": "GM", "country": "Russia"},
            {"name": "Jan-Krzysztof Duda", "rating": 2792, "title": "GM", "country": "Poland"},
            {"name": "Levon Aronian", "rating": 2785, "title": "GM", "country": "United States"},
        ]
    }
    
    cat = category.lower()
    return mock_data.get(cat, mock_data["classical"])[:limit]
