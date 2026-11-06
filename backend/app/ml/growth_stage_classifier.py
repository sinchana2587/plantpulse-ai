import os
import json
import joblib
import numpy as np
from pathlib import Path
from typing import Dict, Any, Tuple, Optional
from app.core.config import settings
from app.ml.feature_extractor import extract_image_features, STAGE_NAMES

class GrowthStageClassifier:
    def __init__(self):
        self.model_path = Path(settings.MODELS_DIR) / "growth_stage_classifier.joblib"
        self.metrics_path = Path(settings.MODELS_DIR) / "model_metrics.json"
        self.model = None
        self.metrics = {}
        self.load_model()

    def load_model(self):
        if self.model_path.exists():
            try:
                self.model = joblib.load(self.model_path)
            except Exception as e:
                print(f"[Classifier] Failed to load model from {self.model_path}: {e}")
                self.model = None
        if self.metrics_path.exists():
            try:
                with open(self.metrics_path, "r") as f:
                    self.metrics = json.load(f)
            except Exception:
                self.metrics = {}

    @property
    def is_available(self) -> bool:
        return self.model is not None

    def get_status(self) -> Dict[str, Any]:
        return {
            "model_name": "RandomForestGrowthStageClassifier",
            "is_available": self.is_available,
            "model_version": self.metrics.get("model_version", "1.0.0"),
            "target_crop": "Tomato (Solanum lycopersicum)",
            "supported_stages": STAGE_NAMES,
            "metrics": self.metrics,
            "status_message": "Model ready for visual inference" if self.is_available else "Model checkpoint not found. Manual classification enabled."
        }

    def predict(self, image_input) -> Dict[str, Any]:
        if not self.is_available:
            self.load_model()
            if not self.is_available:
                raise RuntimeError("Growth stage classification model is currently unavailable.")

        features = extract_image_features(image_input).reshape(1, -1)
        
        # Predict class and probabilities
        pred_idx = int(self.model.predict(features)[0])
        predicted_stage = STAGE_NAMES[pred_idx]
        
        probabilities = self.model.predict_proba(features)[0]
        stage_scores = {
            STAGE_NAMES[i]: round(float(prob), 4)
            for i, prob in enumerate(probabilities)
        }
        confidence_score = round(float(probabilities[pred_idx]), 4)

        return {
            "predicted_stage": predicted_stage,
            "confidence_score": confidence_score,
            "model_version": self.metrics.get("model_version", "1.0.0"),
            "stage_scores": stage_scores,
            "model_available": True,
            "source": "RandomForestBotanicalVisionClassifier",
            "analysis_summary": f"Visual feature extraction identified morphological characteristics consistent with the '{predicted_stage}' stage (model score: {confidence_score:.2f}).",
            "known_limitations": "Predictions are based on canopy density, floral chrominance, and fruit pigmentation. Extreme occlusions, low lighting, or atypical camera angles may impact scoring accuracy."
        }

classifier_instance = GrowthStageClassifier()
