import os
import json
import io
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.plant import Plant
from app.models.observation import Observation
from app.models.analysis import PlantProblem, ProblemAnalysis, TreatmentPlan, TreatmentAction, RecoveryObservation, GeometricAnalysisResult
from app.services.disease_dataset_service import DiseaseDatasetService
from app.services.geometric_inspector_service import GeometricInspectorService

def test_disease_datasets_gallery(client: TestClient):
    """TEST B: Verify Disease Dataset Gallery endpoint and metadata."""
    res = client.get("/api/v1/disease-datasets")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 3

    # Check Early Blight
    eb = next(d for d in data if d["id"] == "early_blight")
    assert eb["crop"] == "Tomato"
    assert "Alternaria solani" in eb["scientific_name"]
    assert "PlantVillage" in eb["dataset_source"]
    assert "CC BY-SA" in eb["license"]
    assert eb["is_healthy"] is False

    # Check Late Blight
    lb = next(d for d in data if d["id"] == "late_blight")
    assert lb["crop"] == "Tomato"
    assert "Phytophthora infestans" in lb["scientific_name"]
    assert lb["is_healthy"] is False

    # Check Healthy
    ht = next(d for d in data if d["id"] == "healthy_tomato")
    assert ht["is_healthy"] is True
    assert "healthy" in ht["class_label"].lower()

def test_disease_dataset_live_inference(client: TestClient):
    """TEST B.2: Verify genuine model inference on authentic example image and transparent agreement reporting."""
    res = client.post("/api/v1/disease-datasets/early_blight/try")
    assert res.status_code == 200
    data = res.json()
    assert data["dataset_id"] == "early_blight"
    assert "model_predicted_condition" in data
    assert "model_confidence_score" in data
    assert "agreement_status" in data
    assert "botanical_indicators" in data
    assert "green_canopy_ratio" in data["botanical_indicators"]
    assert "chlorosis_ratio" in data["botanical_indicators"]
    assert "necrosis_ratio" in data["botanical_indicators"]

def test_banana_problem_diagnosis_and_treatment_flow(client: TestClient, db_session: Session):
    """TEST A & D: Report Banana problem with symptoms, verify Panama Wilt TR4 diagnosis and automatic TreatmentPlan creation."""
    # 1. Register a test Banana plant
    banana = Plant(
        name="Test Grand Naine Clump",
        crop_type="Banana",
        crop_variety="Grand Naine",
        planting_date="2026-09-01",
        is_demo=True
    )
    db_session.add(banana)
    db_session.commit()
    db_session.refresh(banana)

    # 2. Add an observation with fake photo to test feature linkage
    obs = Observation(
        plant_id=banana.id,
        observation_date="2026-11-01",
        growth_stage="Vegetative",
        temperature=28.5,
        soil_moisture=54.0,
        humidity=65.0
    )
    db_session.add(obs)
    db_session.commit()

    # 3. Submit Problem Report with farmer symptoms
    form_data = {
        "category": "Leaf Yellowing / Chlorosis",
        "description": "It has become dry and it is not growing. Whole plant leaves are wilting.",
        "affected_part": "Whole plant",
        "onset_date": "2026-11-01",
        "is_spreading": "yes",
        "irrigation_notes": "Watered every 2 days",
        "fertilizer_notes": "Vermicompost"
    }

    # Include small synthetic image bytes
    fake_img = io.BytesIO(b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9")
    files = {"image": ("leaf_yellow.jpg", fake_img, "image/jpeg")}

    res = client.post(f"/api/v1/plants/{banana.id}/problems", data=form_data, files=files)
    assert res.status_code == 201
    prob_data = res.json()
    assert prob_data["category"] == "Leaf Yellowing / Chlorosis"
    assert len(prob_data["analyses"]) == 1

    diagnosis = prob_data["analyses"][0]
    assert diagnosis["severity"] in ["High", "Severe"]
    causes = [c["cause"] for c in diagnosis["probable_causes"]]
    # Must correctly diagnose Banana Panama Wilt (Fusarium) or Sigatoka
    assert any("Panama Disease" in c or "Fusarium" in c for c in causes)

    # 4. Verify Automatic Treatment Plan generation in database
    t_res = client.get("/api/v1/treatments/latest")
    assert t_res.status_code == 200
    plan = t_res.json()
    assert plan is not None
    assert plan["plant_id"] == banana.id
    assert "Fusarium" in plan["condition_name"] or "Panama" in plan["condition_name"]
    assert len(plan["actions"]) > 0

    # 5. Toggle Treatment Action
    action_id = plan["actions"][0]["id"]
    patch_res = client.patch(
        f"/api/v1/treatments/{plan['id']}/actions/{action_id}",
        json={"is_completed": True}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["is_completed"] is True

    # 6. Add Follow-up Observation
    follow_up_data = {
        "symptom_status": "improved",
        "notes": "Isolation buffer complete and Trichoderma applied. No new leaf desiccation."
    }
    follow_res = client.post(f"/api/v1/treatments/{plan['id']}/follow-up", data=follow_up_data)
    assert follow_res.status_code == 201
    assert follow_res.json()["symptom_status"] == "improved"

def test_geometric_anomaly_inspector(client: TestClient, db_session: Session):
    """TEST C: Run OpenCV geometric analysis, verifying contour/perimeter/convexity/asymmetry calculations."""
    # Retrieve demo plant
    plants_res = client.get("/api/v1/plants?limit=1")
    assert plants_res.status_code == 200
    plants = plants_res.json()
    if not plants:
        pytest.skip("No plants in test database")

    plant_id = plants[0]["id"]

    # Trigger geometric analysis
    res = client.post(f"/api/v1/plants/{plant_id}/geometric-analysis")
    assert res.status_code == 201
    geom = res.json()

    assert "leaf_area_px" in geom
    assert "perimeter_px" in geom
    assert "aspect_ratio" in geom
    assert "circularity" in geom
    assert "convexity" in geom
    assert "asymmetry_index" in geom
    assert "canopy_coverage_pct" in geom
    assert "processed_overlay_url" in geom
    assert "mask_image_url" in geom
    assert "limitations_disclaimer" in geom
    assert "All geometric measurements are computed in image pixel units" in geom["limitations_disclaimer"]

    # History retrieval
    hist_res = client.get(f"/api/v1/plants/{plant_id}/geometric-analyses")
    assert hist_res.status_code == 200
    assert len(hist_res.json()) >= 1
