# PlantPulse AI — Agricultural Chatbot & Domain Guardrails

## 1. Overview
The PlantPulse Agricultural Assistant (`/chatbot`) is an AI agronomist providing instant, scientifically sound advice on crop cultivation, pest and pathogen management, irrigation schedules, and phenological milestone prediction.

---

## 2. Strict Agricultural Domain Guardrails

To preserve product integrity and prevent off-topic exploitation (e.g. coding queries, entertainment, political debates, financial discussions), the chatbot enforces a deterministic domain filter at both the API and service layers.

### Refusal Policy
Any message not relating to agriculture, crops, botany, soil science, irrigation, farm machinery, weather, or the user's monitored plants is rejected with the exact mandatory refusal response:

> *"I am PlantPulse AI, an agricultural intelligence assistant dedicated strictly to crop phenology, plant growth stages, agricultural meteorology, and farm management. I can only assist with topics related to agriculture, plants, soil, weather, irrigation, pests, and your registered crops. Please ask an agricultural or plant science question."*

### Filter Keywords & Evaluation
The domain classifier inspects token roots across:
- **Crops & Botany:** tomato, chilli, brinjal, okra, cucumber, banana, crop, plant, seed, flower, fruit, leaf, stem, root, gdd, phenology, yield, harvest.
- **Environment & Meteorology:** temperature, moisture, humidity, sunlight, rain, irrigation, water, frost, drought, climate.
- **Soil & Nutrition:** soil, fertilizer, nitrogen, phosphorus, potassium, npk, compost, ph, micronutrient, vermicompost.
- **Protection:** pest, disease, fungus, blight, rot, borer, curl, wilt, pesticide, spray, neem, virus, weed.
- **Personal Crop Status:** "stage", "how is my plant", "when will it flower", "my tomato".

Non-agricultural questions (e.g., `"Write a Python script"`, `"Who won the cricket match?"`, `"What is Bitcoin?"`) are rejected with `is_agricultural = False`.

---

## 3. Real Database Personal Plant Status Lookup

When an authenticated user asks questions like:
- *"What stage is my tomato?"*
- *"When will my banana plant flower?"*
- *"Show me my plants"*

The chatbot dynamically queries the database for the authenticated user's registered crops:
```python
user_plants = db.query(Plant).filter(Plant.user_id == user.id).all()
```
It returns real records including plant name, variety, current verified growth stage, planting date, and total observations.

---

## 4. Voice Interaction & Quick Prompts
- **Speech-to-Text (STT):** Dictate queries directly into the message input in English, Kannada, or Hindi.
- **Text-to-Speech (TTS):** Audibly listen to the agronomist's response via the speaker button.
- **Suggested Agricultural Questions:** One-click chips covering thermal baselines, GDD concepts, blossom end rot, and personal plant status.
