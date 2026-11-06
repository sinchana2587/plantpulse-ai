# PlantPulse AI — Detailed Implementation Plan

**Date:** 2026-11-06  
**Auditor:** Principal Full-Stack Engineer & Database Architect  
**Goal:** Methodical, zero-regression enhancement of the PlantPulse AI dashboard, integrating real multi-crop support, full interactivity, authentic telemetry, and rigorous testing.

---

## Phase 1: Database Schema & Backend Entities
1. **Plant Model Enhancement (`backend/app/models/plant.py`):**
   - Add `description` (Column(Text, nullable=True)).
   - Ensure `crop_type` accepts all 5 crops: `Tomato`, `Chilli`, `Brinjal`, `Okra`, `Cucumber`.
2. **Telemetry Reading Entity (`backend/app/models/telemetry.py`):**
   - Create `TelemetryReading` table:
     - `id`: UUID (PK)
     - `plant_id`: ForeignKey (`plants.id`)
     - `observation_id`: Optional ForeignKey (`observations.id`)
     - `parameter_name`: String (`temperature`, `soil_moisture`, `humidity`, `sunlight_hours`, `rainfall`)
     - `value`: Float
     - `unit`: String (`°C`, `%`, `hrs`, `mm`)
     - `timestamp`: DateTime
     - `data_source`: String (`MANUAL_ENTRY`, `IOT_SENSOR`, `EXTERNAL_IMPORT`)
     - `sensor_id`: Optional String
     - `validation_status`: String (`VALID`, `FLAGGED`, `REJECTED`)
3. **Pydantic Schemas Updates (`backend/app/schemas/`):**
   - `crop.py`: CropCatalogResponse, CropItem
   - `plant.py`: Include `description`
   - `observation.py`: Include `plant_name` and `crop_type` in `ObservationResponse`
   - `telemetry.py`: TelemetrySummaryResponse, TelemetryReadingCreate, TelemetryReadingResponse

---

## Phase 2: Crop Catalog & Multi-Crop Phenology
1. **Crop Catalog Endpoint (`backend/app/api/v1/endpoints/crops.py`):**
   - Implement `GET /api/v1/crops` and `GET /api/v1/crops/{crop_id}`.
   - Catalog data: Tomato, Chilli, Brinjal, Okra, Cucumber with varieties, scientific names, $T_{base}$, and model availability flags.
2. **Phenology Engine Crop Adaptation (`backend/app/ml/phenology_engine.py`):**
   - Add crop-specific base temperatures:
     - Tomato: 10.0°C
     - Chilli: 12.0°C
     - Brinjal: 12.0°C
     - Okra: 15.0°C
     - Cucumber: 10.0°C
   - Add crop-specific standard days and cumulative GDD thresholds.
3. **AI Vision Guardrail (`backend/app/ml/growth_stage_classifier.py`):**
   - If plant's crop is not Tomato, return `model_available = False` with message: *"Visual AI model active only for Tomato. Manual stage entry active for {crop_type}."*
   - Never fabricate scores for unsupported crops.

---

## Phase 3: Telemetry Service & Endpoints
1. **Telemetry Service (`backend/app/services/telemetry_service.py`):**
   - `get_summary(date_range, plant_id, crop_type)`: aggregates actual readings from DB.
   - `get_readings(parameter, date_range, plant_id)`: returns time-series points with data sources.
   - `record_reading(data)`: validates ranges and saves reading.
2. **Endpoints (`backend/app/api/v1/endpoints/telemetry.py`):**
   - `GET /api/v1/telemetry/summary`
   - `GET /api/v1/telemetry/readings`
   - `POST /api/v1/telemetry/readings`
3. **Observation Ingestion Sync:**
   - When an observation is created with environmental readings, automatically record matching `TelemetryReading` entries flagged with `MANUAL_ENTRY` or `IOT_SENSOR`.

---

## Phase 4: Observations API & Fixed Seed Data
1. **Global Observations Endpoint (`backend/app/api/v1/endpoints/observations.py`):**
   - Implement `GET /api/v1/observations` supporting `page`, `page_size`, `crop_type`, `plant_id`, `growth_stage`, `search`.
   - Returns paginated list with associated plant names and crop types.
2. **Remove Fixed 98% Confidence in Demo Service (`backend/app/services/demo_service.py`):**
   - Run genuine model inference `classifier_instance.predict(img_path)` on demo observation images so real scores are computed.

---

## Phase 5: Frontend Enhancement & Interactivity
1. **Dynamic Multi-Crop Registration (`AddPlantModal.tsx`):**
   - Fetch crop list dynamically from `GET /api/v1/crops`.
   - Update varieties dynamically upon selecting crop.
   - Add optional description input.
2. **Clickable Dashboard Cards (`DashboardView.tsx`):**
   - **Total Plants:** Clicks to My Plants with crop filters.
   - **Upcoming Milestones:** Clicks to Growth Predictions tab.
   - **Avg Root Zone Moisture:** Opens interactive Soil Moisture time-series modal.
   - **Attention Alerts:** Opens dedicated Alerts Manager modal.
   - **Telemetry Environment Parameters:** Clicking any of the 5 parameters opens a dedicated modal displaying date-filtered time-series charts, min/max/avg, and traceability.
   - Add Date Range Filter selector (24h, 7d, 30d, 90d, All) directly on the Telemetry Environment Summary.
3. **Recent Observations Stream Overhaul:**
   - Connect to `GET /api/v1/observations` with pagination and filters.
   - Display plant name and crop badge on every card.
   - Show confidence score only if AI-analyzed.
   - Clicking an observation opens an Observation Detail modal with full image, environmental metrics, and "Inspect Plant" button.
   - Comprehensive empty state with functional "Add Observation" action.

---

## Phase 6: Automated Testing & Verification
1. **Pytest Suite (`backend/tests/`):**
   - Test Crops Catalog API (`GET /api/v1/crops`, `GET /api/v1/crops/{crop_id}`).
   - Test Multi-Crop Plant Registration (Tomato, Chilli, Brinjal, Okra, Cucumber).
   - Test Telemetry Summary and Date Filtering (`24h`, `7d`, `30d`, `all`).
   - Test Paginated Observations Endpoint (`GET /api/v1/observations`).
   - Test Unsupported Crop AI Behavior (manual stage allowed, no fake inference).
2. **Frontend Production Build:** Verify TypeScript and bundle compilation.
3. **Master End-to-End Verification:** Register all 5 crops, submit observations, verify telemetry calculations, test interactive cards.

---

## Phase 7: Final Completion Report
- Produce `PLANTPULSE_DASHBOARD_FINAL_REPORT.md` documenting verified results, exact commands, and operational readiness.
