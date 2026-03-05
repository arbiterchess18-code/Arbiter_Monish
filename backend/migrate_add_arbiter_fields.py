"""
Migration script to add arbiter-specific fields to the users table
Run this script once to add the new columns to the database
"""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import text, create_engine

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL env variable is not set")

# Create engine
engine = create_engine(DATABASE_URL)

# SQL statements to add new columns
migration_sql = """
-- Add arbiter-specific fields to users table if they don't exist
DO $$
BEGIN
    -- Add title column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='title') THEN
        ALTER TABLE users ADD COLUMN title VARCHAR(100);
    END IF;
    
    -- Add location column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='location') THEN
        ALTER TABLE users ADD COLUMN location VARCHAR(255);
    END IF;
    
    -- Add phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='phone') THEN
        ALTER TABLE users ADD COLUMN phone VARCHAR(20);
    END IF;
    
    -- Add bio column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT;
    END IF;
    
    -- Add experience_years column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='experience_years') THEN
        ALTER TABLE users ADD COLUMN experience_years VARCHAR(50);
    END IF;
    
    -- Add specializations column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='specializations') THEN
        ALTER TABLE users ADD COLUMN specializations JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add is_verified column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_verified') THEN
        ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT false;
    END IF;
    
    -- Add tournaments_conducted column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='tournaments_conducted') THEN
        ALTER TABLE users ADD COLUMN tournaments_conducted INTEGER DEFAULT 0;
    END IF;
    
    -- Add availability column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='availability') THEN
        ALTER TABLE users ADD COLUMN availability VARCHAR(255) DEFAULT 'Year-round';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully';
END $$;
"""

try:
    with engine.connect() as connection:
        # Split and execute each statement
        connection.execute(text(migration_sql))
        connection.commit()
    print("✓ Migration completed successfully!")
    print("✓ All arbiter-specific fields added to users table")
except Exception as e:
    print(f"✗ Migration failed: {e}")
    raise
finally:
    engine.dispose()
