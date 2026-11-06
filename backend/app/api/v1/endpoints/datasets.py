from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.dataset import (
    CropAgronomyProfile,
    TrainingDatasetItem,
    PlantReportResponse,
    PlantReportRequest
)
from app.services.dataset_service import DatasetService

router = APIRouter()

@router.get("/crops", response_model=List[CropAgronomyProfile])
def list_crops(search: Optional[str] = Query(None, description="Search crops by name, species or variety")):
    """
    Returns authentic academic crop agronomy profiles covering growth stages,
    climatic requirements, water demands, and stress factors.
    """
    return DatasetService.list_crop_profiles(search=search)

@router.get("/crops/{crop_id}", response_model=CropAgronomyProfile)
def get_crop(crop_id: str):
    """
    Returns detailed agronomic specifications and references for a specific crop.
    """
    profile = DatasetService.get_crop_profile(crop_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Crop profile '{crop_id}' not found in catalog.")
    return profile

@router.get("/training", response_model=List[TrainingDatasetItem])
def list_training_datasets(crop: Optional[str] = Query(None, description="Filter datasets by crop")):
    """
    Lists verified computer vision and phenology training datasets with authentic sources,
    license specifications, image counts, and benchmark metrics.
    """
    return DatasetService.list_training_datasets(crop_id=crop)

@router.get("/reports/{plant_id}", response_model=PlantReportResponse)
def get_plant_report(
    plant_id: str,
    range: str = Query("all", description="Date range: 24h, 7d, 30d, all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generates a personalized, comprehensive agricultural growth and telemetry report
    for a plant belonging to the authenticated user.
    """
    return DatasetService.generate_plant_report(db, plant_id=plant_id, user=current_user, date_range=range)
