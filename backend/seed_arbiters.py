import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure we load the environment correctly
_BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=_BASE_DIR / ".env")

from app.database import SessionLocal, engine
from app import models
from app.core.arbiters import VALID_ARBITERS
from sqlalchemy.exc import IntegrityError

models.Base.metadata.create_all(bind=engine)

def seed_arbiters():
    db = SessionLocal()
    try:
        added_count = 0
        for fide_id in VALID_ARBITERS:
            # Check if it already exists
            existing = db.query(models.VerifiedArbiter).filter(models.VerifiedArbiter.fide_id == fide_id).first()
            if not existing:
                new_arbiter = models.VerifiedArbiter(fide_id=fide_id)
                db.add(new_arbiter)
                added_count += 1
        
        db.commit()
        print(f"Successfully seeded {added_count} new arbiters into the database!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding arbiters: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_arbiters()
