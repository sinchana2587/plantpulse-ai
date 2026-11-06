from datetime import datetime, timezone
import uuid
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_token
from app.models.user import User, EmailVerificationOTP

client = TestClient(app)

TEST_ID = uuid.uuid4().hex[:6]
RAMESH_EMAIL = f"ramesh.{TEST_ID}@example.com"
ANITA_EMAIL = f"anita.{TEST_ID}@example.com"
BASAVA_EMAIL = f"basava.{TEST_ID}@example.com"

def test_signup_validation_and_otp_dispatch():
    """Verify signup enforces strong passwords, prevents mismatched passwords, and generates hashed OTP."""
    # Mismatched passwords
    res_mismatch = client.post("/api/v1/auth/signup", json={
        "full_name": "Ramesh Kumar",
        "email": f"mismatch.{TEST_ID}@example.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "terms_accepted": True
    })
    assert res_mismatch.status_code == 400
    assert "match" in res_mismatch.json()["detail"].lower()

    # Weak password (rejected by Pydantic min_length or custom validator)
    res_weak = client.post("/api/v1/auth/signup", json={
        "full_name": "Ramesh Kumar",
        "email": f"weak.{TEST_ID}@example.com",
        "password": "weak",
        "confirm_password": "weak",
        "terms_accepted": True
    })
    assert res_weak.status_code in [400, 422]

    # Successful signup
    signup_res = client.post("/api/v1/auth/signup", json={
        "full_name": "Ramesh Patel",
        "email": RAMESH_EMAIL,
        "password": "FarmerPassword2026!",
        "confirm_password": "FarmerPassword2026!",
        "terms_accepted": True
    })
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["requires_verification"] is True
    assert signup_data["status"] == "success"

def test_unverified_account_login_rejection():
    """Verify that unverified accounts cannot log in before submitting OTP."""
    login_res = client.post("/api/v1/auth/login", json={
        "email": RAMESH_EMAIL,
        "password": "FarmerPassword2026!"
    })
    assert login_res.status_code == 403
    assert "verified" in login_res.json()["detail"].lower()

def test_email_verification_and_normal_login():
    """Verify 6-digit OTP verification, ensures no auto-login, and verifies subsequent normal login."""
    from app.db.session import SessionLocal
    db = SessionLocal()
    user = db.query(User).filter(User.email == RAMESH_EMAIL).first()
    assert user is not None
    assert user.is_verified is False

    # Retrieve the active OTP record from DB
    otp_rec = (
        db.query(EmailVerificationOTP)
        .filter(EmailVerificationOTP.user_id == user.id, EmailVerificationOTP.is_used == False)
        .first()
    )
    assert otp_rec is not None
    # Verify OTP is stored as a 64-char SHA-256 hash, not plaintext
    assert len(otp_rec.otp_hash) == 64

    # Wrong OTP test
    bad_verify = client.post("/api/v1/auth/verify-email", json={
        "email": RAMESH_EMAIL,
        "otp": "000000"
    })
    assert bad_verify.status_code == 400
    assert "invalid" in bad_verify.json()["detail"].lower()

    # Manually set a known OTP for test verification
    test_otp = "741258"
    otp_rec.otp_hash = hash_token(test_otp)
    db.commit()
    db.close()

    # Verify with correct OTP
    good_verify = client.post("/api/v1/auth/verify-email", json={
        "email": RAMESH_EMAIL,
        "otp": test_otp
    })
    assert good_verify.status_code == 200
    verify_data = good_verify.json()
    assert verify_data["status"] == "success"
    # STRICT USER REQUIREMENT: Verify email does NOT return an access token (no auto-login)
    assert "access_token" not in verify_data

    # Now login normally
    normal_login = client.post("/api/v1/auth/login", json={
        "email": RAMESH_EMAIL,
        "password": "FarmerPassword2026!"
    })
    assert normal_login.status_code == 200
    token_data = normal_login.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"
    assert token_data["user"]["email"] == RAMESH_EMAIL
    assert token_data["user"]["is_verified"] is True

def test_multi_user_data_isolation():
    """Verify that User A cannot see or delete User B's private plants."""
    # 1. Create User A
    client.post("/api/v1/auth/signup", json={
        "full_name": "Farmer Anita",
        "email": ANITA_EMAIL,
        "password": "AnitaPassword2026!",
        "confirm_password": "AnitaPassword2026!",
        "terms_accepted": True
    })
    from app.db.session import SessionLocal
    db = SessionLocal()
    anita = db.query(User).filter(User.email == ANITA_EMAIL).first()
    anita.is_verified = True
    db.commit()
    db.close()

    anita_token = client.post("/api/v1/auth/login", json={
        "email": ANITA_EMAIL,
        "password": "AnitaPassword2026!"
    }).json()["access_token"]
    anita_headers = {"Authorization": f"Bearer {anita_token}"}

    # 2. Create User B (Basavaraj)
    client.post("/api/v1/auth/signup", json={
        "full_name": "Farmer Basavaraj",
        "email": BASAVA_EMAIL,
        "password": "BasavaPassword2026!",
        "confirm_password": "BasavaPassword2026!",
        "terms_accepted": True
    })
    db = SessionLocal()
    basava = db.query(User).filter(User.email == BASAVA_EMAIL).first()
    basava.is_verified = True
    db.commit()
    db.close()

    basava_token = client.post("/api/v1/auth/login", json={
        "email": BASAVA_EMAIL,
        "password": "BasavaPassword2026!"
    }).json()["access_token"]
    basava_headers = {"Authorization": f"Bearer {basava_token}"}

    # 3. Anita creates a plant
    anita_plant_res = client.post(
        "/api/v1/plants/register",
        data={
            "name": "Anita's Mandya Organic Banana",
            "crop_type": "Banana",
            "crop_variety": "Grand Naine",
            "planting_date": "2026-02-10",
            "location": "Plot 3, Mandya District",
            "description": "Drip irrigated organic banana cultivation"
        },
        headers=anita_headers
    )
    assert anita_plant_res.status_code == 201
    anita_plant_id = anita_plant_res.json()["id"]

    # 4. Basavaraj lists his plants (with include_demo=false)
    basava_plants_res = client.get("/api/v1/plants?include_demo=false", headers=basava_headers)
    assert basava_plants_res.status_code == 200
    basava_plant_ids = [p["id"] for p in basava_plants_res.json()]
    # Anita's plant must NOT appear in Basavaraj's plant list
    assert anita_plant_id not in basava_plant_ids

    # 5. Basavaraj attempts to directly access Anita's plant by ID
    direct_access = client.get(f"/api/v1/plants/{anita_plant_id}", headers=basava_headers)
    # Must be 404/403 access denied
    assert direct_access.status_code in [403, 404]

    # 6. Basavaraj attempts to delete Anita's plant
    delete_attempt = client.delete(f"/api/v1/plants/{anita_plant_id}", headers=basava_headers)
    assert delete_attempt.status_code in [403, 404]

    # 7. Anita can still access her plant
    anita_access = client.get(f"/api/v1/plants/{anita_plant_id}", headers=anita_headers)
    assert anita_access.status_code == 200
    assert anita_access.json()["name"] == "Anita's Mandya Organic Banana"
