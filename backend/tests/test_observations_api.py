import io
from PIL import Image

def test_observation_lifecycle(client):
    # 1. Create a plant
    plant_res = client.post("/api/v1/plants", json={
        "name": "Observation Test Tomato",
        "crop_type": "Tomato",
        "crop_variety": "Cherry",
        "planting_date": "2026-02-15",
        "location": "Sensor Box Beta"
    })
    assert plant_res.status_code == 201
    plant_id = plant_res.json()["id"]

    # 2. Add an observation with environmental measurements
    obs_res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data={
            "temperature": 24.5,
            "humidity": 65.0,
            "soil_moisture": 58.2,
            "sunlight_hours": 8.0,
            "rainfall": 0.0,
            "manual_growth_stage": "Vegetative"
        }
    )
    assert obs_res.status_code == 201
    obs_data = obs_res.json()
    obs_id = obs_data["id"]
    assert obs_data["effective_stage"] == "Vegetative"
    assert obs_data["temperature"] == 24.5

    # 3. Fetch observations for plant
    list_obs = client.get(f"/api/v1/plants/{plant_id}/observations")
    assert list_obs.status_code == 200
    assert len(list_obs.json()) == 1

    # 4. Correct growth stage manually
    patch_res = client.patch(
        f"/api/v1/observations/{obs_id}/stage",
        json={"manual_growth_stage": "Flowering"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["manual_growth_stage"] == "Flowering"
    assert patch_res.json()["effective_stage"] == "Flowering"

def test_observation_with_image_upload(client):
    # Create plant
    plant_res = client.post("/api/v1/plants", json={
        "name": "Image Upload Tomato",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": "2026-03-01"
    })
    plant_id = plant_res.json()["id"]

    # Create dummy in-memory image
    img = Image.new("RGB", (100, 100), color=(50, 150, 50))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_byte_arr.seek(0)

    # Post observation with multipart file
    obs_res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data={
            "temperature": 23.0,
            "humidity": 60.0,
            "soil_moisture": 55.0
        },
        files={"image": ("test_tomato.jpg", img_byte_arr, "image/jpeg")}
    )
    assert obs_res.status_code == 201
    obs_data = obs_res.json()
    assert obs_data["image_path"] is not None
    assert "/static/uploads/observations/" in obs_data["image_path"]

    # Verify analyze endpoint works
    obs_id = obs_data["id"]
    analyze_res = client.post(f"/api/v1/observations/{obs_id}/analyse")
    assert analyze_res.status_code == 200
    ana_data = analyze_res.json()
    assert "predicted_stage" in ana_data
    assert "confidence_score" in ana_data
    assert "stage_scores" in ana_data
