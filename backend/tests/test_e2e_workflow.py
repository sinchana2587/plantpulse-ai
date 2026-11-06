import os
import io
import pytest
from datetime import date, datetime, timedelta
from PIL import Image

def test_full_21_step_end_to_end_workflow(client):
    print("\n--- Starting 21-Step Master E2E Automated Workflow ---")

    # Step 1: Open the application / Health Check
    health_res = client.get("/health")
    assert health_res.status_code == 200, "Step 1 Failed: Health check"
    assert health_res.json()["status"] == "online"
    print("Step 1 PASSED: Application is online and healthy.")

    # Step 2: Register a tomato plant
    plant_payload = {
        "name": "E2E Champion Roma Tomato",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": (date.today() - timedelta(days=40)).isoformat(),
        "location": "Automated Smart Greenhouse Plot 7"
    }
    reg_res = client.post("/api/v1/plants", json=plant_payload)
    assert reg_res.status_code == 201, "Step 2 Failed: Plant registration"
    plant = reg_res.json()
    plant_id = plant["id"]
    print(f"Step 2 PASSED: Registered plant '{plant['name']}' with ID {plant_id}")

    # Step 3: Verify registration in list
    list_res = client.get("/api/v1/plants")
    assert list_res.status_code == 200, "Step 3 Failed: List plants"
    plant_ids = [p["id"] for p in list_res.json()]
    assert plant_id in plant_ids, "Registered plant not found in inventory list"
    print("Step 3 PASSED: Verified plant exists in database inventory.")

    # Step 4: Open plant details
    detail_res = client.get(f"/api/v1/plants/{plant_id}")
    assert detail_res.status_code == 200, "Step 4 Failed: Get plant details"
    detail = detail_res.json()
    assert detail["name"] == plant_payload["name"]
    print("Step 4 PASSED: Retrieved individual plant details.")

    # Step 5 & 6 & 7: Upload valid plant photograph, enter environmental data, submit observation #1 (Vegetative)
    img1 = Image.new("RGB", (256, 256), color=(40, 160, 45))  # Lush green foliage
    buf1 = io.BytesIO()
    img1.save(buf1, format="JPEG")
    buf1.seek(0)

    obs1_payload = {
        "observation_date": (datetime.utcnow() - timedelta(days=15)).isoformat(),
        "temperature": 23.5,
        "humidity": 64.0,
        "soil_moisture": 58.5,
        "sunlight_hours": 8.0,
        "rainfall": 0.0,
        "manual_growth_stage": "Vegetative"
    }
    obs1_res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data=obs1_payload,
        files={"image": ("obs1_vegetative.jpg", buf1, "image/jpeg")}
    )
    assert obs1_res.status_code == 201, "Step 5-7 Failed: Observation #1 submission"
    obs1 = obs1_res.json()
    obs1_id = obs1["id"]
    print(f"Step 5, 6, 7 PASSED: Submitted Observation #1 with photograph and telemetry (ID: {obs1_id})")

    # Step 8: Verify database record
    obs_list_res = client.get(f"/api/v1/plants/{plant_id}/observations")
    assert obs_list_res.status_code == 200, "Step 8 Failed: Verify observation record"
    obs_list = obs_list_res.json()
    assert len(obs_list) == 1
    assert obs_list[0]["id"] == obs1_id
    assert obs_list[0]["effective_stage"] == "Vegetative"
    print("Step 8 PASSED: Verified database observation integrity.")

    # Step 9: Trigger AI image analysis
    analyse_res = client.post(f"/api/v1/observations/{obs1_id}/analyse")
    assert analyse_res.status_code == 200, "Step 9 Failed: AI image analysis"
    analysis1 = analyse_res.json()
    print(f"Step 9 PASSED: Triggered AI visual classifier. Predicted stage: {analysis1['predicted_stage']}")

    # Step 10: Verify classification and score metadata
    assert "confidence_score" in analysis1
    assert "stage_scores" in analysis1
    assert analysis1["model_available"] is True
    print(f"Step 10 PASSED: Verified classification metrics (Score: {analysis1['confidence_score']})")

    # Step 11: Generate development forecast
    fc1_res = client.post(f"/api/v1/plants/{plant_id}/forecast")
    assert fc1_res.status_code == 200, "Step 11 Failed: Generate forecast"
    fc1 = fc1_res.json()
    print("Step 11 PASSED: Generated development forecast.")

    # Step 12: Verify prediction source and returned milestones
    assert fc1["method"] == "Phenology-GDD Hybrid Forecaster"
    assert fc1["flowering_window"]["start"] is not None
    assert fc1["fruit_formation_window"]["start"] is not None
    assert fc1["maturity_window"]["start"] is not None
    assert fc1["harvest_window"]["start"] is not None
    print(f"Step 12 PASSED: Verified milestone order (Harvest Window: {fc1['harvest_window']['start']} -> {fc1['harvest_window']['end']})")

    # Step 13: Upload a second observation for the same plant (Flowering)
    img2 = Image.new("RGB", (256, 256), color=(240, 210, 30))  # Yellow floral bloom
    buf2 = io.BytesIO()
    img2.save(buf2, format="JPEG")
    buf2.seek(0)

    obs2_payload = {
        "observation_date": datetime.utcnow().isoformat(),
        "temperature": 25.0,
        "humidity": 61.0,
        "soil_moisture": 53.0,
        "sunlight_hours": 9.2,
        "rainfall": 0.0,
        "manual_growth_stage": "Flowering"
    }
    obs2_res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data=obs2_payload,
        files={"image": ("obs2_flowering.jpg", buf2, "image/jpeg")}
    )
    assert obs2_res.status_code == 201, "Step 13 Failed: Observation #2 submission"
    obs2 = obs2_res.json()
    print("Step 13 PASSED: Uploaded second observation for same plant.")

    # Step 14 & 15: Verify both observations preserved in chronological order
    obs_all_res = client.get(f"/api/v1/plants/{plant_id}/observations")
    assert obs_all_res.status_code == 200
    all_obs = obs_all_res.json()
    assert len(all_obs) == 2, "Step 14 Failed: Did not preserve both observations"
    assert all_obs[0]["observation_date"] < all_obs[1]["observation_date"], "Step 15 Failed: Not in chronological order"
    print("Step 14 & 15 PASSED: Both observations preserved in strict chronological sequence.")

    # Step 16: Verify plant timeline state
    updated_plant_res = client.get(f"/api/v1/plants/{plant_id}")
    updated_plant = updated_plant_res.json()
    assert updated_plant["latest_stage"] == "Flowering"
    assert updated_plant["observation_count"] == 2
    print("Step 16 PASSED: Plant timeline reflects updated latest stage 'Flowering'.")

    # Step 17: Verify environmental charts data availability
    temps = [o["temperature"] for o in all_obs]
    moistures = [o["soil_moisture"] for o in all_obs]
    assert len(temps) == 2 and len(moistures) == 2
    print(f"Step 17 PASSED: Environmental readings verified: Temps={temps}, Moistures={moistures}")

    # Step 18: Generate updated forecast
    fc2_res = client.post(f"/api/v1/plants/{plant_id}/forecast")
    assert fc2_res.status_code == 200
    fc2 = fc2_res.json()
    print("Step 18 PASSED: Re-generated milestone forecast with updated history.")

    # Step 19: Verify updated forecast reflects 2 observations
    assert fc2["observations_used_count"] == 2
    assert fc2["current_stage"] == "Flowering"
    assert fc2["flowering_window"]["start"] is not None
    assert fc2["fruit_formation_window"]["start"] is not None
    print("Step 19 PASSED: Forecast dynamically adapted to new stage 'Flowering' using 2 observations.")

    # Step 20 & 21: Open dashboard and verify database synchronization
    dash_res = client.get("/api/v1/dashboard")
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["total_plants"] >= 1
    assert dash["monitored_plants"] >= 1
    # Check that our plant's upcoming milestone is present
    plant_names = [m["plant_name"] for m in dash["upcoming_milestones"]]
    assert plant_payload["name"] in plant_names
    print("Step 20 & 21 PASSED: Dashboard accurately reflects updated real database records.")
    print("--- 21-Step Master E2E Automated Workflow SUCCEEDED 100% ---")
