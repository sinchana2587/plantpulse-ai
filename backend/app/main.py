import os
from pathlib import Path
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.db.session import engine, Base
from app.models.plant import Plant
from app.models import user, plant, observation, forecast, telemetry
from app.api.v1.api import api_router
from app.db.session import SessionLocal
from app.services.demo_service import DemoService

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-Based Plant Growth Stage & Development Prediction Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploaded and seed photographs safely
uploads_dir = Path(settings.STORAGE_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

disease_datasets_dir = Path(settings.BASE_DIR) / "data" / "disease_datasets"
disease_datasets_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/disease_datasets", StaticFiles(directory=str(disease_datasets_dir)), name="disease_datasets")

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "InternalServerError",
            "message": "An unexpected error occurred while processing the request.",
            "detail": str(exc) if os.getenv("ENVIRONMENT") == "development" else "Internal system fault"
        }
    )

# Health endpoint
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "connected"
    }

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Automatically seed initial demonstration plant on startup if database is empty
@app.on_event("startup")
def startup_event():
    # Ensure SQLite schema migrations are applied
    try:
        with engine.connect() as conn:
            cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(plants)").fetchall()]
            if cols and "user_id" not in cols:
                conn.exec_driver_sql("ALTER TABLE plants ADD COLUMN user_id VARCHAR(36) REFERENCES users(id)")
                conn.commit()
    except Exception as e:
        print(f"[Startup Migration] Notice: {e}")

    db = SessionLocal()
    try:
        plant_count = db.query(Plant).count()
        if plant_count == 0:
            print("[Startup] Seeding initial demonstration tomato plant...")
            DemoService.seed_demo_data(db)
    finally:
        db.close()
