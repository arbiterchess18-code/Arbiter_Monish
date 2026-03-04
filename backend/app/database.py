from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Base directory setup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./chess_orbiter.db")

# For SQLite, we need to allow multithreading
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine_kwargs = {"connect_args": connect_args}
if getattr(DATABASE_URL, "startswith", lambda x: False)("postgresql"):
    engine_kwargs["pool_pre_ping"] = True
    engine_kwargs["pool_recycle"] = 300  # Recycle connections after 5 minutes
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
elif DATABASE_URL.startswith("sqlite"):
    pass # SQLite defaults are fine for development

engine = create_engine(DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
