from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.schemas.user import UserResponse

class SignUpRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8)
    confirm_password: Optional[str] = None
    terms_accepted: bool = Field(default=True)
    preferred_language: Optional[str] = Field("en", max_length=10)

class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: Optional[str] = None
    otp_code: Optional[str] = None

class ResendOTPRequest(BaseModel):
    email: EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class GoogleLoginRequest(BaseModel):
    id_token: Optional[str] = None
    code: Optional[str] = None
    redirect_uri: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class AuthMessageResponse(BaseModel):
    message: str
    email: Optional[str] = None
    status: str = "success"
    requires_verification: bool = False
