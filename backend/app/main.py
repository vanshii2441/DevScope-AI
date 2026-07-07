from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.api import api_router
from app.core.database import engine
from app.models import Base

# Create tables for development (in production, use Alembic migrations)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="RepoMind AI API",
    description="Backend API for RepoMind AI - Analyze, chat, and understand GitHub repositories.",
    version="0.1.0",
)

# Configure CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://repomind-frontend.onrender.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "RepoMind AI Backend is running healthy."}

app.include_router(api_router, prefix="/api/v1")
