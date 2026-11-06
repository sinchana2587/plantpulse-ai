from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    preferred_language: str = Field(default="en")
    voice_enabled: bool = Field(default=True)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    preferred_language: Optional[str] = None
    voice_enabled: Optional[bool] = None
    avatar_url: Optional[str] = None

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: str
    is_verified: bool
    is_active: bool
    role: str
    avatar_url: Optional[str] = None
    preferred_language: str
    voice_enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
