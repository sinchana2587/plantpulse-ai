# PlantPulse AI — Multilingual Architecture & Localization Guide

## 1. Overview
PlantPulse AI provides native, deep multilingual localization tailored for Indian agricultural operators, farmers, agronomists, and researchers across three primary languages:
- **English (`en`)**
- **Kannada (`kn`)** (ಕನ್ನಡ)
- **Hindi (`hi`)** (हिन्दी)

The localization covers UI navigation, form labels, voice guidance, error diagnostics, phenological stage descriptions, crop dossiers, and chatbot queries.

---

## 2. Localization Structure & Translation Engine

### Translation Catalogs
Translation dictionaries are structured hierarchically in JSON:
- `frontend/src/locales/en.json`
- `frontend/src/locales/kn.json`
- `frontend/src/locales/hi.json`

### Key Namespaces
1. `nav`: Navigation links, tab identifiers, status badges, and action triggers.
2. `common`: Universal strings (loading, save, cancel, delete, search, filter, dates).
3. `auth`: Sign in, registration, 6-digit OTP verification, password strength, forgot/reset password.
4. `dashboard`: Agricultural metrics, stage distribution, milestones, attention alerts.
5. `plants`: Crop portfolio, filter dropdowns, timeline status badges.
6. `addPlant`: Field labels, validation messages, and field-level voice descriptions.
7. `predictions`: GDD forecasting, phenological milestone stages, model bounds, recommendations.
8. `datasets`: Agronomic profiles, thermal baselines ($T_{base}$, $T_{cutoff}$), training repositories, dossiers.
9. `chatbot`: Domain refusal notices, quick prompts, voice dictation, conversational responses.
10. `voice`: TTS guidance, STT confirmation prompts, browser compatibility warnings.
11. `settings`: Account preferences, language selector, voice assistant toggles, password updates.

---

## 3. Dynamic Interpolation & Fallback Strategy

The `LanguageContext` (`frontend/src/context/LanguageContext.tsx`) provides:
- Dot-notation key resolution (e.g., `t('dashboard.upcomingMilestones')`).
- Parameter interpolation:
  ```json
  "resendOtpCooldown": "Resend available in {seconds}s"
  ```
  ```typescript
  t('auth.resendOtpCooldown', { seconds: 45 }) // -> "Resend available in 45s"
  ```
- **Fallback Resolution:** If a specific key is missing in Kannada or Hindi, the translation engine seamlessly falls back to the English baseline without throwing runtime errors or blank labels.
- **Persistence:** Selected language is persisted in `localStorage` under key `plantpulse_lang` and synchronized with `user.preferred_language` on backend profile updates.
- **HTML Document Language:** Automatically updates `document.documentElement.lang` for accessibility tools and screen readers.

---

## 4. Multi-Language Voice Integration
The speech synthesis and recognition engines dynamically bind to regional BCP-47 language codes:
- English: `en-IN` (Indian English inflection)
- Kannada: `kn-IN` (Kannada speech synthesis & STT)
- Hindi: `hi-IN` (Hindi speech synthesis & STT)
