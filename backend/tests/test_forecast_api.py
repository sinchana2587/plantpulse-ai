from datetime import date

def test_forecast_generation_and_chronology(client):
    # 1. Create plant
    plant_res = client.post("/api/v1/plants", json={
        "name": "Forecast Chronology Tomato",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": "2026-03-01",
        "location": "Sector 4"
    })
    plant_id = plant_res.json()["id"]

    # 2. Add an observation at Flowering stage
    client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data={
            "temperature": 25.0,
            "humidity": 62.0,
            "soil_moisture": 52.0,
            "sunlight_hours": 8.5,
            "manual_growth_stage": "Flowering"
        }
    )

    # 3. Generate forecast
    fc_res = client.post(f"/api/v1/plants/{plant_id}/forecast")
    assert fc_res.status_code == 200
    fc_data = fc_res.json()

    assert fc_data["current_stage"] == "Flowering"
    assert fc_data["method"] == "Phenology-GDD Hybrid Forecaster"
    assert "environmental_factors" in fc_data
    assert "assumptions" in fc_data
    assert "limitations" in fc_data
    assert "recommendations" in fc_data

    # Check that milestone windows exist and maintain logical sequence
    fruit_win = fc_data["fruit_formation_window"]
    maturity_win = fc_data["maturity_window"]
    harvest_win = fc_data["harvest_window"]

    assert fruit_win["start"] is not None
    assert maturity_win["start"] is not None
    assert harvest_win["start"] is not None

    # Fruit Formation start <= Maturity start <= Harvest start
    assert fruit_win["start"] <= maturity_win["start"]
    assert maturity_win["start"] <= harvest_win["start"]

def test_dashboard_and_demo_seed(client):
    # Seed demo data
    seed_res = client.post("/api/v1/dashboard/seed-demo")
    assert seed_res.status_code == 200
    demo_plant_id = seed_res.json()["plant_id"]

    # Check dashboard API
    dash_res = client.get("/api/v1/dashboard")
    assert dash_res.status_code == 200
    dash_data = dash_res.json()

    assert dash_data["total_plants"] >= 1
    assert dash_data["monitored_plants"] >= 1
    assert len(dash_data["stage_distribution"]) > 0
    assert len(dash_data["recent_observations"]) > 0

    # Reset demo data
    reset_res = client.post("/api/v1/dashboard/reset-demo")
    assert reset_res.status_code == 200
