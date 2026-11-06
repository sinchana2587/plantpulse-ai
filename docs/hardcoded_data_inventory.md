# PlantPulse AI — Hardcoded Data & Static Content Inventory

**Date:** 2026-11-06  
**Auditor:** Principal Full-Stack Engineer  
**Objective:** Comprehensive catalog of all hardcoded arrays, mock elements, static percentages, and unverified data values across the frontend and backend.

---

## 1. Inventory of Identified Hardcoded Items

### Item 1: Fixed 98% Confidence Score in Seeded Observations
- **File:** `backend/app/services/demo_service.py:109-110`
- **Code:**
  ```python
  confidence_score = 0.98,
  stage_scores_json = json.dumps({cfg["stage"]: 0.98}),
  ```
- **Impact:** Causes the frontend Recent Observations stream to display a fixed `98% score` pill on all seeded observations, giving the impression of fabricated AI certainty.
- **Resolution:** Run the actual classifier inference `classifier_instance.predict(dest_path)` during demo seeding, or omit confidence scores for historical baselines if unanalyzed.

### Item 2: Single-Option Hardcoded Crop Dropdown
- **File:** `frontend/src/views/AddPlantModal.tsx:89-95`
- **Code:**
  ```tsx
  <select value={cropType} onChange={(e) => setCropType(e.target.value)}>
    <option value="Tomato">Tomato (Solanum lycopersicum)</option>
  </select>
  ```
- **Impact:** Prevents users from registering Chilli, Brinjal, Okra, Cucumber, or any other crop.
- **Resolution:** Remove hardcoded `<option>` and populate dynamically from `GET /api/v1/crops`.

### Item 3: Hardcoded Crop Varieties Dropdown
- **File:** `frontend/src/views/AddPlantModal.tsx:100-107`
- **Code:**
  ```tsx
  <select value={cropVariety} onChange={(e) => setCropVariety(e.target.value)}>
    <option value="Roma">Roma (Determinate)</option>
    <option value="Cherry">Cherry Tomato (Early)</option>
    <option value="San Marzano">San Marzano (Plum)</option>
    <option value="Beefsteak">Beefsteak (Indeterminate)</option>
  </select>
  ```
- **Impact:** Varieties are hardcoded only for Tomato varieties.
- **Resolution:** Populate varieties dynamically based on the selected crop's catalog definition.

### Item 4: Hardcoded Single-Crop Text in Inventory View
- **File:** `frontend/src/views/PlantsView.tsx:69`
- **Code:**
  ```tsx
  <p className="text-xs text-slate-500 mt-1">
    Browse registered tomato plants, review continuous observations, and access growth predictions.
  </p>
  ```
- **Impact:** Assumes all registered crops are tomato plants.
- **Resolution:** Update to general crop inventory wording and include crop filtering.

### Item 5: Hardcoded Limit of 5 Observations
- **File:** `backend/app/services/dashboard_service.py:126`
- **Code:**
  ```python
  recent_obs_records = db.query(Observation).order_by(Observation.observation_date.desc()).limit(5).all()
  ```
- **Impact:** Restricts Recent Observations stream to only 5 items with no pagination, search, or filtering.
- **Resolution:** Implement a full `GET /api/v1/observations` endpoint with pagination and multi-parameter filters.

### Item 6: Missing Plant & Crop Metadata in Observation Response
- **File:** `backend/app/schemas/observation.py:22-35`
- **Impact:** Observation response only provided `plant_id`. The frontend could not display plant name or crop type on observation cards.
- **Resolution:** Add `plant_name: Optional[str]` and `crop_type: Optional[str]` to `ObservationResponse`, populated via ORM join.

### Item 7: Static 0 mm Default Rainfall in Telemetry Summary
- **File:** `backend/app/services/dashboard_service.py:144`
- **Code:**
  ```python
  total_rainfall=round(float(sum(rains)), 1) if rains else 0.0
  ```
- **Impact:** Displays `0 mm` when no rainfall readings exist rather than indicating lack of measurement data.
- **Resolution:** Return `None` when no records exist and render `"No environmental data available"` on the frontend.

### Item 8: Non-Clickable Telemetry Parameter Cards
- **File:** `frontend/src/views/DashboardView.tsx:292-341`
- **Impact:** Mean Temperature, Mean Soil Moisture, Relative Humidity, Daily Sunlight, and Recorded Precipitation are static `<div>`s with no interactive drilldown.
- **Resolution:** Transform into interactive buttons with hover states, cursor-pointer, and modals displaying time-series charts, min/max/avg, and traceability.

---

## 2. Verification of Legitimate Data

The following data elements were audited and confirmed to be **genuine and backed by real database calculations**:
- `total_plants`: Real SQL count `db.query(Plant).count()`.
- `monitored_plants`: Real SQL distinct count `db.query(Observation.plant_id).distinct().count()`.
- `stage_distribution`: Real SQL query mapping effective stage from latest observations per plant.
- `upcoming_milestones`: Real calculation from `Forecast` records linked to plants in the database.
- `plants_requiring_attention`: Evaluated from real sensor readings (soil moisture < 40% or temp extremes).
- `recent_observations`: Real database queries over the `observations` table (no mock arrays).
