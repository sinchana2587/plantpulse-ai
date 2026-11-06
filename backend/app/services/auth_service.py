import re
import urllib.parse
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import requests
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_otp,
    hash_token,
    generate_reset_token,
)
from app.models.user import User, EmailVerificationOTP, PasswordResetToken, OAuthAccount
from app.schemas.auth import (
    SignUpRequest,
    VerifyEmailRequest,
    LoginRequest,
    GoogleLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    TokenResponse,
    AuthMessageResponse,
)
from app.schemas.user import UserResponse, UserUpdate, PasswordChangeRequest
from app.services.email_service import EmailService

class AuthService:

    @staticmethod
    def _validate_password_strength(password: str):
        if len(password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters in length."
            )
        if not re.search(r"\d", password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one numeric digit."
            )
        if not re.search(r"[a-zA-Z]", password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must contain at least one alphabetic letter."
            )

    @classmethod
    def signup(cls, db: Session, signup_in: SignUpRequest) -> AuthMessageResponse:
        """
        Registers a new user, hashes password, generates secure 6-digit OTP,
        and dispatches verification email.
        """
        if not signup_in.terms_accepted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You must accept the Terms and Conditions to register."
            )

        confirm_pwd = signup_in.confirm_password or signup_in.password
        if signup_in.password != confirm_pwd:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and confirmation password do not match."
            )

        cls._validate_password_strength(signup_in.password)

        email_clean = signup_in.email.strip().lower()
        full_name_clean = signup_in.full_name.strip() if signup_in.full_name and signup_in.full_name.strip() else email_clean.split("@")[0]
        pref_lang = signup_in.preferred_language if hasattr(signup_in, "preferred_language") and signup_in.preferred_language else "en"
        existing_user = db.query(User).filter(User.email == email_clean).first()

        if existing_user and existing_user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists. Please log in."
            )

        hashed_pwd = hash_password(signup_in.password)

        if existing_user and not existing_user.is_verified:
            # Update unverified record with new details
            user = existing_user
            user.full_name = full_name_clean
            user.hashed_password = hashed_pwd
            user.preferred_language = pref_lang
        else:
            user = User(
                full_name=full_name_clean,
                email=email_clean,
                hashed_password=hashed_pwd,
                is_verified=False,
                is_active=True,
                role="farmer",
                preferred_language=pref_lang,
                voice_enabled=True
            )
            db.add(user)
            db.flush()

        # Invalidate previous unexpired OTPs for this user
        db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.is_used == False
        ).update({"is_used": True})

        # Generate 6-digit OTP
        raw_otp = generate_otp()
        otp_hash = hash_token(raw_otp)
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        resend_after = now + timedelta(seconds=60)

        otp_record = EmailVerificationOTP(
            user_id=user.id,
            otp_hash=otp_hash,
            expires_at=expires_at,
            resend_available_at=resend_after,
            attempts=0,
            is_used=False
        )
        db.add(otp_record)
        db.commit()

        # Dispatch real email via Gmail SMTP
        EmailService.send_verification_otp(to_email=user.email, recipient_name=user.full_name, otp=raw_otp)

        return AuthMessageResponse(
            message=f"Registration successful. A 6-digit verification code has been dispatched to {user.email}.",
            email=user.email,
            status="success",
            requires_verification=True
        )

    @classmethod
    def verify_email(cls, db: Session, verify_in: VerifyEmailRequest) -> AuthMessageResponse:
        """
        Verifies the user's email with a valid, unexpired 6-digit OTP.
        Does NOT automatically log the user in; directs them to the Login screen.
        """
        email_clean = verify_in.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account associated with this email address was found."
            )

        if user.is_verified:
            return AuthMessageResponse(
                message="Account email is already verified. Please sign in.",
                email=user.email,
                status="success",
                requires_verification=False
            )

        now = datetime.utcnow()
        otp_record = (
            db.query(EmailVerificationOTP)
            .filter(
                EmailVerificationOTP.user_id == user.id,
                EmailVerificationOTP.is_used == False,
                EmailVerificationOTP.expires_at > now
            )
            .order_by(EmailVerificationOTP.created_at.desc())
            .first()
        )

        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired or was not found. Please request a new code."
            )

        # Enforce rate limit / attempts limit (max 5 incorrect attempts)
        if otp_record.attempts >= 5:
            otp_record.is_used = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect verification attempts. Please request a new verification code."
            )

        submitted_otp = (verify_in.otp or verify_in.otp_code or "").strip()
        if not submitted_otp or len(submitted_otp) != 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please provide a valid 6-digit verification OTP code."
            )

        submitted_hash = hash_token(submitted_otp)
        if submitted_hash != otp_record.otp_hash:
            otp_record.attempts += 1
            db.commit()
            remaining = 5 - otp_record.attempts
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification code. {remaining} attempt(s) remaining."
            )

        # OTP is valid!
        otp_record.is_used = True
        user.is_verified = True
        user.updated_at = datetime.utcnow()
        db.commit()

        return AuthMessageResponse(
            message="Email verified successfully. You may now log in.",
            email=user.email,
            status="success",
            requires_verification=False
        )

    @classmethod
    def resend_otp(cls, db: Session, email: str) -> AuthMessageResponse:
        """
        Resends a fresh 6-digit OTP subject to a 60-second cooldown period.
        """
        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account associated with this email address exists."
            )

        if user.is_verified:
            return AuthMessageResponse(
                message="Account email is already verified. Please sign in.",
                email=user.email,
                status="success"
            )

        now = datetime.utcnow()
        last_otp = (
            db.query(EmailVerificationOTP)
            .filter(EmailVerificationOTP.user_id == user.id)
            .order_by(EmailVerificationOTP.created_at.desc())
            .first()
        )

        if last_otp and last_otp.resend_available_at > now:
            wait_seconds = int((last_otp.resend_available_at - now).total_seconds())
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Please wait {wait_seconds} second(s) before requesting another verification code."
            )

        # Invalidate old OTPs
        db.query(EmailVerificationOTP).filter(
            EmailVerificationOTP.user_id == user.id,
            EmailVerificationOTP.is_used == False
        ).update({"is_used": True})

        raw_otp = generate_otp()
        otp_hash = hash_token(raw_otp)
        expires_at = now + timedelta(minutes=settings.OTP_EXPIRE_MINUTES)
        resend_after = now + timedelta(seconds=60)

        new_otp_record = EmailVerificationOTP(
            user_id=user.id,
            otp_hash=otp_hash,
            expires_at=expires_at,
            resend_available_at=resend_after,
            attempts=0,
            is_used=False
        )
        db.add(new_otp_record)
        db.commit()

        EmailService.send_verification_otp(to_email=user.email, recipient_name=user.full_name, otp=raw_otp)

        return AuthMessageResponse(
            message=f"A fresh verification code has been dispatched to {user.email}.",
            email=user.email,
            status="success",
            requires_verification=True
        )

    @classmethod
    def login(cls, db: Session, login_in: LoginRequest) -> TokenResponse:
        """
        Authenticates with email and password. Rejects unverified accounts with 403 Forbidden.
        """
        email_clean = login_in.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()

        if not user or not user.hashed_password:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password credentials."
            )

        if not verify_password(login_in.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password credentials."
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated. Please contact support."
            )

        if not user.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has not been verified yet. Please enter the 6-digit OTP sent to your email.",
                headers={"X-Requires-Verification": "true", "X-User-Email": user.email}
            )

        token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role, "lang": user.preferred_language}
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    @classmethod
    def google_login(cls, db: Session, google_in: GoogleLoginRequest) -> TokenResponse:
        """
        Authenticates via Google OAuth 2.0. Supports both ID Token verification and Auth Code exchange.
        """
        email: Optional[str] = None
        full_name: Optional[str] = None
        sub: Optional[str] = None
        avatar: Optional[str] = None

        if google_in.id_token:
            # Direct ID token verification
            try:
                id_info = id_token.verify_oauth2_token(
                    google_in.id_token,
                    google_requests.Request(),
                    settings.GOOGLE_CLIENT_ID
                )
                if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                    raise ValueError("Untrusted Google token issuer.")
                email = id_info.get("email")
                full_name = id_info.get("name") or "Google User"
                sub = id_info.get("sub")
                avatar = id_info.get("picture")
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Google token verification failed: {str(e)}"
                )
        elif google_in.code:
            # Authorization Code Exchange
            token_endpoint = "https://oauth2.googleapis.com/token"
            redirect_uri = google_in.redirect_uri or settings.GOOGLE_REDIRECT_URI
            data = {
                "code": google_in.code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
            resp = requests.post(token_endpoint, data=data, timeout=10)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Google code exchange failed: {resp.text}"
                )
            tokens = resp.json()
            raw_id_token = tokens.get("id_token")
            if not raw_id_token:
                raise HTTPException(status_code=401, detail="Google did not return an id_token.")
            
            try:
                id_info = id_token.verify_oauth2_token(
                    raw_id_token,
                    google_requests.Request(),
                    settings.GOOGLE_CLIENT_ID
                )
                email = id_info.get("email")
                full_name = id_info.get("name") or "Google User"
                sub = id_info.get("sub")
                avatar = id_info.get("picture")
            except Exception as e:
                raise HTTPException(status_code=401, detail=f"Google token verification failed: {str(e)}")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either an id_token or an authorization code must be supplied for Google Sign-In."
            )

        if not email or not sub:
            raise HTTPException(status_code=400, detail="Google profile is missing verified email address.")

        email_clean = email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()

        if not user:
            # Create user automatically verified via Google's trusted identity
            user = User(
                full_name=full_name or "Google User",
                email=email_clean,
                hashed_password=None,
                is_verified=True,
                is_active=True,
                role="farmer",
                avatar_url=avatar,
                preferred_language="en",
                voice_enabled=True
            )
            db.add(user)
            db.flush()
        else:
            # Update user info if verified by Google
            user.is_verified = True
            if avatar and not user.avatar_url:
                user.avatar_url = avatar

        # Link OAuth Account
        oauth_rec = db.query(OAuthAccount).filter(
            OAuthAccount.user_id == user.id,
            OAuthAccount.provider == "google"
        ).first()

        if not oauth_rec:
            oauth_rec = OAuthAccount(
                user_id=user.id,
                provider="google",
                provider_user_id=sub,
                provider_email=email_clean
            )
            db.add(oauth_rec)

        db.commit()

        token = create_access_token(
            subject=user.id,
            extra_claims={"email": user.email, "role": user.role, "lang": user.preferred_language}
        )

        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user)
        )

    @classmethod
    def forgot_password(cls, db: Session, forgot_in: ForgotPasswordRequest, origin_url: Optional[str] = None) -> AuthMessageResponse:
        """
        Generates a secure password reset link and sends it via email.
        Always returns generic success to protect against user enumeration attacks.
        """
        email_clean = forgot_in.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()

        if user and user.is_active:
            # Invalidate older active reset tokens
            db.query(PasswordResetToken).filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.is_used == False
            ).update({"is_used": True})

            raw_token = generate_reset_token()
            token_h = hash_token(raw_token)
            now = datetime.utcnow()
            expires_at = now + timedelta(minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES)

            reset_record = PasswordResetToken(
                user_id=user.id,
                token_hash=token_h,
                expires_at=expires_at,
                is_used=False
            )
            db.add(reset_record)
            db.commit()

            try:
                EmailService.send_password_reset_email(
                    to_email=user.email,
                    recipient_name=user.full_name,
                    reset_token=raw_token,
                    origin_url=origin_url
                )
            except Exception:
                pass  # Keep response generic even on SMTP transient errors

        return AuthMessageResponse(
            message="If an account is associated with this email address, a password reset link has been dispatched.",
            email=email_clean,
            status="success"
        )

    @classmethod
    def reset_password(cls, db: Session, reset_in: ResetPasswordRequest) -> AuthMessageResponse:
        """
        Validates token and updates user password securely.
        """
        if reset_in.new_password != reset_in.confirm_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password and confirmation password do not match."
            )

        cls._validate_password_strength(reset_in.new_password)

        email_clean = reset_in.email.strip().lower()
        user = db.query(User).filter(User.email == email_clean).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid or expired password reset link.")

        submitted_hash = hash_token(reset_in.token)
        now = datetime.utcnow()

        token_record = (
            db.query(PasswordResetToken)
            .filter(
                PasswordResetToken.user_id == user.id,
                PasswordResetToken.token_hash == submitted_hash,
                PasswordResetToken.is_used == False,
                PasswordResetToken.expires_at > now
            )
            .first()
        )

        if not token_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset link is invalid or has expired. Please request a new one."
            )

        token_record.is_used = True
        user.hashed_password = hash_password(reset_in.new_password)
        user.is_verified = True  # Verified via ownership of reset email
        user.updated_at = datetime.utcnow()
        db.commit()

        return AuthMessageResponse(
            message="Password has been reset successfully. You may now log in with your new password.",
            email=user.email,
            status="success"
        )

    @classmethod
    def change_password(cls, db: Session, user: User, change_in: PasswordChangeRequest) -> AuthMessageResponse:
        """Allows an authenticated user to change their password."""
        if user.hashed_password and not verify_password(change_in.current_password, user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect current password entered.")

        if change_in.new_password != change_in.confirm_password:
            raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

        cls._validate_password_strength(change_in.new_password)

        user.hashed_password = hash_password(change_in.new_password)
        user.updated_at = datetime.utcnow()
        db.commit()

        return AuthMessageResponse(message="Password changed successfully.", status="success")

    @classmethod
    def update_profile(cls, db: Session, user: User, update_in: UserUpdate) -> UserResponse:
        """Updates user profile and preferences."""
        if update_in.full_name is not None:
            user.full_name = update_in.full_name.strip()
        if update_in.preferred_language is not None:
            user.preferred_language = update_in.preferred_language
        if update_in.voice_enabled is not None:
            user.voice_enabled = update_in.voice_enabled
        if update_in.avatar_url is not None:
            user.avatar_url = update_in.avatar_url

        user.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(user)
        return UserResponse.model_validate(user)
