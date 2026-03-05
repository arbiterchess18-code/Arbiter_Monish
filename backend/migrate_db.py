import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

def migrate():
    load_dotenv()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("DATABASE_URL not found in .env file")
        return

    # Handle URL encoding for password if necessary (psycopg2 handles %40 correctly)
    engine = create_engine(database_url)
    
    sql_commands = [
        """
        ALTER TABLE tournaments 
        ADD COLUMN IF NOT EXISTS start_time VARCHAR(20),
        ADD COLUMN IF NOT EXISTS venue_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS state VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country VARCHAR(100),
        ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
        ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255),
        ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS organizer_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS registration_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS entry_fee DECIMAL(10, 2) DEFAULT 0.0,
        ADD COLUMN IF NOT EXISTS pairing_system VARCHAR(50) DEFAULT 'Swiss',
        ADD COLUMN IF NOT EXISTS event_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS time_control VARCHAR(50),
        ADD COLUMN IF NOT EXISTS increment INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS rounds INT DEFAULT 5,
        ADD COLUMN IF NOT EXISTS current_round INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS min_rating INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS fide_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS aicf_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
        """,
        """
        ALTER TABLE tournament_registrations
        ADD COLUMN IF NOT EXISTS current_points DECIMAL(4, 1) DEFAULT 0.0,
        ADD COLUMN IF NOT EXISTS seed INT,
        ADD COLUMN IF NOT EXISTS color_history VARCHAR(255) DEFAULT '',
        ADD COLUMN IF NOT EXISTS bye_received BOOLEAN DEFAULT FALSE;
        """,
        """
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS lichess_username VARCHAR(50),
        ADD COLUMN IF NOT EXISTS lichess_rating INT,
        ADD COLUMN IF NOT EXISTS chesstools_rating INT,
        ADD COLUMN IF NOT EXISTS last_rating_sync TIMESTAMP;
        """
    ]

    with engine.connect() as connection:
        for command in sql_commands:
            try:
                print(f"Executing migration...")
                connection.execute(text(command))
                connection.commit()
                print("Migration step successful.")
            except Exception as e:
                print(f"Error during migration: {e}")

    print("Migration completed.")

if __name__ == "__main__":
    migrate()
