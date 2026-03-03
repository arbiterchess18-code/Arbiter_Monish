from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from .api.v1.endpoints import auth, tournaments, registrations, pairings
from .database import engine, Base

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chess Orbiter API",
    version="1.1.0",
    strict_slashes=False
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, tags=["Authentication"])
app.include_router(tournaments.router, prefix="/tournaments", tags=["Tournaments"])
app.include_router(registrations.router, prefix="/tournaments", tags=["Registrations"])
app.include_router(pairings.router, prefix="/tournaments", tags=["Pairings"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Chess Orbiter Modular API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
