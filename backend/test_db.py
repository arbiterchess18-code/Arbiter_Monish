import sys, os
sys.path.insert(0, os.path.abspath('.'))
from app.database import SessionLocal
from app.models import Tournament, TournamentStaff
from sqlalchemy import or_

db = SessionLocal()

uid = 18
print(f"Tournaments for uid {uid}:")
query = db.query(Tournament).outerjoin(TournamentStaff).filter(
    or_(
        Tournament.created_by == uid,
        TournamentStaff.user_id == uid
    )
).distinct()

results = query.all()
print(f"Count: {len(results)}")

db.close()
