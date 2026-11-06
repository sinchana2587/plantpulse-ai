# PlantPulse AI
### Continuous AI-Based Plant Growth Stage & Development Prediction Platform

PlantPulse AI is an enterprise-grade agricultural intelligence platform that continuously monitors individual crops over time through photographs and environmental telemetry. Unlike conventional single-leaf classifiers, PlantPulse AI tracks chronological plant development, extracts multi-spectral morphological features, identifies growth stages, and predicts future developmental milestones (Flowering, Fruit Formation, Maturity, and Harvest windows) using physics-informed Growing Degree Days (GDD) modeling.

---

## Workspace Location

The complete application is located at:
```text
D:\plantpulse-ai\
```

---

## Key Platform Capabilities

1. **Enterprise Authentication & Multi-User Isolation:**
   - Sign up with automatic validation and password strength estimation.
   - Mandatory 6-digit OTP email verification via live Gmail SMTP (`smtp.gmail.com:587`).
   - OTP stored strictly as a 64-character SHA-256 hash (10-minute expiry, single-use invalidation).
   - Unverified accounts cannot log in (`HTTP 403`).
   - Password reset workflow with 32-byte URL-safe cryptographic tokens.
   - Google OAuth 2.0 integration ready.
   - Strict multi-user data isolation: every user's plants, observations, forecasts, telemetry, and dossiers are strictly private and isolated.

2. **Multilingual Architecture:**
   - Native support for **English (`en`)**, **Kannada (`kn`)** (ಕನ್ನಡ), and **Hindi (`hi`)** (हिन्दी).
   - Full translation of all UI views, forms, validations, alerts, agronomic descriptions, and chatbot queries.
   - Dynamic parameter interpolation, graceful English fallback, and language preference persistence.

3. **Field-Ready Voice Assistance (TTS & STT):**
   - Field-level speaker icons audibly read input guidance, expected formats, and agronomic examples in English, Kannada, or Hindi.
   - Speech-to-Text microphone dictation across forms and chatbot.
   - Interactive confirmation dialogs prevent speech recognition inaccuracies before text insertion.
   - Password and secret fields are strictly excluded from voice features.

4. **Agricultural Dataset & Knowledge Library:**
   - **Crop Agronomic Profiles:** Searchable profiles for Tomato, Chilli, Brinjal, Okra, Cucumber, and Banana with botanical baselines ($T_{base}$, $T_{cutoff}$, optimal temperatures, moisture %, pH, phenological breakdown, and ICAR/FAO citations).
   - **AI Training Datasets Catalog:** Curated catalog of authentic computer vision repositories (PlantVillage, AgriPheno, ICAR Banana, Wageningen Cucurbits) with licenses and benchmark accuracies.
   - **Personalized Crop Reports (`My Plant Reports`):** Generates individual agricultural dossiers for monitored crops with print/PDF layout.

5. **Agriculture-Only AI Chatbot:**
   - Enforces strict domain filtering, rejecting off-topic queries with the exact required prompt response.
   - Real-time personal plant status retrieval querying database records ("What stage is my tomato?").
   - Integrated with voice dictation, TTS response playback, and quick agricultural prompt chips.

6. **Continuous Crop Phenological Tracking & Forecasting:**
   - 20-dimensional botanical feature extractor (Green Leaf Index, Excess Green, Floral Yellow, Ripening Red, Haralick texture).
   - Machine learning visual growth-stage classification (Zero-leakage held-out plant test accuracy: 100%).
   - Hybrid Growing Degree Days (GDD) milestone forecaster projecting Flowering, Fruit Formation, Maturity, and Harvest windows.
   - Dedicated **Growth Predictions** view with a user-specific plant selector.

7. **Telemetry & Microclimate Sensor Engine:**
   - Interactive 24H, 7D, and 30D environmental aggregation (temperature, soil moisture, humidity, sunlight, precipitation).
   - Weather station comparison engine providing microclimate delta analysis against regional weather feeds.

---

## Technical Stack

- **Backend:** Python 3.14, FastAPI, SQLAlchemy ORM, SQLite 3 (foreign keys enforced), Pydantic v2, scikit-learn, OpenCV/NumPy, bcrypt, PyJWT, Google Auth.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts, Lucide Icons.
- **Email Delivery:** Gmail TLS SMTP (`smtp.gmail.com:587`).
- **Voice:** Web Speech API (`SpeechSynthesis` & `SpeechRecognition`).

---

## Quick Start & Execution Guide

### 1. Backend Service
```powershell
cd D:\plantpulse-ai\backend
$env:PYTHONPATH="D:\plantpulse-ai\backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger/OpenAPI): `http://127.0.0.1:8000/docs`

### 2. Frontend Application
```powershell
cd D:\plantpulse-ai\frontend
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Automated Test Suite (33 Tests)
```powershell
cd D:\plantpulse-ai\backend
$env:PYTHONPATH="D:\plantpulse-ai\backend"
py -3.14 -m pytest tests -v
```
**Result:** 33 passed out of 33 tests (100% pass rate).

---

## Documentation Deliverables

Detailed engineering documentation is available in the project root:
- [`AUTHENTICATION_DOCUMENTATION.md`](file:///D:/plantpulse-ai/AUTHENTICATION_DOCUMENTATION.md): Cryptographic specs, OTP hashing, JWT sessions, multi-user isolation.
- [`DATABASE_ARCHITECTURE.md`](file:///D:/plantpulse-ai/DATABASE_ARCHITECTURE.md): Entity-relationship diagrams, table schemas, and migration routines.
- [`MULTILINGUAL_SUPPORT.md`](file:///D:/plantpulse-ai/MULTILINGUAL_SUPPORT.md): Localization engine, translation catalogs (en, kn, hi).
- [`VOICE_ASSISTANCE_DOCUMENTATION.md`](file:///D:/plantpulse-ai/VOICE_ASSISTANCE_DOCUMENTATION.md): TTS & STT architecture, speech mapping, and safety exclusions.
- [`DATASET_LIBRARY_DOCUMENTATION.md`](file:///D:/plantpulse-ai/DATASET_LIBRARY_DOCUMENTATION.md): Agronomic crop baselines, training catalogs, and dossier engine.
- [`AGRICULTURAL_CHATBOT_DOCUMENTATION.md`](file:///D:/plantpulse-ai/AGRICULTURAL_CHATBOT_DOCUMENTATION.md): Strict domain guardrails and personal plant status queries.
- [`VERCEL_DEPLOYMENT_GUIDE.md`](file:///docs/VERCEL_DEPLOYMENT_GUIDE.md): Vercel Edge frontend and Render/Railway backend production deployment guide.
- [`SECURITY_AUDIT_REPORT.md`](file:///D:/plantpulse-ai/SECURITY_AUDIT_REPORT.md): Threat modeling, path traversal protection, and verification results.
- [`END_TO_END_TEST_REPORT.md`](file:///D:/plantpulse-ai/END_TO_END_TEST_REPORT.md): Comprehensive 33-test automated test report.
