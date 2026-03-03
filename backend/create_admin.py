from app.database import SessionLocal
from app.models import User, Role, UserRole
import bcrypt
import datetime

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def create_super_admin():
    db = SessionLocal()

    roles = ["SUPER_ADMIN", "ADMIN", "ARBITER", "PLAYER"]
    for role_name in roles:
        existing_role = db.query(Role).filter(Role.role_name == role_name).first()
        if not existing_role:
            db.add(Role(role_name=role_name))
    db.commit()

    # 2. Create Support/Admin User
    existing_admin = db.query(User).filter(User.username == "admin").first()

    if existing_admin:
        print("Admin user already exists.")
    else:
        hashed_password = get_password_hash("admin123")
        new_admin = User(
            username="admin",
            email="admin@chessorbiter.com",
            hashed_password=hashed_password,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        # 3. Assign SUPER_ADMIN Role
        super_role = db.query(Role).filter(Role.role_name == "SUPER_ADMIN").first()
        admin_role_link = UserRole(
            user_id=new_admin.user_id,
            role_id=super_role.role_id
        )
        db.add(admin_role_link)
        db.commit()
        print("Super Admin created successfully!")

    db.close()

if __name__ == "__main__":
    create_super_admin()
