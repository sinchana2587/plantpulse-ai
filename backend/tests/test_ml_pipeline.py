import io
import pytest
from PIL import Image
from app.ml.feature_extractor import extract_image_features, STAGE_NAMES
from app.ml.growth_stage_classifier import classifier_instance
from app.ml.phenology_engine import PhenologyEngine
from datetime import date

def test_feature_extractor():
    # Create synthetic test image
    img = Image.new("RGB", (256, 256), color=(40, 180, 50))
    features = extract_image_features(img)
    assert len(features) == 20
    assert not np_isnan(features)

def np_isnan(arr):
    import numpy as np
    return bool(np.isnan(arr).any())

def test_classifier_status_and_prediction():
    status = classifier_instance.get_status()
    assert status["is_available"] is True
    assert status["target_crop"] == "Tomato (Solanum lycopersicum)"
    assert len(status["supported_stages"]) == 5

    # Run inference on sample image
    img = Image.new("RGB", (200, 200), color=(100, 190, 60))
    prediction = classifier_instance.predict(img)

    assert prediction["predicted_stage"] in STAGE_NAMES
    assert 0.0 <= prediction["confidence_score"] <= 1.0
    assert len(prediction["stage_scores"]) == 5
    assert sum(prediction["stage_scores"].values()) == pytest.approx(1.0, abs=1e-2)

def test_phenology_engine_calculations():
    # Test GDD calculation
    gdd_warm = PhenologyEngine.calculate_daily_gdd(25.0)  # 25 - 10 = 15
    assert gdd_warm == 15.0

    gdd_cold = PhenologyEngine.calculate_daily_gdd(8.0)  # below base temp = 0
    assert gdd_cold == 0.0

    # Milestone predictions
    milestones = PhenologyEngine.predict_milestones(
        planting_date=date(2026, 3, 1),
        current_stage="Seedling",
        observations=[],
        crop_variety="Cherry"
    )
    assert milestones["flowering_window"]["start"] is not None
    assert milestones["fruit_formation_window"]["start"] is not None
    assert milestones["harvest_window"]["start"] is not None
