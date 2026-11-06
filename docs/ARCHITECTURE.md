# PlantPulse AI — Architectural Specification

## 1. System Context & Intent
PlantPulse AI is an enterprise-grade agricultural intelligence application engineered to evaluate the chronological morphological development of tomato crops (*Solanum lycopersicum*) and forecast subsequent phenological transitions.

## 2. Architectural Layers

### A. Presentation Layer (Frontend)
- **Framework:** React 19, TypeScript
- **Build Tool:** Vite with Rolldown bundling
- **Design System:** Tailwind CSS v4, Lucide Icons, nature-inspired palette (Forest Green `#14532d`, Emerald `#15803d`, Sage `#86efac`)
- **Telemetry Visualizations:** Recharts multi-axis line/area charts
- **State Management:** Reactive component hooks with centralized typed API client (`ApiClient`)

### B. Application & API Layer (Backend)
- **Framework:** FastAPI
- **Validation:** Pydantic v2
- **Data Persistence:** SQLAlchemy 2.0 ORM with SQLite backend (prepared for seamless PostgreSQL migration)
- **Security & Sandboxing:** Unique UUID filenames, Pillow header validation, strict path resolution checks prohibiting directory traversal.

### C. Artificial Intelligence & Forecasting Layer
1. **Botanical Feature Extractor:**
   - Evaluates 20 visual dimensions:
     - Color distributions across RGB and HSV spaces
     - Green Leaf Index: \(GLI = \frac{2G - R - B}{2G + R + B}\)
     - Excess Green Index: \(ExG = 2G - R - B\)
     - Floral yellow chrominance ratio (tomato bloom detection)
     - Ripening red lycopene chrominance ratio
     - Texture gradient entropy
     - Canopy ground coverage ratio
2. **Growth-Stage Classifier:**
   - Multi-class Random Forest with 120 estimators
   - Identifies: `Seedling`, `Vegetative`, `Flowering`, `Fruit Formation`, `Maturity`
   - Yields calibrated softmax probability distribution across stages.
3. **Phenology & GDD Hybrid Milestone Forecaster:**
   - Thermal base: \(T_{base} = 10.0^\circ\text{C}\), cutoff \(T_{cutoff} = 34.0^\circ\text{C}\)
   - Daily Growing Degree Days: \(GDD = \max(0, \min(T_{mean}, 34.0) - 10.0)\)
   - Multipliers for environmental stress:
     - Soil Moisture Stress (<45% or >75%)
     - Sunlight Photoperiod (<5.0 hrs)
     - Temperature Inversion (<16°C or >32°C)
     - Variety scaling (Cherry Tomato: 0.88x; Beefsteak: 1.12x; Roma: 1.0x)

## 3. Entity-Relationship Schema

```
┌─────────────────────────────────┐
│              Plant              │
├─────────────────────────────────┤
│ id: String (UUID, PK)           │
│ name: String                    │
│ crop_type: String               │
│ crop_variety: String            │
│ planting_date: Date             │
│ location: String                │
│ is_demo: Boolean                │
│ created_at: DateTime            │
│ updated_at: DateTime            │
└──────────────┬──────────────────┘
               │ 1
               │
               │ *
┌──────────────┴──────────────────┐        ┌─────────────────────────────────┐
│           Observation           │        │            Forecast             │
├─────────────────────────────────┤        ├─────────────────────────────────┤
│ id: String (UUID, PK)           │        │ id: String (UUID, PK)           │
│ plant_id: String (FK)           │        │ plant_id: String (FK)           │
│ observation_date: DateTime      │        │ forecast_date: DateTime         │
│ image_path: String (Optional)   │        │ current_stage: String           │
│ temperature: Float              │        │ method: String                  │
│ humidity: Float                 │        │ flowering_window: DateRange     │
│ soil_moisture: Float            │        │ fruit_formation_window: Date... │
│ sunlight_hours: Float           │        │ maturity_window: DateRange      │
│ rainfall: Float                 │        │ harvest_window: DateRange       │
│ ai_growth_stage: String         │        │ environmental_factors_json: Str │
│ manual_growth_stage: String     │        │ recommendations_json: String    │
│ confidence_score: Float         │        │ is_latest: Boolean              │
│ is_demo: Boolean                │        └─────────────────────────────────┘
└─────────────────────────────────┘
```
