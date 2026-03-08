import sys, os
sys.path.insert(0, os.path.abspath('.'))
from app.database import SessionLocal
from app.models import Tournament, TournamentStaff, User
from app.core.security import is_tournament_staff_or_admin

db = SessionLocal()

# Get tournament 14 "Chess Arena Masters 2000"
t = db.query(Tournament).filter(Tournament.tournament_id == 14).first()
# Get sub arbiter user
u = db.query(User).filter(User.user_id == 18).first() # chessarena01

print("Tournament:", t.tournament_name)
print("Staff:", [s.user_id for s in t.staff])
print("Is Staff or Admin (uid 18):", is_tournament_staff_or_admin(t, u))

db.close()
