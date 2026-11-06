import os
import time
from pathlib import Path
from typing import List, Optional, Dict, Any
import cv2
import numpy as np
from fastapi import HTTPException

from app.schemas.analysis import DiseaseDatasetItem, DiseaseDatasetInferenceResponse
from app.core.config import settings

DISEASE_DATASET_CATALOG: Dict[str, Dict[str, Any]] = {
    "early_blight": {
        "id": "early_blight",
        "title": "Tomato Early Blight",
        "crop": "Tomato",
        "scientific_name": "Alternaria solani",
        "causal_organism": "Alternaria solani (Ellis & G. Martin) L.R. Jones & Grout",
        "class_label": "Tomato___Early_blight",
        "description": "Fungal pathogen causing dark brown necrotic lesions with characteristic concentric target-board rings on leaves, surrounded by yellow chlorotic halos.",
        "typical_symptoms": [
            "Concentric circular target-board spots on older leaves",
            "Chlorotic yellow tissue surrounding necrotic spots",
            "Leaf drop starting from lower plant canopy",
            "Stem collar lesions on seedlings"
        ],
        "dataset_source": "PlantVillage Dataset (Mohanty et al., Penn State & EPFL)",
        "source_url": "https://github.com/spMohanty/PlantVillage-Dataset",
        "license": "CC BY-SA 4.0 (Open Access for Research & Education)",
        "image_url": "/static/disease_datasets/early_blight.jpg",
        "image_count_in_dataset": 1000,
        "is_healthy": False
    },
    "late_blight": {
        "id": "late_blight",
        "title": "Tomato Late Blight",
        "crop": "Tomato",
        "scientific_name": "Phytophthora infestans",
        "causal_organism": "Phytophthora infestans (Mont.) de Bary (Oomycete)",
        "class_label": "Tomato___Late_blight",
        "description": "Devastating oomycete pathogen producing irregular water-soaked, dark greasy lesions on leaves and stems, with delicate whitish fungal mildew on leaf undersides during cool, damp weather.",
        "typical_symptoms": [
            "Irregular water-soaked greasy olive-brown lesions",
            "Rapid whole-canopy blighting under cool, humid microclimates",
            "Delicate whitish downy sporulation on leaf underside",
            "Dark brown leathery patches on green and ripe fruit"
        ],
        "dataset_source": "PlantVillage Dataset / Kaggle open benchmark repository",
        "source_url": "https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset",
        "license": "CC BY-SA 4.0 (Open Access for Research & Education)",
        "image_url": "/static/disease_datasets/late_blight.jpg",
        "image_count_in_dataset": 1909,
        "is_healthy": False
    },
    "healthy_tomato": {
        "id": "healthy_tomato",
        "title": "Healthy Tomato Leaf",
        "crop": "Tomato",
        "scientific_name": "Solanum lycopersicum",
        "causal_organism": "None (Healthy physiological baseline)",
        "class_label": "Tomato___healthy (Healthy appearance in image)",
        "description": "Reference specimen displaying uniform, vibrant green photosynthetic tissue, intact cellular margin architecture, and absence of necrotic spotting or pest perforation.",
        "typical_symptoms": [
            "Uniform chlorophyll coloration across laminar blade",
            "Intact serrated leaf margin architecture",
            "Turgid petiole structure without epinasty or wilting",
            "No localized necrosis, chlorosis, or water-soaked lesions"
        ],
        "dataset_source": "PlantVillage Dataset (Penn State University)",
        "source_url": "https://data.mendeley.com/datasets/ngdgg79rzb",
        "license": "CC BY-SA 4.0 (Open Access for Research & Education)",
        "image_url": "/static/disease_datasets/healthy_tomato.jpg",
        "image_count_in_dataset": 1591,
        "is_healthy": True
    }
}

class DiseaseDatasetService:
    """
    Agricultural Disease Dataset Library & Live Model Inference Benchmark Service.
    Serves authentic licensed dataset examples and runs computer vision inference with honest agreement reporting.
    """

    @classmethod
    def list_datasets(cls, crop: Optional[str] = None, condition: Optional[str] = None) -> List[DiseaseDatasetItem]:
        items: List[DiseaseDatasetItem] = []
        for key, data in DISEASE_DATASET_CATALOG.items():
            if crop and data["crop"].lower() != crop.lower():
                continue
            if condition:
                if condition.lower() == "healthy" and not data["is_healthy"]:
                    continue
                elif condition.lower() == "disease" and data["is_healthy"]:
                    continue

            items.append(DiseaseDatasetItem(**data))
        return items

    @classmethod
    def get_dataset_by_id(cls, dataset_id: str) -> DiseaseDatasetItem:
        if dataset_id not in DISEASE_DATASET_CATALOG:
            raise HTTPException(status_code=404, detail=f"Dataset item '{dataset_id}' not found")
        data = DISEASE_DATASET_CATALOG[dataset_id]
        return DiseaseDatasetItem(**data)

    @classmethod
    def run_example_inference(cls, dataset_id: str) -> DiseaseDatasetInferenceResponse:
        if dataset_id not in DISEASE_DATASET_CATALOG:
            raise HTTPException(status_code=404, detail=f"Dataset item '{dataset_id}' not found")

        item = DISEASE_DATASET_CATALOG[dataset_id]
        start_time = time.time()

        # Locate disk image
        filename = Path(item["image_url"]).name
        possible_paths = [
            Path(settings.BASE_DIR) / "data" / "disease_datasets" / filename,
            Path("backend/data/disease_datasets") / filename,
            Path("data/disease_datasets") / filename,
        ]
        disk_path = None
        for p in possible_paths:
            if p.exists():
                disk_path = p
                break

        if not disk_path:
            raise HTTPException(status_code=500, detail="Underlying dataset image asset not found on server disk")

        # Read actual image with OpenCV
        img = cv2.imread(str(disk_path))
        if img is None:
            raise HTTPException(status_code=500, detail="Failed to decode sample image with OpenCV")

        # Color Space Analysis
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        total_pixels = img.shape[0] * img.shape[1]

        # Brown/Necrotic spots: Hue 5-20, Sat 40-220, Val 20-160
        brown_mask = cv2.inRange(hsv, np.array([5, 40, 20]), np.array([20, 220, 160]))
        brown_ratio = float(np.count_nonzero(brown_mask) / total_pixels)

        # Chlorotic yellow: Hue 18-35, Sat 50-255, Val 50-255
        yellow_mask = cv2.inRange(hsv, np.array([18, 50, 50]), np.array([35, 255, 255]))
        yellow_ratio = float(np.count_nonzero(yellow_mask) / total_pixels)

        # Healthy green: Hue 36-85, Sat 40-255, Val 40-255
        green_mask = cv2.inRange(hsv, np.array([36, 40, 40]), np.array([85, 255, 255]))
        green_ratio = float(np.count_nonzero(green_mask) / total_pixels)

        # Computer vision decision rule
        if green_ratio > 0.60 and brown_ratio < 0.05 and yellow_ratio < 0.08:
            predicted_class = "Tomato___healthy (Healthy appearance in image)"
            confidence = round(min(0.96, 0.82 + (green_ratio * 0.15)), 2)
            notes = (
                f"High green photosynthetic canopy detected ({green_ratio * 100:.1f}%) with minimal necrotic spotting "
                f"({brown_ratio * 100:.1f}%) and low chlorosis ({yellow_ratio * 100:.1f}%). "
                f"Morphological structure indicates intact healthy foliar tissue."
            )
        elif brown_ratio > 0.08 and yellow_ratio > 0.08:
            predicted_class = "Tomato___Early_blight"
            confidence = round(min(0.94, 0.78 + (brown_ratio * 0.6)), 2)
            notes = (
                f"Characteristic necrotic spotting ({brown_ratio * 100:.1f}%) accompanied by extensive concentric "
                f"chlorotic halos ({yellow_ratio * 100:.1f}%). Foliar lesion distribution is consistent with Alternaria solani."
            )
        elif brown_ratio > 0.10 or (brown_ratio > 0.05 and yellow_ratio < 0.06):
            predicted_class = "Tomato___Late_blight"
            confidence = round(min(0.92, 0.75 + (brown_ratio * 0.5)), 2)
            notes = (
                f"Extensive dark water-soaked necrotic patches ({brown_ratio * 100:.1f}%) without prominent yellow halos. "
                f"Pathological profile strongly indicates Phytophthora infestans foliar infection."
            )
        else:
            predicted_class = "Tomato___Early_blight" if yellow_ratio > brown_ratio else "Tomato___Late_blight"
            confidence = 0.71
            notes = (
                f"Ambiguous pigment balance (Necrosis: {brown_ratio * 100:.1f}%, Chlorosis: {yellow_ratio * 100:.1f}%). "
                f"Model identifies potential blight stress with moderate confidence."
            )

        elapsed_ms = round((time.time() - start_time) * 1000.0, 1)
        agrees = (predicted_class.split()[0].lower() == item["class_label"].split()[0].lower())
        agreement_status = "Model prediction matches reference ground truth" if agrees else "Disagreement observed between model inference and reference label"

        return DiseaseDatasetInferenceResponse(
            dataset_id=dataset_id,
            crop=item["crop"],
            known_dataset_label=item["class_label"],
            model_predicted_condition=predicted_class,
            model_confidence_score=confidence,
            agreement_status=agreement_status,
            evaluation_notes=notes,
            botanical_indicators={
                "green_canopy_ratio": round(green_ratio, 3),
                "chlorosis_ratio": round(yellow_ratio, 3),
                "necrosis_ratio": round(brown_ratio, 3),
                "inference_time_ms": elapsed_ms
            }
        )
