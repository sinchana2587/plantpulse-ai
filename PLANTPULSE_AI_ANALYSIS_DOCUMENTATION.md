# PlantPulse AI: Advanced Plant Analysis, Health Assessment, and Growth Intelligence Engine
## Comprehensive Technical Architecture, Biophysical Phenology, Computer Vision, and Agronomic Grounding Documentation

---

### Executive Summary

**PlantPulse AI** is an agricultural intelligence platform engineered to address the problem statement:
> *"Deep Learning-Based Plant Growth Stage and Development Prediction."*

This system bridges non-destructive botanical computer vision, regional thermal degree day (Growing Degree Days — GDD) thermodynamics, continuous microclimate sensor telemetry, and verified agronomic literature (Indian Council of Agricultural Research — ICAR, and the UN Food and Agriculture Organization — FAO). 

The platform enables growers, farm managers, and agricultural extension officers to monitor individual plants longitudinally, identify morphological growth stages, forecast future developmental milestones with bounded uncertainty intervals, diagnose visual health stresses, simulate hypothetical environmental adjustments via a biophysical Digital Twin, and log field problems for automated agronomic intervention plans.

---

## 1. System Architecture Overview

```
                                      +------------------------------------+
                                      |        Farmer / Web Client         |
                                      |      (React 19 + TypeScript)       |
                                      +-----------------+------------------+
                                                        |
                                          HTTP / REST   |   WebSocket
                                                        v
                                      +------------------------------------+
                                      |       FastAPI Gateway (v1)         |
                                      |       Port 8000 / SQLite / JWT     |
                                      +-----------------+------------------+
                                                        |
          +-------------------------+-------------------+-------------------------+
          |                         |                                             |
          v                         v                                             v
+-------------------+     +--------------------+                       +--------------------+
|  Computer Vision  |     |  Phenology & GDD   |                       | Agronomic Grounded |
| Feature Extractor |     | Thermal Time Engine|                       | Knowledge (ICAR/   |
| (GLI, ExG, Hue,   |     | (Multi-Crop Tbase, |                       | FAO Database)      |
| Texture Gradient) |     |  Stage Thresholds) |                       |                    |
+---------+---------+     +---------+----------+                       +---------+----------+
          |                         |                                             |
          +-------------------------+-------------------+-------------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |   Plant Analysis & Health Engine   |
                                      |    (Sections A - I Synthesis)      |
                                      +-----------------+------------------+
                                                        |
                                                        v
                                      +------------------------------------+
                                      |    Persistent Relational Store     |
                                      |  (SQLite: analyses, problems,      |
                                      |   snapshots, observations, plants) |
                                      +------------------------------------+
```

### Architectural Principles:
1. **Multi-Tenant Isolation**: Every database query filters by `user_id` or explicit demonstration mode flags (`is_demo == True`). User accounts cannot view, modify, or leak crops owned by other producers.
2. **Deterministic Biophysical Baseline**: Machine learning vision classifications are bounded and sanity-checked by thermal time accumulation rates ($GDD$), preventing unrealistic stage predictions (e.g., predicting flowering 3 days after germination).
3. **No Fabricated or Random AI Data**: Telemetry metrics, confidence scores, and visual health indicators are derived from concrete image matrices and recorded sensor readings.
4. **Transparent Explainability**: Every AI inference report exposes the underlying model version, feature extraction dimensions, inference latency, and botanical cues that triggered the decision.
5. **Safe Agricultural Recommendations**: The engine prioritizes cultural management (drip scheduling, organic mulching, canopy aeration, bio-control). It explicitly refrains from prescribing chemical synthetic toxins without professional extension oversight.

---

## 2. Computer Vision & Feature Extraction Pipeline

Plant photographs submitted via the Web UI or mobile camera undergo normalized mathematical feature extraction in `app.ml.feature_extractor`:

### 2.1 Spatial Normalization
- Standardized image resampling to $256 \times 256$ pixels.
- Float32 normalization of RGB channels into the $[0.0, 1.0]$ space.

### 2.2 Color Space Transformation
Transformation from Cartesian RGB to cylindrical HSV space:
$$\Delta = \max(R, G, B) - \min(R, G, B)$$
$$\text{Hue } (H) = \begin{cases}
\frac{G - B}{\Delta} \pmod 6 & \text{if } \max = R \\
\frac{B - R}{\Delta} + 2 & \text{if } \max = G \\
\frac{R - G}{\Delta} + 4 & \text{if } \max = B
\end{cases}$$
$$\text{Saturation } (S) = \frac{\Delta}{\max(R, G, B)}, \quad \text{Value } (V) = \max(R, G, B)$$

### 2.3 Botanical Indices & Biomass Estimation
1. **Green Leaf Index (GLI)**:
   $$\text{GLI} = \frac{2G - R - B}{2G + R + B + 10^{-5}}$$
   Evaluates leaf chlorophyll vigor across vegetative canopy pixels.
2. **Excess Green Index (ExG)**:
   $$\text{ExG} = 2G - R - B$$
   Differentiates foliar biomass from background soil and dry plant matter.
3. **Canopy Density Mask**:
   $$\text{Mask}_{\text{canopy}} = (\text{GLI} > 0.05) \land (S > 0.15) \land (V > 0.15)$$
4. **Floral Anthesis Bloom Ratio (Yellow Spectral Band)**:
   $$\text{Mask}_{\text{flower}} = (0.10 \le H \le 0.18) \land (S \ge 0.35) \land (V \ge 0.40)$$
   Captures yellow tomato, cucumber, and okra corolla flowers.
5. **Ripening Fruit Pigment (Carotenoid/Lycopene Red Spectrum)**:
   $$\text{Mask}_{\text{fruit\_ripe}} = ((H \le 0.07) \lor (H \ge 0.93)) \land (S \ge 0.30) \land (V \ge 0.25)$$
6. **Immature Pericarp (Unripe Fruit Clustering)**:
   $$\text{Mask}_{\text{fruit\_unripe}} = (0.22 \le H \le 0.35) \land (S \ge 0.45) \land (V \ge 0.30)$$
7. **Spatial Texture & Edge Gradient**:
   Finite difference Sobel-like gradient computation across spatial axes:
   $$\nabla I = \frac{1}{2}\left(|\mathbf{I}_{x+1} - \mathbf{I}_x| + |\mathbf{I}_{y+1} - \mathbf{I}_y|\right)$$
   Delineates smooth leaf laminae from complex branching or wrinkling symptoms.

---

## 3. Crop-Specific Modeling & Phenology Engines

PlantPulse AI enforces strict crop boundaries. Models trained specifically for *Solanum lycopersicum* (Tomato) are never falsely presented as general multi-crop classifiers.

| Crop Key | Common Name | Scientific Name | Base Temp ($T_{base}$) | Cutoff Temp ($T_{cutoff}$) | Classification Engine |
|---|---|---|---|---|---|
| `tomato` | Tomato | *Solanum lycopersicum* | 10.0 °C | 34.0 °C | Trained RandomForest botanical vision classifier (v1.0.0) + GDD Phenology Engine |
| `chilli` | Chilli / Pepper | *Capsicum annuum* | 12.0 °C | 35.0 °C | Crop-Specific Biophysical Phenology + Botanical Vision Feature Extraction |
| `brinjal` | Brinjal (Eggplant) | *Solanum melongena* | 12.0 °C | 35.0 °C | Crop-Specific Biophysical Phenology + Botanical Vision Feature Extraction |
| `okra` | Okra (Ladyfinger) | *Abelmoschus esculentus* | 15.0 °C | 38.0 °C | Crop-Specific Biophysical Phenology + Botanical Vision Feature Extraction |
| `cucumber` | Cucumber | *Cucumis sativus* | 10.0 °C | 35.0 °C | Crop-Specific Biophysical Phenology + Botanical Vision Feature Extraction |
| `banana` | Banana | *Musa spp.* | 14.0 °C | 38.0 °C | Long-Duration Phenology Engine (360-day cycle, 5 stages) |

### Model Transparency Statement:
When evaluating non-tomato crops, the report explicitly states:
> *"Crop-specific agronomic phenology engine calibrated for [Crop]. Dedicated deep CNN weight checkpoint for this cultivar is currently in validation; biophysical thermal time model applied with manual override enabled."*

---

## 4. Growing Degree Day (GDD) & Thermal Time Algorithms

Biological development in poikilothermic organisms (plants) is regulated by accumulated heat units above a crop-specific baseline threshold temperature ($T_{base}$).

### 4.1 Daily GDD Accumulation Equation:
$$\text{GDD}_{\text{daily}} = \max\left(0, \min(T_{\text{mean}}, T_{\text{cutoff}}) - T_{\text{base}}\right)$$
Where:
- $T_{\text{mean}} = \frac{T_{\max} + T_{\min}}{2}$ (or the continuous sensor mean reading).
- $T_{\text{base}}$ = Thermal threshold below which metabolic enzymatic activity ceases.
- $T_{\text{cutoff}}$ = Thermal ceiling above which heat stress inhibits enzymatic kinetics.

### 4.2 Cumulative Thermal Time:
$$\text{GDD}_{\text{cumulative}} = \sum_{t=0}^{\text{days}} \text{GDD}_{\text{daily}}(t)$$

### 4.3 Developmental Stage Day Boundaries (Tomato Reference):
- **Seedling**: $0 - 14$ days ($150 \text{ GDD}$)
- **Vegetative**: $14 - 38$ days ($450 \text{ GDD}$)
- **Flowering**: $38 - 60$ days ($750 \text{ GDD}$)
- **Fruit Formation**: $60 - 85$ days ($1150 \text{ GDD}$)
- **Maturity**: $85 - 110$ days ($1450 \text{ GDD}$)
- **Harvest Window**: $95 - 120$ days ($1600 \text{ GDD}$)

---

## 5. Environmental Telemetry Correlation Engine

The telemetry engine correlates live and historical environmental sensor readings against target agronomic thresholds:

### Evaluation Logic:
1. **Volumetric Soil Moisture**:
   - Optimal Target: $50\% - 65\%$ (crop-dependent).
   - Deficit ($< 45\%$): Triggers moisture deficit stress, blossom end rot alerts, and morning drip irrigation scheduling.
   - Excess ($> 70\%$): Triggers waterlogging, root hypoxia alerts, and advice to suspend irrigation and clear drainage furrows.
2. **Ambient Temperature**:
   - Optimal Daytime: $22^\circ\text{C} - 28^\circ\text{C}$.
   - Elevated ($> 32^\circ\text{C}$): Flags floral heat abscission risk and pollen desiccation during flowering.
   - Chilling ($< 18^\circ\text{C}$): Flags metabolic deceleration and GDD lag.
3. **Daily Sunlight Exposure**:
   - Optimal: $6.5 - 8.5$ hours/day.
   - Low ($< 6.0$ hrs): Flags risk of etiolation and diminished fruit sugar accumulation.

---

## 6. Plant Health & Problem Detection Engine

The health assessment system evaluates visual spectral ratios alongside microclimate stress:

### 6.1 Spectral Symptom Quantifiers:
- **Foliar Chlorosis (Yellowing)**: Evaluated from pixels where $(0.12 \le H \le 0.20)$ with low GLI $(< 0.12)$. Represents loss of chlorophyll.
- **Necrotic Lesions (Browning/Desiccation)**: Evaluated from dark brown foliar tissue $(R < 0.35, G < 0.28, B < 0.22, |R - G| < 0.08)$. Represents tissue necrosis or fungal leaf spots.
- **Canopy Density**: Overall photosynthetically active green foliage.

### 6.2 Health Scoring Algorithm:
$$\text{Health Score} = 98 - 150 \times \text{ChlorosisRatio} - 200 \times \text{NecrosisRatio} - \text{StressPenalty}_{\text{moisture}} - \text{StressPenalty}_{\text{temp}}$$
Bounded in $[35, 98]$:
- $\ge 85$: **Optimal** (Healthy vigorous crop)
- $70 - 84$: **Low Stress** (Minor chlorosis or slight moisture drift)
- $50 - 69$: **Moderate Concern** (Active stress requiring cultural adjustment)
- $< 50$: **Severe Risk** (Foliar necrosis or severe moisture stress)

---

## 7. Farmer Problem Reporting & Agronomic Diagnosis

When a grower encounters plant abnormalities, the **"REPORT A PLANT PROBLEM"** module provides structured diagnosis:

### Input Parameters:
- Problem Category (Chlorosis, Wilting, Stunting, Spots, Fruit Drop, Pests)
- Affected Plant Organ (Whole plant, Lower leaves, Upper canopy, Flowers, Fruit, Collar/Roots)
- Onset Date
- Spreading Flag (`yes`, `no`, `unsure`)
- Voice or text description
- Recent irrigation and fertilizer history
- Uploaded abnormality photograph

### Automated Diagnosis Output:
1. **Executive Summary** with evaluated severity level (`Low`, `Moderate`, `High`, `Severe`).
2. **Probable Causes** ranked by likelihood, with biophysical reasoning and supporting telemetry evidence.
3. **Immediate Cultural Interventions** (e.g., pruning infected foliage, foliar micronutrient spray, adjusting drip emitters).
4. **Spread Prevention Precautions** (sterilizing pruning shears, organic mulch barriers to eliminate splash-borne fungi).
5. **Follow-Up Schedule** (re-inspection in 48 to 72 hours).
6. **Agricultural Extension / KVK Referral Protocol**: Guidance on when to isolate samples and consult local Krishi Vigyan Kendra agronomists.

---

## 8. Agricultural Knowledge Retrieval & ICAR / FAO Grounding

All recommendations and educational profiles in PlantPulse AI are grounded in verified agronomic literature:
- **ICAR Technical Bulletins**: Indian Council of Agricultural Research, Package of Practices for Horticultural Crops.
- **FAO Irrigation and Drainage Paper 56**: Crop evapotranspiration and seasonal crop coefficients ($K_c$).
- **AVRDC / World Vegetable Center Technical Bulletins**: Physiological disorder diagnostics for Solanaceous and Cucurbit crops.

### Non-Chemical Cultural Practices Enforced:
- Organic mulching (straw, paddy husk, coir) to suppress weed vectors and preserve root moisture.
- Cold-pressed Neem Seed Kernel Extract (NSKE 5%) and yellow sticky traps for sucking insect monitoring.
- Pruning lower senescent foliage to facilitate cross-canopy air circulation and stop soil-splash fungal spores.
- Drip irrigation scheduled for early morning ($06:00 - 08:30 \text{ AM}$) to minimize foliar moisture duration.

---

## 9. Standout Feature: Plant Digital Twin & Growth Deviation Radar

The **Plant Digital Twin** benchmarks each registered plant against a reference biological curve:

### 9.1 Expected vs Actual Phenological Timeline:
Plots each milestone (Seedling, Vegetative, Flowering, Fruit Formation, Maturity) comparing:
- Expected Day and Expected Date (regional thermal model).
- Observed Day and Observed Date (from validated photographic observations).

### 9.2 Growth Deviation Radar Status:
- `Within Expected Range`: Cumulative GDD within $\pm 3$ days of baseline.
- `Faster Than Reference`: Development progressing $\ge 4$ days ahead of baseline due to elevated thermal accumulation.
- `Slower Than Reference`: Development trailing baseline by $4 - 6$ days due to lower temperatures or moisture variance.
- `Potential Growth Concern`: Development delayed by $\ge 7$ days or accompanied by high health stress.
- `Insufficient Data`: No observations or continuous telemetry logged.

### 9.3 Development Gap Analysis:
Quantifies the exact gap (e.g., *"-4 days behind reference thermal expectation due to moisture deficit in vegetative stage"*).

---

## 10. What-If Growth Simulator

The **What-If Growth Simulator** provides an interactive biophysical sandbox:

### Mathematical Model:
$$\Delta \text{GDD}_{\text{daily}} = \Delta T$$
$$\Delta \text{Days}_{\text{temp}} = -1 \times (\Delta T \times 2.2) \quad (\text{for } 0 < \Delta T \le 3.0^\circ\text{C})$$
$$\Delta \text{Days}_{\text{moist}} = \begin{cases}
-2 \text{ days} & \text{if } 0 < \Delta M \le 12\% \text{ (stress relief)} \\
+3 \text{ days} & \text{if } \Delta M > 12\% \text{ (waterlogging delay)} \\
+0.35 \times |\Delta M| & \text{if } \Delta M < 0 \text{ (deficit drag)}
\end{cases}$$
$$\Delta \text{Days}_{\text{sun}} = \begin{cases}
-1 \text{ day} & \text{if } \Delta S > 0 \\
+2 \text{ days} & \text{if } \Delta S < 0
\end{cases}$$

### Clear Simulation Disclaimer:
> *"Biophysical model simulation based on Growing Degree Day (GDD) thermodynamics and crop coefficients. Actual biological development is subject to unexpected field weather events, soil pathogen dynamics, and cultivar-specific genetics."*

---

## 11. Next Best Observation Suggestion Engine

Instead of unstructured image taking, PlantPulse AI guides the farmer on **when** and **what** to photograph:
- **Vegetative Stage**: *"Capture a well-lit macro photo focusing directly on the topmost growing tip to verify initial flower bud cluster emergence in 48-72 hours."*
- **Flowering Stage**: *"Photograph flower clusters from a slight 45-degree angle to verify pollination success and early ovary swelling."*
- **Fruit Formation Stage**: *"Photograph representative fruit bunches in natural daylight to track sizing and carotenoid color transition."*
- **Maturity Stage**: *"Capture mature fruit bunches alongside a size reference marker to confirm harvest maturity index."*

---

## 12. Complete AI Analysis Report UI (Sections A through I)

The generated report matches the comprehensive structured specification:
- **Section A: Plant Overview**: Cultivar, location, planting date, days in ground, total observations recorded.
- **Section B: Current Stage Classification**: Morphological stage badge, confidence score %, botanical visual indicators (canopy %, GLI, bloom %, fruit pigment %, visual markers), model transparency note, and manual override control.
- **Section C: Growth Progress & Timeline**: Cumulative GDD units (Base temp), progress towards next milestone %, estimated days to transition.
- **Section D: Future Development & Milestones**: Table of transitions with date ranges, days remaining, and estimated harvest window.
- **Section E: Plant Health & Problem Assessment**: Health score (0-100), status badge, chlorosis/wilting/thermal stress ratings, and list of evaluated symptoms with visual evidence.
- **Section F: Environmental Analysis**: Soil moisture, temperature, sunlight vs crop optimal requirements, and microclimate correlation synthesis.
- **Section G: Precautions & Recommended Cultural Practices**: Irrigation schedule and timing, nutrition management, canopy aeration, and non-chemical practices.
- **Section H: Next Recommended Actions**: Immediate actionable checklist and Next Best Observation guidance.
- **Section I: Technical & Model Metadata**: Classifier version, inference latency (ms), feature dimensionality, ICAR/FAO citations, and educational disclaimer.
- **Validation Widget**: Farmer feedback buttons (`Accurate` / `Needs Adjustment`).
- **Export**: Built-in Print and PDF export capabilities.

---

## 13. Database Schema & Data Dictionary

### Key Tables:
1. `plants`:
   - `id`: UUID (PK)
   - `user_id`: UUID (FK to users)
   - `name`, `crop_type`, `crop_variety`, `planting_date`, `location`, `description`, `is_demo`.
2. `observations`:
   - `id`: UUID (PK)
   - `plant_id`: UUID (FK to plants)
   - `observation_date`: DateTime
   - `image_path`: String (stored path)
   - `temperature`, `humidity`, `soil_moisture`, `sunlight_hours`, `rainfall`
   - `manual_growth_stage`, `ai_growth_stage`, `confidence_score`
3. `plant_analyses`:
   - `id`: UUID (PK)
   - `plant_id`: UUID (FK to plants)
   - `observation_id`: UUID (FK to observations)
   - `image_path`: String
   - `predicted_stage`: String
   - `confidence_score`: Float
   - `model_name`, `model_version`, `inference_time_ms`
   - `visual_cues`, `growth_progress`, `future_development`, `health_assessment`, `environmental_correlation`, `recommendations`, `next_best_observation`, `citations` (JSON text fields)
   - `health_score`: Integer, `health_status`: String
   - `user_feedback`, `user_notes`
4. `plant_problems`:
   - `id`: UUID (PK)
   - `plant_id`: UUID (FK to plants)
   - `category`, `description`, `affected_part`, `onset_date`, `is_spreading`
   - `irrigation_notes`, `fertilizer_notes`, `image_path`, `status`
5. `problem_analyses`:
   - `id`: UUID (PK)
   - `problem_id`: UUID (FK to plant_problems)
   - `summary`, `severity`, `probable_causes`, `recommended_actions`, `precautions`, `follow_up_schedule`, `expert_guidance`, `icar_fao_citations`
6. `digital_twin_snapshots`:
   - `id`: UUID (PK)
   - `plant_id`: UUID (FK to plants)
   - `chronological_age_days`, `expected_gdd`, `actual_gdd`, `expected_stage`, `actual_stage`, `deviation_days`, `deviation_status`, `deviation_reasons`

---

## 14. REST API Specification

| Method | Endpoint | Description | Request Payload | Response Type |
|---|---|---|---|---|
| `POST` | `/api/v1/plants/{id}/analyse` | Execute full AI Growth & Health Analysis | `observation_id` (opt), `image` (opt), `manual_stage` (opt) | `PlantAnalysisResponse` |
| `GET` | `/api/v1/plants/{id}/analyses` | List historical analysis reports | `limit` (Query) | `List[PlantAnalysisResponse]` |
| `GET` | `/api/v1/analyses/{id}` | Retrieve specific analysis report | None | `PlantAnalysisResponse` |
| `POST` | `/api/v1/analyses/{id}/feedback` | Submit farmer accuracy feedback | `{ feedback, notes }` | `{ status, message }` |
| `POST` | `/api/v1/plants/{id}/problems` | Report plant stress / problem | Multipart Form with optional image | `PlantProblemResponse` |
| `GET` | `/api/v1/plants/{id}/problems` | List reported problems & diagnoses | None | `List[PlantProblemResponse]` |
| `POST` | `/api/v1/problems/{id}/analyse` | Re-run AI problem diagnosis | None | `ProblemAnalysisResponse` |
| `GET` | `/api/v1/plants/{id}/digital-twin` | Retrieve Digital Twin & Radar | None | `DigitalTwinResponse` |
| `POST` | `/api/v1/plants/{id}/what-if` | Run What-If Growth Simulator | `{ soil_moisture_delta_pct, ... }` | `WhatIfResponse` |
| `GET` | `/api/v1/plants/{id}/next-observation` | Get Next Best Observation advice | None | `NextBestObservationData` |

---

## 15. Quality Assurance & Test Verification

The application was comprehensively verified across backend, frontend, computer vision, and end-to-end workflows:

1. **Pytest Backend Test Suite**:
   - Total Automated Tests: **34 tests**
   - Test Status: **34/34 Passing (100% Success)**
   - Test Coverage:
     - `test_authentication_and_multiuser.py`: Multi-tenant data isolation, JWT authentication, and OTP verification.
     - `test_banana_and_telemetry_accuracy.py`: Multi-crop phenology and telemetry query consistency.
     - `test_plant_analysis_engine.py`: Computer vision feature extraction, ANALYSE PLANT endpoint, Digital Twin, What-If simulator, and Problem Reporting.
     - `test_datasets_and_chatbot.py`: Agronomic knowledge retrieval and domain-constrained assistant.
     - `test_e2e_workflow.py`: Complete 21-step end-to-end lifecycle.
2. **Frontend Production Build**:
   - Bundler: Vite v8.3.6
   - TypeScript Compiler (`tsc -b`): **0 type errors**
   - Build Status: **Success (100% clean build)**
3. **HTTP Endpoint Verification**:
   - Live endpoints verified on `http://127.0.0.1:8000` via automated REST invocations.
   - Live UI accessible on `http://127.0.0.1:5173`.

---

## 16. Agricultural Extension & Expert Referral Workflow

When severe or spreading disease symptoms are detected (e.g., suspected vascular wilt or viral leaf curl), the platform instructs growers on proper diagnostic escalation:
1. **Isolation**: Tag and isolate affected plants to prevent mechanical vector transmission.
2. **Sample Collection**: Collect intact symptomatic leaves (including petiole and margin) in clean, dry paper envelopes (never moist plastic bags which accelerate saprophytic rot).
3. **Institutional Referral**: Bring samples to the nearest **Krishi Vigyan Kendra (KVK)** or State Agricultural University Plant Pathology Diagnostic Clinic for PCR/microscopic validation.

---
*PlantPulse AI — Autonomous Agricultural Phenology, Digital Twin, and Growth Intelligence Engine.*
