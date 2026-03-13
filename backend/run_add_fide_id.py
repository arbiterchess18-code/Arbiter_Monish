import os
import sys

# Add the backend directory to sys.path so we can import app
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

def migrate():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE tournament_registrations ADD COLUMN fide_id VARCHAR(20);"))
            conn.commit()
            print("Successfully added fide_id column to tournament_registrations!")
    except Exception as e:
        print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    migrate()
