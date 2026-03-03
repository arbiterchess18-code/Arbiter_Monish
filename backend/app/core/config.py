import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# app/core/config.py -> core/ -> app/ -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env file in the backend root
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

# Hard fail at startup if SECRET_KEY is missing — never use a default in production
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "FATAL: SECRET_KEY environment variable is not set. "
        "Add it to your .env file before starting the server."
    )

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

print(f"✅ SECRET_KEY loaded (starting with: {SECRET_KEY[:4]}...)")
