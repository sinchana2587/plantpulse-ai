import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from fastapi import HTTPException, status
from app.core.config import settings

class EmailService:
    @classmethod
    def _create_smtp_connection(cls) -> smtplib.SMTP:
        """Establishes and authenticates a secure TLS SMTP connection."""
        if not settings.EMAIL_USER or not settings.EMAIL_PASS:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="SMTP email service credentials are not configured on the server."
            )
        try:
            # Connect to SMTP Host with TLS
            server = smtplib.SMTP(settings.EMAIL_HOST, settings.EMAIL_PORT, timeout=15)
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(settings.EMAIL_USER, settings.EMAIL_PASS)
            return server
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"SMTP mail server connection failed: {str(e)}"
            )

    @classmethod
    def send_verification_otp(cls, to_email: str, recipient_name: str, otp: str) -> bool:
        """
        Sends an authentic 6-digit email verification code in a professional PlantPulse branded HTML email.
        """
        subject = f"{otp} is your PlantPulse AI Email Verification Code"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .header {{ background: linear-gradient(135deg, #14532d, #15803d); padding: 32px 24px; text-align: center; color: #ffffff; }}
            .logo {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
            .logo span {{ color: #86efac; }}
            .subtitle {{ font-size: 13px; opacity: 0.9; margin-top: 4px; }}
            .content {{ padding: 32px 24px; }}
            .greeting {{ font-size: 16px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
            .otp-box {{ background-color: #f0fdf4; border: 2px dashed #86efac; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
            .otp-code {{ font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #166534; margin: 0; }}
            .otp-expiry {{ font-size: 12px; color: #15803d; margin-top: 8px; font-weight: 500; }}
            .notice {{ font-size: 12px; color: #64748b; background-color: #f8fafc; border-radius: 8px; padding: 12px; margin-top: 24px; border-left: 3px solid #cbd5e1; }}
            .footer {{ background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PlantPulse <span>AI</span></div>
              <div class="subtitle">Agricultural Intelligence & Growth Prediction Platform</div>
            </div>
            <div class="content">
              <div class="greeting">Hello {recipient_name},</div>
              <div class="text">
                Thank you for registering with <strong>PlantPulse AI</strong>. To activate your account and access your personal agricultural dashboard, please verify your email address using the one-time verification code below:
              </div>
              <div class="otp-box">
                <div class="otp-code">{otp}</div>
                <div class="otp-expiry">This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes</div>
              </div>
              <div class="text">
                Enter this 6-digit code on the verification screen to complete your registration. Once verified, you will be directed to the login page to securely sign in.
              </div>
              <div class="notice">
                <strong>Security Reminder:</strong> PlantPulse AI will never request your password or verification code outside our official portal. If you did not request this account, you can safely ignore this email.
              </div>
            </div>
            <div class="footer">
              &copy; 2026 PlantPulse AI Platform. Precision Agronomy & Predictive Phenology.
            </div>
          </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"PlantPulse AI <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(f"Your PlantPulse AI verification code is: {otp}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.", "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = cls._create_smtp_connection()
        try:
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to transmit email to recipient: {str(e)}"
            )
        finally:
            try:
                server.quit()
            except Exception:
                pass

    @classmethod
    def send_password_reset_email(cls, to_email: str, recipient_name: str, reset_token: str, origin_url: Optional[str] = None) -> bool:
        """
        Sends a secure password reset link to the registered user.
        """
        base_url = origin_url or "http://localhost:5173"
        reset_link = f"{base_url}/auth/reset-password?token={reset_token}&email={to_email}"
        subject = "Reset Your PlantPulse AI Account Password"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #14532d, #15803d); padding: 32px 24px; text-align: center; color: #ffffff; }}
            .logo {{ font-size: 24px; font-weight: 800; }}
            .logo span {{ color: #86efac; }}
            .content {{ padding: 32px 24px; }}
            .greeting {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; }}
            .text {{ font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }}
            .btn-box {{ text-align: center; margin: 28px 0; }}
            .btn {{ display: inline-block; background-color: #15803d; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px; }}
            .notice {{ font-size: 12px; color: #64748b; background-color: #f8fafc; border-radius: 8px; padding: 12px; border-left: 3px solid #cbd5e1; }}
            .footer {{ background-color: #f8fafc; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">PlantPulse <span>AI</span></div>
            </div>
            <div class="content">
              <div class="greeting">Hello {recipient_name},</div>
              <div class="text">
                We received a request to reset the password for your PlantPulse AI account. Click the button below to choose a new password:
              </div>
              <div class="btn-box">
                <a href="{reset_link}" class="btn" style="color: #ffffff;">Reset Account Password</a>
              </div>
              <div class="text" style="font-size: 12px; word-break: break-all;">
                Or copy and paste this secure link into your browser:<br/>
                <a href="{reset_link}">{reset_link}</a>
              </div>
              <div class="notice">
                This password reset link will expire in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. If you did not initiate this request, you can safely disregard this email.
              </div>
            </div>
            <div class="footer">
              &copy; 2026 PlantPulse AI Platform.
            </div>
          </div>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"PlantPulse AI Security <{settings.EMAIL_FROM}>"
        msg["To"] = to_email
        msg.attach(MIMEText(f"Reset your PlantPulse AI password at: {reset_link}", "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = cls._create_smtp_connection()
        try:
            server.sendmail(settings.EMAIL_FROM, [to_email], msg.as_string())
            return True
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to transmit reset email to recipient: {str(e)}"
            )
        finally:
            try:
                server.quit()
            except Exception:
                pass
