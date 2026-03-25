from .api.v1.endpoints import users as users_router
import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from . import models
from .core.limiter import limiter
from .api.v1.endpoints import auth, tournaments, registrations, pairings, notifications, leaderboard
from .database import engine, Base

# Load .env explicitly here so ALLOWED_ORIGINS is available before middleware setup
_BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(dotenv_path=_BASE_DIR / ".env")

# Create tables — wrapped so the server starts even if DB is temporarily unreachable
try:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as conn:
        dialect_name = conn.dialect.name
        if dialect_name == "postgresql":
            conn.execute(text(
                "ALTER TABLE tournament_registrations ALTER COLUMN color_history TYPE TEXT"))
        elif dialect_name in {"mysql", "mariadb"}:
            conn.execute(text(
                "ALTER TABLE tournament_registrations MODIFY COLUMN color_history LONGTEXT"))
        elif dialect_name == "sqlite":
            # SQLite does not enforce VARCHAR length strictly, so no table rewrite is needed.
            pass

    # Ensure all required roles exist
    from sqlalchemy.orm import Session
    db = Session(engine)
    required_roles = ["SUPER_ADMIN", "ADMIN",
                      "ARBITER", "ORGANIZATION", "PLAYER"]
    for role_name in required_roles:
        existing_role = db.query(models.Role).filter(
            models.Role.role_name == role_name
        ).first()
        if not existing_role:
            db.add(models.Role(role_name=role_name,
                   description=f"{role_name} role"))
            db.commit()
    db.close()
except Exception as _db_err:
    import warnings
    warnings.warn(
        f"Could not connect to database at startup: {_db_err}", stacklevel=1)

# Rate limiter — keyed by client IP (defined in core/limiter.py to avoid circular imports)

app = FastAPI(
    title="Chaduranga API",
    version="1.1.0",
    strict_slashes=False,
    # Hide docs in production — set HIDE_DOCS=true in .env
    docs_url=None if os.getenv(
        "HIDE_DOCS", "false").lower() == "true" else "/docs",
    redoc_url=None if os.getenv(
        "HIDE_DOCS", "false").lower() == "true" else "/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Read allowed origins from env — comma-separated list
_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
ALLOWED_ORIGINS = [o.strip() for o in _raw_origins.split(",") if o.strip()]

DEFAULT_LOCAL_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:8080",
    "http://localhost:8081",
    "http://localhost:8082",
    "http://localhost:8083",
    "http://localhost:8084",
    "http://localhost:8085",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:8081",
    "http://127.0.0.1:8082",
    "http://127.0.0.1:8083",
    "http://127.0.0.1:8084",
    "http://127.0.0.1:8085",
]

for origin in DEFAULT_LOCAL_ORIGINS:
    if origin not in ALLOWED_ORIGINS:
        ALLOWED_ORIGINS.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_cache_control_header(request: Request, call_next):
    origin = request.headers.get("origin", "")
    is_local_origin = origin.startswith(
        "http://localhost:") or origin.startswith("http://127.0.0.1:")

    def apply_cors_headers(response: Response) -> Response:
        if is_local_origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = request.headers.get(
                "access-control-request-headers",
                "Authorization, Content-Type, Accept, Origin",
            )
            response.headers["Vary"] = "Origin"
        return response

    # Force CORS preflight support for local dev origins.
    if request.method == "OPTIONS" and is_local_origin:
        response = Response(status_code=204)
        return apply_cors_headers(response)

    try:
        response = await call_next(request)
    except Exception as exc:
        response = JSONResponse(
            status_code=500,
            content={"detail": f"Internal server error: {type(exc).__name__}"},
        )

    response = apply_cors_headers(response)

    if request.url.path.startswith("/users") or request.url.path.startswith("/api/v1/users"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    return response

# Include Routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(users_router.router, prefix="/users", tags=["Users"])
app.include_router(tournaments.router,
                   prefix="/tournaments", tags=["Tournaments"])
app.include_router(registrations.router,
                   prefix="/tournaments", tags=["Registrations"])
app.include_router(pairings.router, prefix="/tournaments", tags=["Pairings"])
app.include_router(notifications.router)
app.include_router(leaderboard.router,
                   prefix="/api/v1/leaderboard", tags=["Leaderboard"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Chaduranga Modular API"}

if __name__ == "__main__":
    import uvicorn
    # reload=True is for development only — use gunicorn/uvicorn workers in production
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
