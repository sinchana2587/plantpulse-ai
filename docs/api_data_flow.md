# PlantPulse AI — API Data Flow & Contract Specification

**Date:** 2026-11-06  
**Auditor:** Database Architect & Principal Software Engineer  
**Objective:** End-to-end data flow tracing from database entities to API contracts and frontend views.

---

## 1. End-to-End Architectural Data Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as User / IoT Sensor
    participant FE as React Frontend (Dashboard / Views)
    participant API as FastAPI Backend (/api/v1)
    participant DB as SQLite / PostgreSQL Database
    participant ML as ML & Phenology Engine

    Note over User,DB: Multi-Crop Registration Flow
    User->>FE: Open Add Plant Modal
    FE->>API: GET /api/v1/crops
    API-->>FE: Return 5 Crops (Tomato, Chilli, Brinjal, Okra, Cucumber) + Varieties
    User->>FE: Fill form (Name, Crop, Variety, Planting Date, Location)
    FE->>API: POST /api/v1/plants
    API->>DB: INSERT INTO plants (...)
    DB-->>API: Plant record created
    API-->>FE: 201 Created (PlantResponse)

    Note over User,DB: Observation & Telemetry Ingestion Flow
    User->>FE: Upload Photograph + Sensor Measurements
    FE->>API: POST /api/v1/plants/{plant_id}/observations
    API->>ML: Evaluate Crop AI Support
    alt Crop is Tomato (Model Available)
        ML->>ML: Extract 20 Botanical Features -> Predict Stage
        ML-->>API: Classification & Calibrated Probability
    else Crop is Unsupported (Chilli, Brinjal, Okra, Cucumber)
        ML-->>API: Model Standby Status (Manual Classification Only)
    end
    API->>DB: INSERT INTO observations (...)
    API->>DB: INSERT INTO telemetry_readings (...)
    API->>ML: PhenologyEngine.predict_milestones(crop_type, GDD, observations)
    ML-->>API: Milestone windows & Recommendations
    API->>DB: INSERT INTO forecasts (...)
    API-->>FE: 201 Created (ObservationResponse with Forecast updated)

    Note over User,DB: Dashboard & Telemetry Aggregation Flow
    FE->>API: GET /api/v1/dashboard
    API->>DB: SELECT COUNT(*) FROM plants
    API->>DB: SELECT COUNT(DISTINCT plant_id) FROM observations
    API->>DB: Query latest forecasts for upcoming milestones
    API->>DB: Query observations for stage distribution & alerts
    API-->>FE: DashboardResponse (Real DB data)

    FE->>API: GET /api/v1/telemetry/summary?range=7d&parameter=soil_moisture
    API->>DB: SELECT AVG, MIN, MAX FROM telemetry_readings WHERE date >= 7d ago
    API-->>FE: TelemetrySummaryResponse (Traceable, Date-filtered)

    FE->>API: GET /api/v1/observations?page=1&page_size=10&crop_type=Chilli
    API->>DB: SELECT * FROM observations JOIN plants ... LIMIT 10 OFFSET 0
    API-->>FE: PaginatedObservationsResponse
```

---

## 2. API Contract Enhancements

### A. Crop Catalog API
- `GET /api/v1/crops`:
  Returns array of available crops:
  ```json
  [
    {
      "id": "tomato",
      "name": "Tomato",
      "scientific_name": "Solanum lycopersicum",
      "varieties": ["Roma", "Cherry", "San Marzano", "Beefsteak"],
      "supported_stages": ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
      "has_ai_vision_model": true,
      "has_forecasting_model": true,
      "base_temperature_c": 10.0,
      "cutoff_temperature_c": 34.0,
      "is_active": true
    },
    {
      "id": "chilli",
      "name": "Chilli",
      "scientific_name": "Capsicum annuum",
      "varieties": ["Pusa Jwala", "Bird's Eye", "Bell Pepper", "Bhut Jolokia"],
      "supported_stages": ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
      "has_ai_vision_model": false,
      "has_forecasting_model": true,
      "base_temperature_c": 12.0,
      "cutoff_temperature_c": 35.0,
      "is_active": true
    },
    {
      "id": "brinjal",
      "name": "Brinjal (Eggplant)",
      "scientific_name": "Solanum melongena",
      "varieties": ["Pusa Purple Long", "Black Beauty", "Round Purple"],
      "supported_stages": ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
      "has_ai_vision_model": false,
      "has_forecasting_model": true,
      "base_temperature_c": 12.0,
      "cutoff_temperature_c": 35.0,
      "is_active": true
    },
    {
      "id": "okra",
      "name": "Okra (Lady's Finger)",
      "scientific_name": "Abelmoschus esculentus",
      "varieties": ["Pusa Sawani", "Arka Anamika", "Clemson Spineless"],
      "supported_stages": ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
      "has_ai_vision_model": false,
      "has_forecasting_model": true,
      "base_temperature_c": 15.0,
      "cutoff_temperature_c": 38.0,
      "is_active": true
    },
    {
      "id": "cucumber",
      "name": "Cucumber",
      "scientific_name": "Cucumis sativus",
      "varieties": ["Japanese Long", "Poona Kheera", "Poinsett"],
      "supported_stages": ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"],
      "has_ai_vision_model": false,
      "has_forecasting_model": true,
      "base_temperature_c": 10.0,
      "cutoff_temperature_c": 35.0,
      "is_active": true
    }
  ]
  ```

### B. Dedicated Telemetry Endpoints
- `GET /api/v1/telemetry/summary`:
  - **Query Params:** `range` (e.g. `24h`, `7d`, `30d`, `90d`, `all`), `plant_id`, `crop_type`
  - **Response:**
    - `period`: string label
    - `readings_count`: total measurements in period
    - `mean_temperature`: float or null
    - `mean_soil_moisture`: float or null
    - `relative_humidity`: float or null
    - `daily_sunlight_hours`: float or null
    - `total_precipitation`: float or null
    - `source_breakdown`: object showing counts for `IOT_SENSOR`, `MANUAL_ENTRY`, `EXTERNAL_IMPORT`
- `GET /api/v1/telemetry/readings`:
  - **Query Params:** `parameter` (`temperature`, `soil_moisture`, etc.), `range`, `plant_id`, `crop_type`
  - **Response:** Array of historical timestamped readings with units and data sources.
- `POST /api/v1/telemetry/readings`:
  - Validates and ingests standalone IoT or manual readings.

### C. Paginated Observations Endpoint
- `GET /api/v1/observations`:
  - **Query Params:** `page` (default 1), `page_size` (default 10), `crop_type`, `plant_id`, `growth_stage`, `search`
  - **Response:**
    ```json
    {
      "items": [
        {
          "id": "...",
          "plant_id": "...",
          "plant_name": "...",
          "crop_type": "...",
          "observation_date": "...",
          "image_path": "...",
          "temperature": 24.5,
          "humidity": 60.0,
          "soil_moisture": 55.0,
          "sunlight_hours": 8.0,
          "rainfall": 0.0,
          "effective_stage": "Flowering",
          "ai_growth_stage": "Flowering",
          "manual_growth_stage": null,
          "confidence_score": 0.94,
          "model_version": "1.0.0",
          "is_demo": false
        }
      ],
      "total": 24,
      "page": 1,
      "page_size": 10,
      "pages": 3
    }
    ```
