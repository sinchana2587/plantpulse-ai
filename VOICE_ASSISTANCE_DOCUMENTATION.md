# PlantPulse AI — Voice Assistance System (TTS & STT)

## 1. Overview
PlantPulse AI features hands-free, field-ready voice interaction designed for farmers and agricultural technicians operating in variable outdoor conditions. The system provides:
1. **Interactive Field Guidance (Text-to-Speech / TTS):** Field-level speaker icons that audibly explain input requirements, expected data formats, and realistic agricultural examples in English, Kannada, or Hindi.
2. **Speech-to-Text Dictation (STT):** Microphone controls enabling voice input for plant names, locations, field notes, and chatbot inquiries.
3. **Interactive Confirmation Dialog:** Prevents accidental speech recognition errors by prompting the user to verify dictated text before inserting it into form fields.
4. **Security Boundary:** Voice dictation is **strictly excluded** from password and secret fields.

---

## 2. Technical Architecture

### Component Hierarchy
```
LanguageContext (active language: en / kn / hi)
       │
       ▼
VoiceService (frontend/src/services/voiceService.ts)
  ├── window.speechSynthesis (TTS)
  └── window.SpeechRecognition / webkitSpeechRecognition (STT)
       │
       ▼
VoiceFieldControl (frontend/src/components/VoiceFieldControl.tsx)
  ├── Speaker Icon (TTS toggle with audio pulse animation)
  ├── Microphone Icon (STT toggle with listening wave animation)
  └── Confirmation Popover (review dictated text -> [Use] [Try Again])
```

---

## 3. Supported Languages & Speech Mapping
| Application Language | BCP-47 Tag | Speech Synthesis Voice | Speech Recognition Model |
| :--- | :--- | :--- | :--- |
| English | `en-IN` | Indian English / Natural Voice | Google Indian English STT |
| Kannada (ಕನ್ನಡ) | `kn-IN` | Kannada Natural Voice | Google Kannada STT |
| Hindi (हिन्दी) | `hi-IN` | Hindi Natural Voice | Google Hindi STT |

---

## 4. Where Voice Assistance is Integrated
1. **Plant Registration (`AddPlantModal.tsx`):**
   - Plant Identifier Name: Speaks naming convention guidelines; transcribes plant nickname.
   - Field Location / Sensor Node: Explains plot referencing; transcribes greenhouse/bed name.
   - Soil Description & Notes: Explains agronomic soil context; dictates multi-sentence notes.
2. **Agricultural AI Assistant (`ChatbotView.tsx`):**
   - Microphone button in input bar allows asking long agricultural questions via voice.
   - Speaker button on assistant responses reads the agronomic advice aloud via TTS.
3. **Account Settings (`SettingsView.tsx`):**
   - Master toggle to enable or disable voice assistance features across the application.
