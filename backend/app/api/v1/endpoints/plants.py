from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_optional_current_user
from app.models.user import User
from app.schemas.plant import PlantCreate, PlantUpdate, PlantResponse
from app.schemas.observation import ObservationCreate, ObservationResponse
from app.schemas.forecast import ForecastResponse
from app.schemas.analysis import (
    PlantAnalysisResponse,
    PlantProblemResponse,
    ProblemAnalysisResponse,
    PlantProblemCreate,
    DigitalTwinResponse,
    WhatIfRequest,
    WhatIfResponse,
    NextBestObservationData,
    TreatmentPlanResponse,
    GeometricAnalysisResponse
)
from app.services.plant_service import PlantService
from app.services.observation_service import ObservationService
from app.services.forecast_service import ForecastService
from app.services.storage_service import StorageService
from app.services.plant_analysis_service import PlantAnalysisService
from app.services.problem_reporting_service import ProblemReportingService
from app.services.digital_twin_service import DigitalTwinService
from app.services.treatment_service import TreatmentService
from app.services.geometric_inspector_service import GeometricInspectorService

router = APIRouter()

@router.get("", response_model=List[PlantResponse])
def get_plants(
    skip: int = 0,
    limit: int = 100,
    crop_type: Optional[str] = None,
    monitored_only: Optional[bool] = None,
    include_demo: bool = Query(True, description="Whether to include demonstration plants"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    return PlantService.get_plants(
        db,
        skip=skip,
        limit=limit,
        crop_type=crop_type,
        monitored_only=monitored_only,
        include_demo=include_demo,
        user_id=user_id
    )

@router.post("", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
def create_plant(
    plant_in: PlantCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.create_plant(db, plant_in, user_id=user_id)
    return PlantService.get_plant_by_id(db, plant.id, user_id=user_id)

@router.post("/register", response_model=PlantResponse, status_code=status.HTTP_201_CREATED)
async def register_plant_with_optional_photo(
    name: str = Form(..., min_length=1, max_length=100),
    crop_type: str = Form("Tomato", max_length=50),
    crop_variety: str = Form("Roma", max_length=50),
    planting_date: str = Form(...),
    location: Optional[str] = Form(None, max_length=100),
    description: Optional[str] = Form(None, max_length=500),
    initial_stage: Optional[str] = Form(None, max_length=50),
    photo_date: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Register a new plant with optional initial photograph upload.
    If image is uploaded, an initial observation is created and linked to the plant.
    If no image is provided, the plant is registered in 'Awaiting first observation' state without creating fake records.
    """
    try:
        p_date = datetime.strptime(planting_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid planting_date format. Expected YYYY-MM-DD.")

    image_path = None
    if image is not None and image.filename:
        # Validate and save image safely
        image_path = StorageService.validate_and_save_image(image, subfolder="observations")

    plant_in = PlantCreate(
        name=name.strip(),
        crop_type=crop_type.strip(),
        crop_variety=crop_variety.strip(),
        planting_date=p_date,
        location=location.strip() if location else None,
        description=description.strip() if description else None
    )

    user_id = current_user.id if current_user else None
    plant = PlantService.create_plant(db, plant_in, user_id=user_id)

    if image_path:
        # Create genuine initial observation linked to plant
        obs_dt = datetime.fromisoformat(photo_date) if photo_date else datetime.utcnow()
        default_stage = initial_stage or ("Vegetative" if crop_type.lower() == "banana" else "Seedling")
        
        obs_in = ObservationCreate(
            plant_id=plant.id,
            observation_date=obs_dt,
            manual_growth_stage=default_stage,
            data_source="MANUAL_ENTRY"
        )
        obs = ObservationService.create_observation(db, obs_in, image_path=image_path)
        
        # If crop is Tomato, run visual model if available
        if crop_type.lower() == "tomato":
            try:
                ObservationService.analyze_observation_image(db, obs.id)
            except Exception:
                pass
        
        # Generate initial phenology forecast
        ForecastService.generate_and_save_forecast(db, plant.id)

    return PlantService.get_plant_by_id(db, plant.id, user_id=user_id)

@router.get("/{plant_id}", response_model=PlantResponse)
def get_plant(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    return plant

@router.put("/{plant_id}", response_model=PlantResponse)
def update_plant(
    plant_id: str,
    plant_in: PlantUpdate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.update_plant(db, plant_id, plant_in, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    return PlantService.get_plant_by_id(db, plant_id, user_id=user_id)

@router.delete("/{plant_id}", status_code=status.HTTP_200_OK)
def delete_plant(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    success = PlantService.delete_plant(db, plant_id, user_id=user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    return {"message": "Plant deleted successfully", "id": plant_id}

@router.get("/{plant_id}/observations", response_model=List[ObservationResponse])
def get_plant_observations(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    return ObservationService.get_plant_observations(db, plant_id)

@router.post("/{plant_id}/observations", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
async def create_plant_observation(
    plant_id: str,
    observation_date: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None),
    humidity: Optional[float] = Form(None),
    soil_moisture: Optional[float] = Form(None),
    sunlight_hours: Optional[float] = Form(None),
    rainfall: Optional[float] = Form(None),
    manual_growth_stage: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")

    image_path = None
    if image is not None and image.filename:
        image_path = StorageService.validate_and_save_image(image, subfolder="observations")

    obs_dt = datetime.fromisoformat(observation_date) if observation_date else datetime.utcnow()

    obs_in = ObservationCreate(
        plant_id=plant_id,
        observation_date=obs_dt,
        temperature=temperature,
        humidity=humidity,
        soil_moisture=soil_moisture,
        sunlight_hours=sunlight_hours,
        rainfall=rainfall,
        manual_growth_stage=manual_growth_stage
    )

    observation = ObservationService.create_observation(db, obs_in, image_path=image_path)
    
    # Automatically update the plant's future forecast upon adding an observation
    ForecastService.generate_and_save_forecast(db, plant_id)

    return ObservationService._to_response(observation)

@router.get("/{plant_id}/forecast", response_model=ForecastResponse)
def get_plant_forecast(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    fc = ForecastService.get_latest_forecast(db, plant_id)
    if not fc:
        # Generate on demand
        fc = ForecastService.generate_and_save_forecast(db, plant_id)
    return fc

@router.post("/{plant_id}/forecast", response_model=ForecastResponse)
def generate_plant_forecast(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    fc = ForecastService.generate_and_save_forecast(db, plant_id)
    return fc

@router.get("/{plant_id}/forecast/history", response_model=List[ForecastResponse])
def get_plant_forecast_history(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id if current_user else None
    plant = PlantService.get_plant_by_id(db, plant_id, user_id=user_id)
    if not plant:
        raise HTTPException(status_code=404, detail="Plant not found or access denied")
    return ForecastService.get_forecast_history(db, plant_id)

# ================= Plant Analysis & Growth Intelligence Endpoints =================

@router.post("/{plant_id}/analyse", response_model=PlantAnalysisResponse)
async def analyse_plant(
    plant_id: str,
    observation_id: Optional[str] = Form(None),
    manual_stage: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    ANALYSE PLANT: Trigger deep botanical computer vision, GDD phenological tracking,
    leaf health diagnosis, and grounded agricultural intelligence.
    Can analyze the latest photograph, an earlier observation photo, or a freshly uploaded photo.
    """
    user_id = current_user.id if current_user else None
    return PlantAnalysisService.analyze_plant(
        db=db,
        plant_id=plant_id,
        observation_id=observation_id,
        image_file=image,
        manual_stage_override=manual_stage,
        user_id=user_id
    )

@router.get("/{plant_id}/analyses", response_model=List[PlantAnalysisResponse])
def get_plant_analyses(
    plant_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical AI analysis reports for this plant."""
    return PlantAnalysisService.get_plant_analyses(db, plant_id, limit=limit)

# ================= Farmer Growth Problem Reporting =================

@router.post("/{plant_id}/problems", response_model=PlantProblemResponse, status_code=status.HTTP_201_CREATED)
async def report_plant_problem(
    plant_id: str,
    category: str = Form(..., description="Stunted Growth, Leaf Yellowing, Wilting, Fruit Drop, Spotting, Pest Damage, etc."),
    description: str = Form(..., min_length=5),
    affected_part: str = Form("Whole plant"),
    onset_date: Optional[str] = Form(None),
    is_spreading: str = Form("unsure"),
    irrigation_notes: Optional[str] = Form(None),
    fertilizer_notes: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    REPORT A PLANT PROBLEM: Submit farmer-observed stress or abnormality.
    Automatically executes AI agronomic diagnosis and formulates cultural precautions.
    """
    user_id = current_user.id if current_user else None
    return ProblemReportingService.report_and_diagnose_problem(
        db=db,
        plant_id=plant_id,
        category=category,
        description=description,
        affected_part=affected_part,
        onset_date=onset_date,
        is_spreading=is_spreading,
        irrigation_notes=irrigation_notes,
        fertilizer_notes=fertilizer_notes,
        image_file=image,
        user_id=user_id
    )

@router.get("/{plant_id}/problems", response_model=List[PlantProblemResponse])
def get_plant_problems(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all reported problems and AI diagnoses for this plant."""
    return ProblemReportingService.get_plant_problems(db, plant_id)

# ================= Digital Twin & Growth Deviation Radar =================

@router.get("/{plant_id}/digital-twin", response_model=DigitalTwinResponse)
def get_plant_digital_twin(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    PLANT DIGITAL TWIN & GROWTH DEVIATION RADAR:
    Returns expected vs actual phenological timeline, accumulated GDD baseline,
    and deviation radar classification.
    """
    user_id = current_user.id if current_user else None
    return DigitalTwinService.get_digital_twin(db, plant_id, user_id=user_id)

@router.post("/{plant_id}/what-if", response_model=WhatIfResponse)
def simulate_what_if_growth(
    plant_id: str,
    scenario: WhatIfRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    WHAT-IF GROWTH SIMULATOR:
    Simulates harvest shift and physiological impacts under altered microclimate conditions.
    """
    user_id = current_user.id if current_user else None
    return DigitalTwinService.simulate_what_if(db, plant_id, scenario, user_id=user_id)

@router.get("/{plant_id}/next-observation", response_model=NextBestObservationData)
def get_next_observation_advice(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    NEXT BEST OBSERVATION SUGGESTION:
    Returns contextual timing and focus area for the farmer's next photographic inspection.
    """
    return DigitalTwinService.get_next_observation_advice(db, plant_id)

# ================= Treatment & Recovery Tracking =================

@router.get("/{plant_id}/treatment", response_model=Optional[TreatmentPlanResponse])
def get_plant_active_treatment(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve active treatment and recovery plan for this specific plant."""
    user_id = current_user.id if current_user else None
    return TreatmentService.get_plant_treatment(db, plant_id, user_id=user_id)

@router.get("/{plant_id}/recovery-history", response_model=List[TreatmentPlanResponse])
def get_plant_treatment_history(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all historical treatment plans and recovery records for this plant."""
    return TreatmentService.get_plant_treatment_history(db, plant_id)

# ================= Geometric Anomaly Inspector =================

@router.post("/{plant_id}/geometric-analysis", response_model=GeometricAnalysisResponse, status_code=status.HTTP_201_CREATED)
async def run_plant_geometric_analysis(
    plant_id: str,
    observation_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    GEOMETRIC ANOMALY INSPECTOR:
    Applies OpenCV morphological segmentation, boundary contour extraction,
    convex hull irregularity, circularity, asymmetry metrics, and longitudinal area change.
    """
    user_id = current_user.id if current_user else None
    return GeometricInspectorService.inspect_plant_geometry(
        db=db,
        plant_id=plant_id,
        observation_id=observation_id,
        image_file=image,
        user_id=user_id
    )

@router.get("/{plant_id}/geometric-analyses", response_model=List[GeometricAnalysisResponse])
def get_plant_geometric_analyses(
    plant_id: str,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve historical geometric analysis results and visual overlays for this plant."""
    return GeometricInspectorService.get_plant_geometric_analyses(db, plant_id)


