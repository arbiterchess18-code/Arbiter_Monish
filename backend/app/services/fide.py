import httpx
import datetime
from typing import Any
from fastapi import HTTPException


async def fetch_fide_player_info(fide_id: str) -> dict:
    """Fetches current player ratings, title, and federation from the FIDE API."""
    url = f"https://fide-api.vercel.app/player_info/?fide_id={fide_id}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)

        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="FIDE ID not found or API down")

        return response.json()


async def fetch_fide_player_history(fide_id: str) -> list[Any]:
    """
    Fetches up to 6 months of FIDE rating history for a player.
    Returns the data in chronological order (oldest → newest).
    """
    url = f"https://fide-api.vercel.app/player_history/?fide_id={fide_id}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code != 200:
            return []
        history_data = response.json()

    # Take the most recent 6 months and reverse to chronological order
    last_6_months = history_data[:6]
    return list(reversed(last_6_months))


def is_cache_stale(synced_at: datetime.datetime | None, days: int = 30) -> bool:
    """
    Returns True if the cache is missing or older than `days` days.
    FIDE updates ratings monthly, so 30 days is the default threshold.
    """
    if synced_at is None:
        return True
    age = datetime.datetime.utcnow() - synced_at
    return age.days >= days


async def get_fide_history_cached(user, db) -> list:
    """
    Returns cached FIDE rating history for the given user.
    Calls the FIDE API only when:
      - The cache is empty (first time), OR
      - The cache is older than 30 days (monthly FIDE update cycle)

    When a fresh fetch is performed, saves the result to the DB to avoid
    repeated API calls on subsequent profile loads.
    """
    if not user.fide_id:
        return []

    # Return in-DB cache if it's still fresh
    if not is_cache_stale(user.fide_history_synced_at):
        return user.fide_history_cache or []

    # Cache is missing or expired — fetch from FIDE API
    try:
        fresh_history = await fetch_fide_player_history(user.fide_id)
    except Exception:
        # If the API is down and we have a stale cache, serve the stale cache
        if user.fide_history_cache:
            return user.fide_history_cache
        return []

    # Persist the refreshed history back to the DB
    user.fide_history_cache = fresh_history
    user.fide_history_synced_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(user)

    return fresh_history
