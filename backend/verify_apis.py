import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.external_api import fetch_lichess_rating, fetch_chesstools_rating

async def test_apis():
    print("Testing Lichess API...")
    lichess_rating = await fetch_lichess_rating("thibault") # Founder of Lichess
    print(f"Lichess rating for 'thibault': {lichess_rating}")
    
    print("\nTesting ChessTools API (FIDE)...")
    # Carlsen's FIDE ID
    chesstools_rating = await fetch_chesstools_rating("1503014") 
    print(f"ChessTools (FIDE) rating for '1503014': {chesstools_rating}")

if __name__ == "__main__":
    asyncio.run(test_apis())
