import os
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# app/core/config.py -> core/ -> app/ -> backend/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env file in the backend root
env_path = BASE_DIR / ".env"
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-keep-it-secret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

# Debug: Print first few chars of SECRET_KEY to verify it's loaded (not the whole key!)
if SECRET_KEY == "your-secret-key-keep-it-secret":
    print("⚠️ WARNING: Using default SECRET_KEY. .env might not be loaded correctly.")
else:
    print(f"✅ SECRET_KEY loaded from .env (starting with: {SECRET_KEY[:4]}...)")
