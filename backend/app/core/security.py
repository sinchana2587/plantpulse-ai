import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
import bcrypt
import jwt
from app.core.config import settings

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a stored bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def create_access_token(subject: str | Any, expires_delta: Optional[timedelta] = None, extra_claims: Optional[dict] = None) -> str:
    """Creates a signed JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "iss": "plantpulse-ai-auth"
    }
    if extra_claims:
        to_encode.update(extra_claims)
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], issuer="plantpulse-ai-auth")
        return payload
    except jwt.PyJWTError:
        return None

def generate_otp() -> str:
    """Generates a cryptographically secure 6-digit numeric OTP."""
    # Value between 100000 and 999999 inclusive
    return str(secrets.randbelow(900000) + 100000)

def hash_token(raw_token: str) -> str:
    """Produces SHA-256 hash of a raw OTP or reset token for secure storage."""
    return hashlib.sha256(raw_token.strip().encode("utf-8")).hexdigest()

def generate_reset_token() -> str:
    """Generates a secure 32-byte URL-safe reset token."""
    return secrets.token_urlsafe(32)
