import pytest
from datetime import date

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["service"] == "PlantPulse AI"

def test_create_and_get_plant(client):
    payload = {
        "name": "Test Roma Tomato #1",
        "crop_type": "Tomato",
        "crop_variety": "Roma",
        "planting_date": "2026-03-01",
        "location": "Greenhouse Plot 12"
    }
    create_res = client.post("/api/v1/plants", json=payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    plant_id = created_data["id"]
    assert created_data["name"] == payload["name"]
    assert created_data["crop_variety"] == "Roma"
    assert created_data["is_demo"] is False

    # Get plant by ID
    get_res = client.get(f"/api/v1/plants/{plant_id}")
    assert get_res.status_code == 200
    assert get_res.json()["id"] == plant_id

    # Update plant
    update_res = client.put(f"/api/v1/plants/{plant_id}", json={"location": "Outdoor Raised Bed A"})
    assert update_res.status_code == 200
    assert update_res.json()["location"] == "Outdoor Raised Bed A"

    # List plants
    list_res = client.get("/api/v1/plants")
    assert list_res.status_code == 200
    assert len(list_res.json()) >= 1

    # Delete plant
    del_res = client.delete(f"/api/v1/plants/{plant_id}")
    assert del_res.status_code == 200
    
    # Verify 404 after deletion
    get_again = client.get(f"/api/v1/plants/{plant_id}")
    assert get_again.status_code == 404

def test_get_nonexistent_plant(client):
    response = client.get("/api/v1/plants/non-existent-uuid-999")
    assert response.status_code == 404
