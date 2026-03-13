import httpx
from fastapi import HTTPException

async def fetch_fide_player_info(fide_id: str) -> dict:
    """Fetches player info from the external FIDE API."""
    url = f"https://fide-api.vercel.app/player_info/?fide_id={fide_id}"
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="FIDE ID not found or API down")
            
        return response.json()
