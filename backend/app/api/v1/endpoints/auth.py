from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    SignUpRequest,
    VerifyEmailRequest,
    ResendOTPRequest,
    LoginRequest,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    AuthMessageResponse,
)
from app.schemas.user import UserResponse, UserUpdate, PasswordChangeRequest
from app.services.auth_service import AuthService

router = APIRouter()

@router.post("/signup", response_model=AuthMessageResponse, status_code=status.HTTP_201_CREATED)
def sign_up(signup_in: SignUpRequest, db: Session = Depends(get_db)):
    """
    Registers a new farmer account and dispatches an authentic 6-digit OTP to their email.
    """
    return AuthService.signup(db, signup_in)

@router.post("/verify-email", response_model=AuthMessageResponse)
def verify_email(verify_in: VerifyEmailRequest, db: Session = Depends(get_db)):
    """
    Verifies user's email using the 6-digit OTP. Directs the user to the Login page.
    """
    return AuthService.verify_email(db, verify_in)

@router.post("/resend-otp", response_model=AuthMessageResponse)
def resend_otp(resend_in: ResendOTPRequest, db: Session = Depends(get_db)):
    """
    Resends a fresh 6-digit verification code, enforcing a 60-second cooldown period.
    """
    return AuthService.resend_otp(db, resend_in.email)

@router.post("/login", response_model=TokenResponse)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a verified user with email and password, issuing a JWT access token.
    """
    return AuthService.login(db, login_in)

@router.post("/google", response_model=TokenResponse)
def google_sign_in(google_in: GoogleLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates or creates a user account via verified Google OAuth 2.0 identity.
    """
    return AuthService.google_login(db, google_in)

@router.post("/forgot-password", response_model=AuthMessageResponse)
def forgot_password(forgot_in: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """
    Initiates the password reset workflow by dispatching a single-use token link to the user's email.
    """
    origin = request.headers.get("origin")
    return AuthService.forgot_password(db, forgot_in, origin_url=origin)

@router.post("/reset-password", response_model=AuthMessageResponse)
def reset_password(reset_in: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Validates the password reset token and securely updates the user's password.
    """
    return AuthService.reset_password(db, reset_in)

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the profile and personal settings of the currently authenticated user.
    """
    return UserResponse.model_validate(current_user)

@router.put("/profile", response_model=UserResponse)
def update_profile(
    update_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Updates the authenticated user's preferences, language selection, or display name.
    """
    return AuthService.update_profile(db, current_user, update_in)

@router.put("/change-password", response_model=AuthMessageResponse)
def change_password(
    change_in: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Securely changes the authenticated user's password after validating current password.
    """
    return AuthService.change_password(db, current_user, change_in)

@router.post("/logout", response_model=AuthMessageResponse)
def logout(current_user: User = Depends(get_current_user)):
    """
    Invalidates client session.
    """
    return AuthMessageResponse(message="Logged out successfully.", status="success")
