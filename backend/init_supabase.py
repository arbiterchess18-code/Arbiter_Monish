from app.database import engine, Base
from app.models import Role, User
from sqlalchemy import inspect
from sqlalchemy.orm import Session

def verify_and_init():
    print("Verifying schema on Supabase...")
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables found: {', '.join(tables)}")
    
    required = ["users", "roles", "tournaments", "tournament_registrations"]
    missing = [t for t in required if t not in tables]
    
    if missing:
        print(f"⚠️ Missing tables: {', '.join(missing)}. Attempting to create...")
        Base.metadata.create_all(bind=engine)
        print("✅ create_all() executed.")
    else:
        print("✅ All core tables present.")

    # Check if Roles exist
    db = Session(engine)
    role_count = db.query(Role).count()
    if role_count == 0:
        print("⚠️ Roles table is empty. Initializing roles...")
        roles = ["SUPER_ADMIN", "ADMIN", "ARBITER", "PLAYER"]
        for role_name in roles:
            db.add(Role(role_name=role_name))
        db.commit()
        print("✅ Roles initialized.")
    else:
        print(f"✅ Found {role_count} roles.")
    db.close()

if __name__ == "__main__":
    verify_and_init()
