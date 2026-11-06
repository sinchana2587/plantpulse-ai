import pytest
from datetime import date, datetime, timedelta

def test_crop_catalog_api(client):
    res = client.get("/api/v1/crops")
    assert res.status_code == 200
    crops_list = res.json()
    assert isinstance(crops_list, list)
    assert len(crops_list) >= 5

    crops = {c["id"]: c for c in crops_list}
    expected_crops = ["tomato", "chilli", "brinjal", "okra", "cucumber"]
    for ec in expected_crops:
        assert ec in crops, f"Expected crop {ec} missing from catalog"
        crop_data = crops[ec]
        assert crop_data["name"] is not None
        assert crop_data["scientific_name"] is not None
        assert len(crop_data["varieties"]) > 0
        assert len(crop_data["supported_stages"]) > 0

    # Vision availability check
    assert crops["tomato"]["has_ai_vision_model"] is True
    assert crops["chilli"]["has_ai_vision_model"] is False
    assert crops["brinjal"]["has_ai_vision_model"] is False

    # Test single crop detail
    single_res = client.get("/api/v1/crops/chilli")
    assert single_res.status_code == 200
    assert single_res.json()["name"] == "Chilli"

    # Test nonexistent crop detail
    not_found = client.get("/api/v1/crops/dragonfruit")
    assert not_found.status_code == 404

def test_multicrop_plant_registration_and_filtering(client):
    crops_to_register = [
        {"name": "Plot 1 Jalapeno", "crop_type": "Chilli", "crop_variety": "Jalapeno", "location": "Tunnel B", "description": "High spice test"},
        {"name": "Plot 2 Black Beauty", "crop_type": "Brinjal", "crop_variety": "Black Beauty", "location": "Field 1", "description": "Organic mulch bed"},
        {"name": "Plot 3 Clemson Spineless", "crop_type": "Okra", "crop_variety": "Clemson Spineless", "location": "Plot 4", "description": "Warm climate trial"},
        {"name": "Plot 4 English Cucumber", "crop_type": "Cucumber", "crop_variety": "English Long", "location": "Trellis A", "description": "High hydration"}
    ]

    registered_ids = []
    for payload in crops_to_register:
        payload["planting_date"] = (date.today() - timedelta(days=20)).isoformat()
        res = client.post("/api/v1/plants", json=payload)
        assert res.status_code == 201
        plant_data = res.json()
        assert plant_data["crop_type"] == payload["crop_type"]
        assert plant_data["description"] == payload["description"]
        registered_ids.append(plant_data["id"])

    # Test filter by crop_type
    filter_res = client.get("/api/v1/plants?crop_type=Chilli")
    assert filter_res.status_code == 200
    chilli_plants = filter_res.json()
    assert all(p["crop_type"] == "Chilli" for p in chilli_plants)
    assert any(p["id"] == registered_ids[0] for p in chilli_plants)

def test_telemetry_recording_and_summary_ranges(client):
    plant_res = client.post("/api/v1/plants", json={
        "name": "Telemetry Station Plant",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": (date.today() - timedelta(days=30)).isoformat(),
        "location": "Sensory Greenhouse A"
    })
    assert plant_res.status_code == 201
    plant_id = plant_res.json()["id"]

    now = datetime.utcnow()
    readings = [
        {"plant_id": plant_id, "parameter_name": "temperature", "value": 24.5, "unit": "°C", "data_source": "IOT_SENSOR", "timestamp": (now - timedelta(hours=2)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "temperature", "value": 26.0, "unit": "°C", "data_source": "IOT_SENSOR", "timestamp": (now - timedelta(hours=5)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "soil_moisture", "value": 68.0, "unit": "%", "data_source": "IOT_SENSOR", "timestamp": (now - timedelta(hours=3)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "soil_moisture", "value": 62.0, "unit": "%", "data_source": "MANUAL_ENTRY", "timestamp": (now - timedelta(days=10)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "humidity", "value": 70.0, "unit": "%", "data_source": "IOT_SENSOR", "timestamp": (now - timedelta(hours=1)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "sunlight_hours", "value": 8.0, "unit": "h", "data_source": "IOT_SENSOR", "timestamp": (now - timedelta(hours=6)).isoformat()},
        {"plant_id": plant_id, "parameter_name": "rainfall", "value": 3.5, "unit": "mm", "data_source": "EXTERNAL_IMPORT", "timestamp": (now - timedelta(hours=4)).isoformat()}
    ]

    for r in readings:
        rec_res = client.post("/api/v1/telemetry/readings", json=r)
        assert rec_res.status_code == 201

    # Query 24h summary
    sum_24h = client.get("/api/v1/telemetry/summary?range=24h")
    assert sum_24h.status_code == 200
    s_data = sum_24h.json()
    assert "24" in s_data["date_range_label"]
    assert s_data["total_readings_count"] >= 5
    assert s_data["average_temperature"] is not None
    assert 24.0 <= s_data["average_temperature"] <= 26.5
    assert s_data["parameters"]["temperature"]["mean"] is not None
    assert s_data["parameters"]["soil_moisture"]["mean"] is not None

    # Query all-time summary
    sum_all = client.get("/api/v1/telemetry/summary?range=all")
    assert sum_all.status_code == 200
    assert sum_all.json()["total_readings_count"] >= 7

    # Query readings list with parameter filter
    readings_res = client.get("/api/v1/telemetry/readings?parameter=temperature")
    assert readings_res.status_code == 200
    t_readings = readings_res.json()
    assert len(t_readings) >= 2
    assert all(r["parameter_name"] == "temperature" for r in t_readings)

def test_paginated_observations_endpoint(client):
    p_res = client.post("/api/v1/plants", json={
        "name": "Stream Test Plant",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": (date.today() - timedelta(days=25)).isoformat()
    })
    plant_id = p_res.json()["id"]

    for stage in ["Seedling", "Vegetative", "Flowering"]:
        obs_res = client.post(f"/api/v1/plants/{plant_id}/observations", data={
            "manual_growth_stage": stage,
            "temperature": "23.0",
            "humidity": "65.0",
            "soil_moisture": "60.0"
        })
        assert obs_res.status_code == 201

    # Test GET /api/v1/observations
    all_obs = client.get("/api/v1/observations?page=1&page_size=10")
    assert all_obs.status_code == 200
    data = all_obs.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] >= 3
    assert len(data["items"]) >= 3

    sample = data["items"][0]
    assert "plant_name" in sample
    assert "crop_type" in sample
    assert sample["plant_name"] is not None

    # Test filtering by stage
    flowering_obs = client.get("/api/v1/observations?stage=Flowering")
    assert flowering_obs.status_code == 200
    for obs in flowering_obs.json()["items"]:
        assert obs["effective_stage"] == "Flowering"
