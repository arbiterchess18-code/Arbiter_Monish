import sys, os
sys.path.insert(0, os.path.abspath('.'))
from app.database import SessionLocal
from app.models import TournamentStaff

db = SessionLocal()

# Assign user 18 to tournament 14
new_staff = TournamentStaff(
    tournament_id=14,
    user_id=18,
    role_title="Deputy Chief Arbiter",
    fide_id=""
)
db.add(new_staff)
db.commit()

print("User 18 assigned to Tournament 14")
db.close()
