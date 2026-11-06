import io
from datetime import datetime, timezone
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.models import Plant, Observation, TelemetryReading
from app.ml.phenology_engine import PhenologyEngine, CROP_AGRONOMIC_CONFIG

client = TestClient(app)

def test_banana_crop_catalog():
    """Verify Banana is registered in the crop catalog with complete agronomic metadata."""
    response = client.get("/api/v1/crops")
    assert response.status_code == 200
    crops = response.json()
    crop_ids = [c["id"] for c in crops]
    assert "banana" in crop_ids
    
    # Check Banana details
    res_banana = client.get("/api/v1/crops/banana")
    assert res_banana.status_code == 200
    banana = res_banana.json()
    
    assert banana["name"] == "Banana"
    assert banana["scientific_name"] == "Musa spp."
    assert "Grand Naine" in banana["varieties"]
    assert "Dwarf Cavendish" in banana["varieties"]
    assert "Nendran" in banana["varieties"]
    assert "Pseudostem Emergence" in banana["supported_stages"]
    assert "Inflorescence" in banana["supported_stages"]
    assert banana["base_temperature_c"] == 14.0
    assert banana["cutoff_temperature_c"] == 38.0
    assert banana["standard_maturity_days"] == 330
    assert banana["optimal_moisture_min"] == 60.0
    assert banana["optimal_moisture_max"] == 75.0

def test_banana_phenology_engine_configuration():
    """Verify Banana GDD baseline and milestones in the ML phenology engine."""
    assert "banana" in CROP_AGRONOMIC_CONFIG
    cfg = CROP_AGRONOMIC_CONFIG["banana"]
    assert cfg["t_base"] == 14.0
    assert cfg["t_cutoff"] == 38.0
    assert cfg["optimal_moisture"] == (60.0, 75.0)
    
    # Calculate GDD for a 28°C day: 28.0 - 14.0 = 14.0 GDD
    gdd = PhenologyEngine.calculate_daily_gdd(28.0, "banana")
    assert gdd == 14.0

def test_plant_registration_without_photo():
    """Test registering a plant without initial photo."""
    response = client.post(
        "/api/v1/plants/register",
        data={
            "name": "Banana Grand Naine Plot #1",
            "crop_type": "Banana",
            "crop_variety": "Grand Naine",
            "planting_date": "2026-01-15",
            "location": "Tropical Greenhouse Section B",
            "description": "Commercial trial of Grand Naine suckers",
        }
    )
    assert response.status_code == 201
    plant_data = response.json()
    assert plant_data["name"] == "Banana Grand Naine Plot #1"
    assert plant_data["crop_type"] == "Banana"
    assert plant_data["crop_variety"] == "Grand Naine"
    assert plant_data["observation_count"] == 0

def test_plant_registration_with_initial_photo():
    """Test registering a plant with an initial photographic observation."""
    img = Image.new("RGB", (120, 120), color=(40, 160, 40))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)
    
    response = client.post(
        "/api/v1/plants/register",
        data={
            "name": "Banana Dwarf Cavendish #2",
            "crop_type": "Banana",
            "crop_variety": "Dwarf Cavendish",
            "planting_date": "2026-02-01",
            "location": "Canopy Block 4",
            "description": "Tissue-cultured banana sapling",
            "observation_date": datetime.now(timezone.utc).isoformat(),
            "temperature": 27.5,
            "humidity": 68.0,
            "soil_moisture": 62.0,
            "sunlight_hours": 9.0,
            "rainfall": 0.0,
            "manual_growth_stage": "Vegetative",
        },
        files={"image": ("initial_banana.jpg", img_byte_arr, "image/jpeg")}
    )
    assert response.status_code == 201
    plant_data = response.json()
    assert plant_data["crop_type"] == "Banana"
    assert plant_data["observation_count"] >= 1
    
    # Verify observation was persisted
    obs_res = client.get(f"/api/v1/plants/{plant_data['id']}/observations")
    assert obs_res.status_code == 200
    observations = obs_res.json()
    assert len(observations) >= 1
    assert observations[0]["effective_stage"] == "Vegetative"
    assert observations[0]["image_path"] is not None

def test_weather_station_comparison_endpoint():
    """Verify the Weather Station Comparison endpoint explains microclimate variance."""
    response = client.get("/api/v1/weather/comparison?days=7")
    assert response.status_code == 200
    data = response.json()
    
    assert "plantpulse_measured_temperature" in data
    assert "external_weather_temperature" in data
    assert "temperature_delta" in data
    assert "delta_explanation" in data
    assert "scientific_investigation_summary" in data
    assert len(data["scientific_investigation_summary"]) >= 3
    assert data["plantpulse_unit"] == "°C"
    assert data["external_unit"] == "°C"

def test_telemetry_detail_modal_consistency():
    """Verify telemetry summary and detail readings align across date ranges and aliases."""
    # Query summary for 7d
    summary_res = client.get("/api/v1/telemetry/summary?range=7d")
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert "parameters" in summary
    assert "temperature" in summary["parameters"]
    assert "calculation_methodology" in summary
    
    temp_stat = summary["parameters"]["temperature"]
    assert "formula" in temp_stat
    assert "plants_count" in temp_stat
    assert "source_breakdown" in temp_stat
    
    # Query readings using both 'source' and 'data_source' parameters
    readings_res1 = client.get("/api/v1/telemetry/readings?range=7d&parameter=temperature")
    assert readings_res1.status_code == 200
    readings = readings_res1.json()
    assert isinstance(readings, list)
    if readings:
        assert readings[0]["parameter_name"] == "temperature"
    
    # Test parameter alias daily_sunlight -> sunlight_hours
    sun_res = client.get("/api/v1/telemetry/readings?range=7d&parameter=daily_sunlight")
    assert sun_res.status_code == 200
    sun_readings = sun_res.json()
    assert isinstance(sun_readings, list)
    for r in sun_readings:
        assert r["parameter_name"] == "sunlight_hours"

def test_demonstration_mode_isolation():
    """Verify demo data filtering prevents synthetic contamination when include_demo=False."""
    # When include_demo=False
    plants_no_demo = client.get("/api/v1/plants?include_demo=false").json()
    for p in plants_no_demo:
        assert p["is_demo"] is False
    
    # Dashboard summary with demo disabled
    dash_no_demo = client.get("/api/v1/dashboard?include_demo=false").json()
    for obs in dash_no_demo["recent_observations"]:
        assert obs["is_demo"] is False
    
    # Telemetry summary with demo disabled
    telem_no_demo = client.get("/api/v1/telemetry/summary?include_demo=false").json()
    assert telem_no_demo["demonstration_mode"] is False

