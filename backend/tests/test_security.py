import io
import pytest
from fastapi import HTTPException
from app.services.storage_service import StorageService

def test_storage_path_traversal_protection():
    # Attempt to resolve path with directory traversal
    with pytest.raises(HTTPException) as excinfo:
        StorageService.get_absolute_path("/static/uploads/../../secret_config.txt")
    assert excinfo.value.status_code == 403

def test_invalid_file_extension(client):
    # Try uploading an executable/script as an observation image
    plant_res = client.post("/api/v1/plants", json={
        "name": "Security Test Plant",
        "crop_type": "Tomato",
        "planting_date": "2026-03-01"
    })
    plant_id = plant_res.json()["id"]

    fake_script = io.BytesIO(b"print('malicious script')")
    res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data={"temperature": 22.0},
        files={"image": ("exploit.py", fake_script, "text/x-python")}
    )
    assert res.status_code == 400
    assert "Unsupported file extension" in res.json()["detail"]

def test_corrupted_image_upload(client):
    plant_res = client.post("/api/v1/plants", json={
        "name": "Corrupt Test Plant",
        "crop_type": "Tomato",
        "planting_date": "2026-03-01"
    })
    plant_id = plant_res.json()["id"]

    # File with .jpg extension but corrupt byte contents
    corrupted_bytes = io.BytesIO(b"NOT_A_REAL_IMAGE_DATA_HEADER_BYTES_12345")
    res = client.post(
        f"/api/v1/plants/{plant_id}/observations",
        data={"temperature": 22.0},
        files={"image": ("corrupted.jpg", corrupted_bytes, "image/jpeg")}
    )
    assert res.status_code == 400
    assert "Corrupted or invalid image file" in res.json()["detail"]
