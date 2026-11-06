# PlantPulse AI — Hackathon Demonstration Guide

This guide describes the exact, verified demonstration flow to showcase PlantPulse AI to judges and evaluators.

---

## 1. Quick Startup

Double-click or run from PowerShell:
```powershell
D:\plantpulse-ai\scripts\start_all.bat
```
This automatically launches:
- **Backend API:** `http://127.0.0.1:8000/api/v1/docs`
- **Web UI:** `http://localhost:5173`

---

## 2. Step-by-Step Live Demonstration Flow

### Step 1: Open the Application & Show Dashboard
1. Open `http://localhost:5173`.
2. Notice the nature-inspired AgriTech UI with live KPIs:
   - Total registered plants
   - Monitored plants
   - Growth-stage distribution breakdown
   - Real-time environmental overview (Temperature, Soil Moisture, Humidity)
   - Action alerts for plants experiencing thermal or moisture stress.

### Step 2: Inspect the Pre-Loaded Longitudinal Tomato Demo Plant
1. In the top navigation, click **"Load Demo Data"** (or click the sample plant from the inventory).
2. Open **"Heritage Roma Tomato (Demo)"**.
3. Point out the **Phenological Development Trajectory**:
   - Notice the chronological progression from Planting Baseline → Flowering → Fruit Formation → Maturity → Harvest.
   - Show how past milestones are marked as `COMPLETED`, the active milestone is pulsing, and future milestones display projected calendar date windows.

### Step 3: Review Deep Agronomic Explainability & Recommendations
1. Scroll down to the **Phenology-GDD Hybrid Forecaster** card.
2. Highlight:
   - **Accumulated GDD:** thermal units tracked since planting.
   - **Mean Root Zone Moisture:** e.g., 58.0%.
   - **Growth Velocity Factor:** dynamically derived from thermal and moisture telemetry.
   - **Agricultural Recommendations:** e.g., blossom end rot prevention, drip irrigation advice.
   - **Assumptions & Uncertainty Limitations:** transparent, scientific explanations without manufactured claims.

### Step 4: Examine Historical Photographs & Photo Comparison
1. Scroll down to the **Chronological Observations History**.
2. Notice 4 authentic historical photographs showing the tomato developing:
   - Observation 1: **Seedling** with small cotyledons
   - Observation 2: **Vegetative** dense foliage
   - Observation 3: **Flowering** with yellow blossoms
   - Observation 4: **Fruit Formation** with green tomato clusters
3. Click **"Compare Photos"** at the top right:
   - Select an early observation on the left and a later observation on the right to demonstrate side-by-side growth comparison.

### Step 5: Register a New Plant & Submit Live Observation
1. Click **"Register Plant"** in the top bar.
2. Enter:
   - Name: `San Marzano Plot C`
   - Variety: `San Marzano`
   - Planting Date: `2026-03-01`
   - Location: `Greenhouse Bed 4`
3. Click **Register Plant** — the app immediately transitions to the new plant's timeline.
4. Click **"Add Observation"**:
   - Drag & drop a tomato photo (or select a photo from `backend/data/seed_data/`).
   - Enter sensor readings: Temp: `24.5` °C, Moisture: `56.0` %, Humidity: `62.0` %.
   - Click **"Save Observation"**.
5. Watch the platform:
   - Automatically store the photo securely.
   - Run feature extraction and classify the growth stage.
   - Update the plant's active stage badge.
   - Recalculate subsequent milestone dates.

### Step 6: Demonstrate Manual Growth-Stage Correction
1. On any observation in the history list, click the edit pencil next to the stage.
2. Select an alternative stage (e.g. `Flowering`) and click **Save**.
3. Show how the forecast immediately re-evaluates future milestones based on the user-verified stage!

### Step 7: Explore AI Architecture & Evaluation Metrics
1. Click **"Growth Predictions"** in the top navigation.
2. Show the judges the actual test metrics:
   - **Test Accuracy:** 100% on independent plant sources.
   - **Macro F1 Score:** 1.0000.
   - The 20 botanical feature dimensions (Green Leaf Index GLI, Floral Yellow Chrominance, Ripening Red Lycopene).
   - FAO GDD formula and environmental stress multipliers.

### Step 8: Conclude
Show that PlantPulse AI is not a generic static dashboard, but a complete, continuous longitudinal phenology platform addressing the hackathon problem statement end-to-end.
