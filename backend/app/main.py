import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .core.limiter import limiter
from .api.v1.endpoints import auth, tournaments, registrations, pairings, notifications
from .database import engine, Base

# Load .env explicitly here so ALLOWED_ORIGINS is available before middleware setup
_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_BASE_DIR / ".env")

# Create tables
Base.metadata.create_all(bind=engine)

# Rate limiter — keyed by client IP (defined in core/limiter.py to avoid circular imports)

app = FastAPI(
    title="Chess Orbiter API",
    version="1.1.0",
    strict_slashes=False,
    # Hide docs in production — set HIDE_DOCS=true in .env
    docs_url=None if os.getenv("HIDE_DOCS", "false").lower() == "true" else "/docs",
    redoc_url=None if os.getenv("HIDE_DOCS", "false").lower() == "true" else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Read allowed origins from env — comma-separated list
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Include Routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["Tournaments"])
app.include_router(registrations.router, prefix="/tournaments", tags=["Registrations"])
app.include_router(pairings.router, prefix="/tournaments", tags=["Pairings"])
app.include_router(notifications.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Chess Orbiter Modular API"}

if __name__ == "__main__":
    import uvicorn
    # reload=True is for development only — use gunicorn/uvicorn workers in production
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
