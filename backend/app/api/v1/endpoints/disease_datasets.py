from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.analysis import DiseaseDatasetItem, DiseaseDatasetInferenceResponse
from app.services.disease_dataset_service import DiseaseDatasetService

router = APIRouter()

@router.get("", response_model=List[DiseaseDatasetItem])
def list_disease_datasets(
    crop: Optional[str] = Query(None, description="Filter by crop (e.g. Tomato)"),
    condition: Optional[str] = Query(None, description="Filter by condition (healthy or disease)")
):
    """
    List verified agricultural disease dataset samples (PlantVillage / Mendeley / Penn State).
    Includes authentic photographs, pathogen taxonomy, and symptoms.
    """
    return DiseaseDatasetService.list_datasets(crop=crop, condition=condition)

@router.get("/{dataset_id}", response_model=DiseaseDatasetItem)
def get_disease_dataset_item(dataset_id: str):
    """Retrieve detailed specification and research source for an agricultural disease dataset item."""
    return DiseaseDatasetService.get_dataset_by_id(dataset_id)

@router.post("/{dataset_id}/try", response_model=DiseaseDatasetInferenceResponse)
def try_dataset_image_inference(dataset_id: str):
    """
    Run authentic model inference on a licensed example image.
    Transparently compares model prediction with the known dataset reference label.
    """
    return DiseaseDatasetService.run_example_inference(dataset_id)
