# PlantPulse AI — REST API Documentation

Base URL: `http://127.0.0.1:8000/api/v1`  
Swagger Interactive UI: `http://127.0.0.1:8000/api/v1/docs`  
OpenAPI Specification: `http://127.0.0.1:8000/api/v1/openapi.json`

---

## 1. System Endpoints

### `GET /health`
Returns system operational status, version, and database connection.
- **Response `200 OK`**:
```json
{
  "status": "online",
  "service": "PlantPulse AI",
  "version": "1.0.0",
  "database": "connected"
}
```

---

## 2. Plant Management Endpoints

### `GET /api/v1/plants`
Retrieves all registered crops.
- **Query Parameters**: `skip` (int, default: 0), `limit` (int, default: 100)
- **Response `200 OK`**: Array of `PlantResponse` objects.

### `POST /api/v1/plants`
Registers a new plant.
- **Body**:
```json
{
  "name": "Roma Tomato Plot 4",
  "crop_type": "Tomato",
  "crop_variety": "Roma",
  "planting_date": "2026-03-01",
  "location": "Greenhouse Plot 4"
}
```
- **Response `201 Created`**: Registered `PlantResponse`.

### `GET /api/v1/plants/{plant_id}`
Retrieves details of a single plant.

### `PUT /api/v1/plants/{plant_id}`
Updates details of an existing plant.

### `DELETE /api/v1/plants/{plant_id}`
Cascades deletion of plant, historical observations, and forecasts.

---

## 3. Observation Management Endpoints

### `GET /api/v1/plants/{plant_id}/observations`
Retrieves chronological observation records for the plant.

### `POST /api/v1/plants/{plant_id}/observations`
Uploads a new observation with optional photograph and environmental telemetry.
- **Form Data**:
  - `observation_date` (ISO string, optional)
  - `temperature` (float, °C)
  - `humidity` (float, %)
  - `soil_moisture` (float, %)
  - `sunlight_hours` (float, hrs)
  - `rainfall` (float, mm)
  - `manual_growth_stage` (string, optional)
  - `image` (binary file, multipart/form-data)
- **Response `201 Created`**: Created `ObservationResponse`.

### `POST /api/v1/observations/{observation_id}/analyse`
Triggers visual AI growth-stage classification on an existing observation photograph.
- **Response `200 OK`**:
```json
{
  "observation_id": "...",
  "plant_id": "...",
  "predicted_stage": "Vegetative",
  "confidence_score": 0.98,
  "model_version": "1.0.0",
  "stage_scores": {
    "Seedling": 0.01,
    "Vegetative": 0.98,
    "Flowering": 0.01,
    "Fruit Formation": 0.00,
    "Maturity": 0.00
  },
  "source": "RandomForestBotanicalVisionClassifier",
  "analysis_summary": "Morphological characteristics consistent with Vegetative stage."
}
```

### `PATCH /api/v1/observations/{observation_id}/stage`
Manually overrides or verifies the observation's growth stage.
- **Body**:
```json
{
  "manual_growth_stage": "Flowering"
}
```

---

## 4. Forecasting Endpoints

### `GET /api/v1/plants/{plant_id}/forecast`
Retrieves the latest developmental forecast for the plant.

### `POST /api/v1/plants/{plant_id}/forecast`
Recalculates developmental milestone windows using cumulative GDD and updated environmental observations.

### `GET /api/v1/plants/{plant_id}/forecast/history`
Retrieves historical versions of forecasts for longitudinal comparison.

---

## 5. Dashboard & Demonstration Data Endpoints

### `GET /api/v1/dashboard`
Returns live calculated KPIs, stage distribution, upcoming milestones, recent observation stream, and attention alerts.

### `POST /api/v1/dashboard/seed-demo`
Loads or verifies the multi-stage demonstration Roma tomato plant.

### `POST /api/v1/dashboard/reset-demo`
Safely resets demonstration records to baseline without touching genuine user crops.

### `GET /api/v1/models/status`
Returns visual AI model status, test metrics, and operational readiness.
