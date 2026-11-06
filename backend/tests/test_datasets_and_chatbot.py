import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal
from app.models.user import User

client = TestClient(app)

@pytest.fixture
def auth_headers():
    # Create and verify a test farmer
    email = "farmer.raghu@example.com"
    client.post("/api/v1/auth/signup", json={
        "full_name": "Raghu Gowda",
        "email": email,
        "password": "FarmerPassword2026!",
        "confirm_password": "FarmerPassword2026!",
        "terms_accepted": True
    })
    db = SessionLocal()
    u = db.query(User).filter(User.email == email).first()
    if u:
        u.is_verified = True
        db.commit()
    db.close()

    token = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "FarmerPassword2026!"
    }).json()["access_token"]

    return {"Authorization": f"Bearer {token}"}

def test_crop_knowledge_library_catalog():
    """Verify the Crop Knowledge Library returns authentic scientific crop profiles."""
    res = client.get("/api/v1/datasets/crops")
    assert res.status_code == 200
    crops = res.json()
    crop_ids = [c["id"] for c in crops]
    for expected in ["tomato", "chilli", "brinjal", "okra", "cucumber", "banana"]:
        assert expected in crop_ids

    # Check detail of Tomato
    res_tomato = client.get("/api/v1/datasets/crops/tomato")
    assert res_tomato.status_code == 200
    tomato = res_tomato.json()
    assert tomato["scientific_name"] == "Solanum lycopersicum"
    assert len(tomato["growth_stages"]) >= 5
    assert "optimal_ph" in tomato["soil_requirements"]
    assert "t_base" in tomato["temperature_requirements"]
    assert len(tomato["academic_references"]) >= 1

def test_training_datasets_catalog():
    """Verify authentic AI training dataset catalog with licenses and verified image counts."""
    res = client.get("/api/v1/datasets/training")
    assert res.status_code == 200
    datasets = res.json()
    assert len(datasets) >= 3
    for ds in datasets:
        assert ds["verified_image_count"] > 0
        assert "license" in ds
        assert "source_url" in ds
        assert ds["dataset_status"] in ["Used for Training", "Imported & Benchmarked", "Available"]

def test_user_plant_report_generation(auth_headers):
    """Verify personal plant report generation contains real user records and predictions."""
    # Register a plant under Raghu's account
    plant_res = client.post(
        "/api/v1/plants/register",
        data={
            "name": "Raghu's Pusa Ruby Tomato",
            "crop_type": "Tomato",
            "crop_variety": "Pusa Ruby",
            "planting_date": "2026-02-15",
            "location": "Hassan Field Block 1",
            "description": "High yield tomato trial"
        },
        headers=auth_headers
    )
    assert plant_res.status_code == 201
    plant_id = plant_res.json()["id"]

    # Generate plant report
    report_res = client.get(f"/api/v1/datasets/reports/{plant_id}", headers=auth_headers)
    assert report_res.status_code == 200
    report = report_res.json()
    assert report["plant_name"] == "Raghu's Pusa Ruby Tomato"
    assert report["crop_type"] == "Tomato"
    assert "environmental_averages" in report
    assert "model_metadata" in report
    assert len(report["limitations"]) >= 1
    assert len(report["agronomic_recommendations"]) >= 1

def test_chatbot_strict_domain_filter_and_personal_queries(auth_headers):
    """Verify chatbot rejects non-agricultural questions and provides accurate agri answers."""
    # 1. Prohibited non-agricultural question: programming
    res_prog = client.post(
        "/api/v1/chatbot/message",
        json={"message": "Write a python function to implement quicksort."},
        headers=auth_headers
    )
    assert res_prog.status_code == 200
    prog_data = res_prog.json()
    assert prog_data["is_agricultural"] is False
    assert "PlantPulse Agricultural Assistant" in prog_data["response"]
    assert "farming-related questions" in prog_data["response"]

    # 2. Prohibited non-agricultural question: movies/celebrities
    res_movie = client.post(
        "/api/v1/chatbot/message",
        json={"message": "Who won the best actor Oscar movie award?"},
        headers=auth_headers
    )
    assert res_movie.status_code == 200
    assert res_movie.json()["is_agricultural"] is False

    # 3. Agricultural question: General crop stages
    res_agri = client.post(
        "/api/v1/chatbot/message",
        json={"message": "What are the growth stages and soil requirements for banana cultivation?"},
        headers=auth_headers
    )
    assert res_agri.status_code == 200
    agri_data = res_agri.json()
    assert agri_data["is_agricultural"] is True
    assert "Banana" in agri_data["response"] or "Musa" in agri_data["response"]
    assert len(agri_data["sources"]) >= 1

    # 4. Personal plant query
    res_plant = client.post(
        "/api/v1/chatbot/message",
        json={"message": "What is the current growth stage of my tomato plant?"},
        headers=auth_headers
    )
    assert res_plant.status_code == 200
    plant_data = res_plant.json()
    assert plant_data["is_agricultural"] is True
    assert plant_data["plant_context_used"] is True
    assert "Raghu's Pusa Ruby Tomato" in plant_data["response"]
