# PlantPulse AI — Authentication, Security & Tenant Isolation Architecture

## 1. Executive Summary

PlantPulse AI features an enterprise-grade, cryptographically audited authentication and user isolation infrastructure. The architecture guarantees that no user can access, modify, or observe another user's crops, historical field photographs, microclimate sensor telemetry, GDD forecasts, or agronomic dossiers.

---

## 2. Cryptographic Protocols & Security Design

### Password Hashing
- **Algorithm:** `bcrypt` with adaptive cost factor (12 rounds).
- **Salt Generation:** Unique 128-bit cryptographically secure pseudorandom salt per password.
- **Protection:** Resists rainbow tables, precomputation attacks, and GPU acceleration.

### Session Management & JWT
- **Algorithm:** `HMAC-SHA256` (`HS256`).
- **Payload Schema:**
  ```json
  {
    "sub": "<user_uuid>",
    "email": "farmer@example.com",
    "type": "access_token",
    "exp": 1741270000,
    "iat": 1741266400
  }
  ```
- **Token Storage:** Encrypted client-side storage (`localStorage` for "Remember Me" / `sessionStorage` for single session).
- **Expiration:** 7 days (or customizable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

### 6-Digit Email Verification (OTP)
- **Generation:** `secrets.randbelow(900000) + 100000` (Cryptographically Secure Pseudorandom Number Generator).
- **Storage:** Stored exclusively as a **64-character SHA-256 hash** in `email_verification_otps`. The plaintext OTP is never persisted in logs or database tables.
- **Validity Window:** 10 minutes (`EXPIRATION_MINUTES = 10`).
- **Single-Use Invalidation:** Upon successful verification, the record is immediately flagged `is_used = True`.
- **Strict Verification Constraint:** Verifying the OTP **never automatically logs in the user**. The user is redirected to the Sign In screen with a verification confirmation banner.
- **Unverified Account Gate:** Accounts with `is_verified = False` are strictly rejected at `/auth/login` with `HTTP 403 Forbidden` (`"Email address has not been verified. Please submit your 6-digit OTP code."`).

### Password Reset Flow
- **Token Generation:** `secrets.token_urlsafe(32)` (256 bits of entropy).
- **Storage:** Persisted as SHA-256 hash in `password_reset_tokens`.
- **Expiration:** 30 minutes. Single-use enforcement (`is_used = True`).

### Live SMTP Email Transport
- **Server:** `smtp.gmail.com:587` over TLS.
- **Authentication:** Gmail TLS credentials (`EMAIL_USER=sharmachetan7816@gmail.com`).
- **Templates:** Branded responsive HTML emails with PlantPulse AI typography and security advisories.

---

## 3. Multi-User Tenant Data Isolation

### Schema Isolation
All relational models (`plants`, `observations`, `forecasts`, `telemetry_readings`, `chat_messages`) link directly or via cascade to `users.id`:

```
users (id VARCHAR(36) PRIMARY KEY)
  ├── plants (user_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE)
  │     ├── observations (plant_id REFERENCES plants(id))
  │     ├── forecasts (plant_id REFERENCES plants(id))
  │     └── telemetry_readings (plant_id REFERENCES plants(id))
  ├── email_verification_otps (user_id REFERENCES users(id))
  ├── password_reset_tokens (user_id REFERENCES users(id))
  └── chat_messages (user_id REFERENCES users(id))
```

### Authorization Enforcement Matrix
| Endpoint | Method | Isolation Rule |
| :--- | :--- | :--- |
| `/plants` | `GET` | Returns only plants where `plants.user_id == current_user.id` |
| `/plants/{id}` | `GET` | Throws `404 Not Found` if `plant.user_id != current_user.id` |
| `/plants/{id}` | `DELETE` | Throws `404 Not Found` if `plant.user_id != current_user.id` |
| `/observations` | `GET` | Paginated stream filtered by `plants.user_id == current_user.id` |
| `/telemetry/summary` | `GET` | Aggregated only across `plants.user_id == current_user.id` |
| `/dashboard` | `GET` | Counts and alerts calculated solely for `current_user.id` |
| `/chatbot/message` | `POST` | Personal plant lookup queries only `current_user.id` records |

---

## 4. Verification and Automated Test Evidence
Automated test suite `backend/tests/test_authentication_and_multiuser.py` verified:
- Password mismatch rejection (`HTTP 400`).
- Weak password rejection (`HTTP 400/422`).
- 6-digit OTP dispatch and SHA-256 database hashing.
- Rejection of unverified logins (`HTTP 403`).
- Single-use OTP verification without token leakage.
- Multi-user isolation where User B cannot access, list, or delete User A's plants.
