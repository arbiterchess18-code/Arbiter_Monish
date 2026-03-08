import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from database import SessionLocal
from models import Tournament

def test():
    db = SessionLocal()
    tournaments = db.query(Tournament).all()
    for t in tournaments:
        print(f"ID: {t.tournament_id}, Name: {t.tournament_name}, Created By: {t.created_by}")
        print(f"Sub-Arbiters JSON String: '{t.sub_arbiters_json}'")
        print("---")
    db.close()

if __name__ == "__main__":
    test()
