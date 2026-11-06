import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "PlantPulse AI"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    BASE_DIR: Path = BASE_DIR
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/data/plantpulse.db"
    
    # Security & Auth
    SECRET_KEY: str = "plantpulse-secret-key-agri-secure-token-2026-prod"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    OTP_EXPIRE_MINUTES: int = 10
    PASSWORD_RESET_EXPIRE_MINUTES: int = 30

    # Email SMTP (Gmail)
    EMAIL_HOST: str = "smtp.gmail.com"
    EMAIL_PORT: int = 587
    EMAIL_USER: str = ""
    EMAIL_PASS: str = ""
    EMAIL_FROM: str = ""

    # Google OAuth 2.0
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:5173/auth/google/callback"

    # Gemini / AI
    GEMINI_API_KEY: str | None = None
    
    # Storage
    STORAGE_DIR: str = str(BASE_DIR / "data" / "uploads")
    MODELS_DIR: str = str(BASE_DIR / "data" / "models")
    SEED_DATA_DIR: str = str(BASE_DIR / "data" / "seed_data")
    
    # Image constraints
    MAX_IMAGE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_IMAGE_TYPES: list[str] = ["image/jpeg", "image/png", "image/webp"]
    ALLOWED_IMAGE_EXTENSIONS: list[str] = [".jpg", ".jpeg", ".png", ".webp"]
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure directories exist safely
Path(settings.STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.MODELS_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.SEED_DATA_DIR).mkdir(parents=True, exist_ok=True)
