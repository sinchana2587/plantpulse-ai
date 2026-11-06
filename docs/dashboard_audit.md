# PlantPulse AI — Complete Dashboard Audit Report

**Date:** 2026-11-06  
**Auditor Roles:** Principal Full-Stack Engineer, Database Architect, Senior QA Automation Engineer  
**Scope:** Frontend Components, Backend APIs, Database Schemas, Telemetry, AI Pipelines, and Test Suites

---

## 1. Executive Summary

This audit assesses the state of the PlantPulse AI dashboard against the hackathon problem statement and the user-reported issues:
1. Crop selection logic was artificially constrained to Tomato only.
2. Dashboard KPI cards and Telemetry Environment parameters were non-interactive static `<div>`s.
3. Telemetry summary lacked granular date-range filtering, parameter-level drilldowns, and multi-source tracking (IoT vs. manual vs. imported).
4. Observation records in demo seeds contained fixed scores (e.g. `confidence_score = 0.98`), and the recent observation cards lacked plant metadata, crop association, and paginated querying.
5. No dedicated endpoints existed for crop catalog management or granular telemetry queries.

---

## 2. Dashboard Element Data Source Tracing

| Dashboard Element | Render Location | Data Source & Path | Type of Source | Verified / Issues Identified |
| :--- | :--- | :--- | :--- | :--- |
| **Welcome Banner** | `DashboardView.tsx:53-79` | Static text in component; button triggers `onOpenAddPlant` | Frontend Static | Text is static; "Register Plant" button works. |
| **TOTAL PLANTS** | `DashboardView.tsx:83-95` | `data.total_plants`, computed in `dashboard_service.py:20` via `db.query(Plant).count()` | Database Query | **Data is real from DB.** Issue: Card is a plain `<div>`, non-clickable, no navigation to My Plants with filtering. |
| **Monitored Plants Subtext** | `DashboardView.tsx:91-93` | `data.monitored_plants`, computed in `dashboard_service.py:23-24` | Database Query | **Data is real from DB.** Distinct plant IDs in observations. |
| **UPCOMING MILESTONES** | `DashboardView.tsx:96-106` | `data.upcoming_milestones.length`, computed in `dashboard_service.py:36-102` | Backend Calculation | **Data is real from DB/forecasts.** Issue: Card is non-clickable; clicking does not navigate to Predictions. |
| **AVG ROOT ZONE MOISTURE** | `DashboardView.tsx:107-119` | `env.average_soil_moisture`, computed in `dashboard_service.py:136,143` | Backend Aggregation | **Data is real from DB.** Issue: Card is non-clickable; lacks time-series drilldown, min/max metrics, and date filtering. |
| **ATTENTION ALERTS** | `DashboardView.tsx:120-130` | `data.plants_requiring_attention.length`, computed in `dashboard_service.py:104-121` | Backend Logic | **Data is real from DB readings.** Issue: Card is non-clickable; no dedicated alert acknowledgment/resolution page. |
| **Crop Growth Stage Distribution** | `DashboardView.tsx:136-158` | `data.stage_distribution`, aggregated in `dashboard_service.py:27-52` | Database Query & Aggregation | Real calculation. Cards are currently non-clickable. |
| **Predicted Upcoming Milestones List** | `DashboardView.tsx:160-220` | `data.upcoming_milestones`, mapped in `dashboard_service.py:61-102` | Backend Forecast Calculation | Real calculation. Each milestone item has `onClick={() => onSelectPlant(milestone.plant_id)}`. |
| **Recent Observations Stream** | `DashboardView.tsx:222-282` | `data.recent_observations`, queried in `dashboard_service.py:123-129` | Database Query (`limit(5)`) | Real DB records, but: limited to 5 records, lacks pagination, lacks crop/plant filters, and demo seed used fixed `0.98` confidence score. |
| **TELEMETRY ENVIRONMENT SUMMARY** | `DashboardView.tsx:286-342` | `data.environmental_overview`, computed in `dashboard_service.py:132-147` | Database Aggregation | **Data is real from DB**, but: aggregates all time, lacks date range picker, lacks source tracking, and all 5 cards are completely non-interactive. |
| **Attention Alerts List** | `DashboardView.tsx:344-378` | `data.plants_requiring_attention`, generated in `dashboard_service.py:104-121` | Backend Rule Engine | Clickable (navigates to plant). Lacks resolution/history tracking. |

---

## 3. Detailed Component Audits

### A. TOTAL PLANTS
- **Current Data Source:** `GET /api/v1/dashboard` -> `total_plants` field derived from `db.query(Plant).count()`.
- **Backend Endpoint:** `/api/v1/dashboard`
- **Database Relationship:** `plants` table count.
- **Interactivity State:** Non-interactive (`<div>`). No hover state, no pointer cursor.
- **Required Changes:**
  - Make card clickable with hover scale, pointer cursor, and focus outline.
  - On click, navigate to `My Plants` (`PlantsView`).
  - Pass filter states to display all registered plants, showing monitoring status, planting dates, and crop filter.

### B. UPCOMING MILESTONES
- **Current Data Source:** `GET /api/v1/dashboard` -> `upcoming_milestones.length`.
- **Backend Endpoint:** `/api/v1/dashboard`
- **Database Relationship:** `forecasts` where `is_latest == True` joined with `plants`.
- **Interactivity State:** Non-interactive KPI card.
- **Required Changes:**
  - Make card clickable.
  - On click, navigate to the `Growth Predictions` tab (`AnalyticsView` or focused prediction view).
  - Display all upcoming milestones (Flowering, Fruit Formation, Maturity, Harvest) with associated plant names, date ranges, prediction source, and uncertainty factors.

### C. AVG ROOT ZONE MOISTURE
- **Current Data Source:** `GET /api/v1/dashboard` -> `environmental_overview.average_soil_moisture`.
- **Backend Endpoint:** `/api/v1/dashboard`
- **Database Relationship:** `observations.soil_moisture` values.
- **Interactivity State:** Non-interactive KPI card.
- **Required Changes:**
  - Make card clickable.
  - On click, open a dedicated Environmental Insights modal or view focusing on Soil Moisture.
  - Show time-series trend line, minimum, maximum, and average values, individual plant readings, measurement sources (IoT vs. manual), and timestamps.

### D. ATTENTION ALERTS
- **Current Data Source:** `GET /api/v1/dashboard` -> `plants_requiring_attention`.
- **Backend Endpoint:** `/api/v1/dashboard`
- **Database Relationship:** Evaluated from latest `observations` per plant (moisture < 40% or temp > 33°C / < 14°C).
- **Interactivity State:** KPI card is non-interactive. Individual list items in sidebar navigate to plant.
- **Required Changes:**
  - Make KPI card clickable.
  - Open a dedicated Alerts Manager modal/page displaying all active alerts, resolved alerts, responsible readings, timestamps, and acknowledgment actions.

### E. TELEMETRY ENVIRONMENT SUMMARY
- **Current Data Source:** Unfiltered query over all `observations` in database.
- **Backend Endpoint:** `/api/v1/dashboard`
- **Parameters Displayed:**
  1. Mean Temperature (°C)
  2. Mean Soil Moisture (%)
  3. Relative Humidity (%)
  4. Daily Sunlight (hrs)
  5. Recorded Precipitation (mm)
- **Interactivity State:** All 5 parameter cards are static `<div>`s. Clicking does nothing.
- **Required Changes:**
  - Implement dedicated telemetry endpoints:
    - `GET /api/v1/telemetry/summary` (supports date ranges: 24h, 7d, 30d, 90d, all, custom)
    - `GET /api/v1/telemetry/readings` (supports filtering by crop, plant, parameter, source)
    - `GET /api/v1/telemetry/plants/{plant_id}`
    - `POST /api/v1/telemetry/readings` (supports ingesting validated sensor readings)
  - Add date range filtering selector to the dashboard summary.
  - Make every parameter card clickable, opening an interactive detailed modal with historical graph, individual readings, sensor/source badges, and calculation breakdown.

### F. RECENT OBSERVATIONS STREAM
- **Current Data Source:** `db.query(Observation).order_by(observation_date.desc()).limit(5).all()`.
- **Issues Found:**
  - `ObservationResponse` lacks `plant_name` and `crop_type`.
  - In demo seeds, `confidence_score` was hardcoded to `0.98` (resulting in a static `98% score` pill).
  - No pagination, search, or filtering by crop, plant, or stage.
- **Required Changes:**
  - Implement full-featured `GET /api/v1/observations` endpoint with pagination (`page`, `page_size`), search, plant filter, crop filter, stage filter, and date sorting.
  - Include `plant_name` and `crop_type` in responses.
  - Only render confidence score percentage when an actual AI visual inference took place. If unanalyzed or manual, display appropriate label ("Manual" or "Not analysed").
  - On observation card click, open an Observation Details modal showing full image, telemetry, model metadata, and "Inspect Plant" button.
  - Provide a clear, actionable empty state with a functional "Add Observation" button when no observations exist.

---

## 4. Multi-Crop Registration Audit

### Why Only Tomato Appears:
In `frontend/src/views/AddPlantModal.tsx`:
```tsx
<select
  value={cropType}
  onChange={(e) => setCropType(e.target.value)}
  ...
>
  <option value="Tomato">Tomato (Solanum lycopersicum)</option>
</select>
```
1. The dropdown in `AddPlantModal.tsx` contains only a single hardcoded `<option>` element.
2. In `backend/app/models/plant.py`, `crop_type` defaults to `"Tomato"`.
3. There is no crop catalog endpoint (`GET /api/v1/crops`) in the backend.

### Required Architecture:
- Create `backend/app/api/v1/endpoints/crops.py` with standard catalog:
  1. Tomato (*Solanum lycopersicum*)
  2. Chilli (*Capsicum annuum*)
  3. Brinjal / Eggplant (*Solanum melongena*)
  4. Okra / Lady's Finger (*Abelmoschus esculentus*)
  5. Cucumber (*Cucumis sativus*)
- Provide crop-specific varieties and agronomic GDD parameters.
- Transparently expose model availability: `Tomato` has visual classification model enabled; `Chilli`, `Brinjal`, `Okra`, `Cucumber` have manual classification enabled with model standby status.
