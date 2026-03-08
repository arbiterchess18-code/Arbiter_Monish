import os
import sys

from app.database import engine
from sqlalchemy import text

def migrate():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE tournaments ADD COLUMN sub_arbiters TEXT DEFAULT '[]';"))
            conn.commit()
            print("Successfully added sub_arbiters column!")
    except Exception as e:
        print(f"Migration error (might already exist): {e}")

if __name__ == "__main__":
    migrate()
