import io
import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from PIL import Image

from app.models.plant import Plant
from app.models.observation import Observation
from app.db.session import SessionLocal

def test_analyse_plant_and_digital_twin_endpoints(client: TestClient, db_session):
    # 1. Create a plant
    plant = Plant(
        name="Test Beefsteak Tomato",
        crop_type="Tomato",
        crop_variety="Beefsteak",
        planting_date=date.today() - timedelta(days=45),
        location="Greenhouse Zone 2",
        is_demo=False
    )
    db_session.add(plant)
    db_session.commit()
    db_session.refresh(plant)

    # 2. Add an observation with a synthetic botanical image
    img = Image.new("RGB", (256, 256), color=(40, 180, 50))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()

    obs_res = client.post(
        f"/api/v1/plants/{plant.id}/observations",
        data={
            "temperature": 26.5,
            "soil_moisture": 58.0,
            "humidity": 65.0,
            "sunlight_hours": 8.0,
            "rainfall": 0.0,
            "manual_growth_stage": "Vegetative"
        },
        files={"image": ("test_obs.jpg", img_bytes, "image/jpeg")}
    )
    assert obs_res.status_code == 201
    obs_data = obs_res.json()
    obs_id = obs_data["id"]

    # 3. Test ANALYSE PLANT endpoint (Sections A through I)
    analyse_res = client.post(
        f"/api/v1/plants/{plant.id}/analyse",
        data={"observation_id": obs_id}
    )
    assert analyse_res.status_code == 200
    report = analyse_res.json()

    # Section checks
    assert "plant_overview" in report
    assert report["plant_overview"]["name"] == "Test Beefsteak Tomato"
    assert "predicted_stage" in report
    assert "confidence_score" in report
    assert "botanical_visual_cues" in report
    assert report["botanical_visual_cues"]["canopy_coverage_pct"] >= 0.0
    assert "growth_progress" in report
    assert report["growth_progress"]["accumulated_gdd"] > 0
    assert "future_development" in report
    assert len(report["future_development"]["predicted_milestones"]) > 0
    assert "health_assessment" in report
    assert report["health_assessment"]["overall_health_score"] > 0
    assert "environmental_correlation" in report
    assert "recommendations" in report
    assert "next_best_observation" in report
    assert "model_metadata" in report

    analysis_id = report["id"]

    # 4. Test GET /analyses/{id}
    get_report_res = client.get(f"/api/v1/analyses/{analysis_id}")
    assert get_report_res.status_code == 200
    assert get_report_res.json()["id"] == analysis_id

    # 5. Test Feedback on analysis
    fb_res = client.post(
        f"/api/v1/analyses/{analysis_id}/feedback",
        json={"feedback": "accurate", "notes": "Foliar density and stage aligned with field observation."}
    )
    assert fb_res.status_code == 200
    assert fb_res.json()["status"] == "success"

    # 6. Test Digital Twin & Growth Deviation Radar
    dt_res = client.get(f"/api/v1/plants/{plant.id}/digital-twin")
    assert dt_res.status_code == 200
    dt_data = dt_res.json()
    assert dt_data["plant_id"] == plant.id
    assert dt_data["deviation_status"] in [
        "Within Expected Range",
        "Faster Than Reference",
        "Slower Than Reference",
        "Potential Growth Concern",
        "Insufficient Data"
    ]
    assert len(dt_data["timeline"]) > 0
    assert "reference_gdd_curve" in dt_data

    # 7. Test What-If Growth Simulator
    what_if_res = client.post(
        f"/api/v1/plants/{plant.id}/what-if",
        json={
            "soil_moisture_delta_pct": 8.0,
            "temperature_delta_c": 1.5,
            "sunlight_delta_hours": 1.0
        }
    )
    assert what_if_res.status_code == 200
    wi_data = what_if_res.json()
    assert "harvest_shift_days" in wi_data
    assert "physiological_consequences" in wi_data
    assert len(wi_data["physiological_consequences"]) > 0
    assert "disclaimer" in wi_data

    # 8. Test Farmer Problem Reporting & Agronomic Diagnosis
    prob_res = client.post(
        f"/api/v1/plants/{plant.id}/problems",
        data={
            "category": "Leaf Yellowing / Chlorosis",
            "description": "Lower leaves turning chlorotic with yellowing between veins after rain.",
            "affected_part": "Lower leaves",
            "onset_date": date.today().isoformat(),
            "is_spreading": "no",
            "irrigation_notes": "Drip irrigated 20 mins every morning"
        }
    )
    assert prob_res.status_code == 201
    prob_data = prob_res.json()
    assert prob_data["category"] == "Leaf Yellowing / Chlorosis"
    assert len(prob_data["analyses"]) > 0
    diagnosis = prob_data["analyses"][0]
    assert "Nitrogen" in diagnosis["summary"] or "Chlorosis" in diagnosis["summary"] or "probable_causes" in diagnosis
    assert len(diagnosis["probable_causes"]) > 0
    assert len(diagnosis["recommended_actions"]) > 0
    assert len(diagnosis["precautions"]) > 0
    assert "expert_guidance" in diagnosis

    # 9. Test Next Best Observation
    next_obs_res = client.get(f"/api/v1/plants/{plant.id}/next-observation")
    assert next_obs_res.status_code == 200
    assert "recommended_date_range" in next_obs_res.json()
