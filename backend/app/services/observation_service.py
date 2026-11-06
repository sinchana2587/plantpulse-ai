import json
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.telemetry import TelemetryReading
from app.schemas.observation import (
    ObservationCreate,
    ObservationResponse,
    ImageAnalysisResponse,
    PaginatedObservationResponse
)
from app.ml.growth_stage_classifier import classifier_instance
from app.services.storage_service import StorageService

class ObservationService:
    @staticmethod
    def create_observation(
        db: Session,
        obs_in: ObservationCreate,
        image_path: Optional[str] = None,
        is_demo: bool = False
    ) -> Observation:
        plant = db.query(Plant).filter(Plant.id == obs_in.plant_id).first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found")

        obs = Observation(
            plant_id=obs_in.plant_id,
            observation_date=obs_in.observation_date or datetime.utcnow(),
            image_path=image_path,
            temperature=obs_in.temperature,
            humidity=obs_in.humidity,
            soil_moisture=obs_in.soil_moisture,
            sunlight_hours=obs_in.sunlight_hours,
            rainfall=obs_in.rainfall,
            manual_growth_stage=obs_in.manual_growth_stage,
            is_demo=is_demo
        )

        # AI analysis on creation ONLY if the crop is Tomato (trained model exists)
        is_tomato = (plant.crop_type or "").lower() == "tomato"
        if image_path and is_tomato:
            try:
                abs_path = StorageService.get_absolute_path(image_path)
                if abs_path.exists() and classifier_instance.is_available:
                    analysis = classifier_instance.predict(str(abs_path))
                    obs.ai_growth_stage = analysis["predicted_stage"]
                    obs.confidence_score = analysis["confidence_score"]
                    obs.stage_scores_json = json.dumps(analysis["stage_scores"])
                    obs.model_version = analysis["model_version"]
            except Exception as e:
                print(f"[ObservationService] Auto-analysis skipped or failed: {e}")

        db.add(obs)
        db.commit()
        db.refresh(obs)

        # Also store matching telemetry reading records for genuine time-series tracking
        source = obs_in.data_source or "MANUAL_ENTRY"
        obs_time = obs.observation_date
        
        telemetry_items = [
            ("temperature", obs.temperature, "°C", -30.0, 65.0),
            ("soil_moisture", obs.soil_moisture, "%", 0.0, 100.0),
            ("humidity", obs.humidity, "%", 0.0, 100.0),
            ("sunlight_hours", obs.sunlight_hours, "hrs", 0.0, 24.0),
            ("rainfall", obs.rainfall, "mm", 0.0, 500.0),
        ]

        for p_name, val, unit_label, min_v, max_v in telemetry_items:
            if val is not None:
                v_status = "VALID" if (min_v <= val <= max_v) else "REJECTED"
                t_record = TelemetryReading(
                    plant_id=plant.id,
                    observation_id=obs.id,
                    parameter_name=p_name,
                    value=float(val),
                    unit=unit_label,
                    timestamp=obs_time,
                    data_source=source,
                    sensor_id=obs_in.sensor_id,
                    validation_status=v_status
                )
                db.add(t_record)

        db.commit()
        return obs

    @staticmethod
    def get_all_observations(
        db: Session,
        page: int = 1,
        page_size: int = 10,
        crop_type: Optional[str] = None,
        plant_id: Optional[str] = None,
        growth_stage: Optional[str] = None,
        search: Optional[str] = None,
        include_demo: bool = True,
        user_id: Optional[str] = None
    ) -> PaginatedObservationResponse:
        query = db.query(Observation).join(Plant)

        if user_id:
            if include_demo:
                query = query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
            else:
                query = query.filter(Plant.user_id == user_id, Plant.is_demo == False)
        elif not include_demo:
            query = query.filter(Plant.is_demo == False)
        if plant_id:
            query = query.filter(Observation.plant_id == plant_id)
        if crop_type and crop_type.lower() != "all":
            query = query.filter(Plant.crop_type.ilike(crop_type))
        if growth_stage and growth_stage.lower() != "all":
            query = query.filter(
                or_(
                    Observation.manual_growth_stage == growth_stage,
                    Observation.ai_growth_stage == growth_stage
                )
            )
        if search:
            query = query.filter(
                or_(
                    Plant.name.ilike(f"%{search}%"),
                    Plant.location.ilike(f"%{search}%")
                )
            )

        total = query.count()
        offset = (page - 1) * page_size
        records = query.order_by(Observation.observation_date.desc()).offset(offset).limit(page_size).all()
        
        items = [ObservationService._to_response(o) for o in records]
        total_pages = max(1, (total + page_size - 1) // page_size)

        return PaginatedObservationResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    @staticmethod
    def get_plant_observations(db: Session, plant_id: str) -> List[ObservationResponse]:
        observations = (
            db.query(Observation)
            .filter(Observation.plant_id == plant_id)
            .order_by(Observation.observation_date.asc())
            .all()
        )
        return [ObservationService._to_response(o) for o in observations]

    @staticmethod
    def get_observation_by_id(db: Session, obs_id: str) -> Optional[Observation]:
        return db.query(Observation).filter(Observation.id == obs_id).first()

    @staticmethod
    def analyze_observation_image(db: Session, obs_id: str) -> ImageAnalysisResponse:
        obs = db.query(Observation).filter(Observation.id == obs_id).first()
        if not obs:
            raise HTTPException(status_code=404, detail="Observation not found")
        if not obs.image_path:
            raise HTTPException(status_code=400, detail="No photograph attached to this observation.")

        plant = obs.plant
        crop_type = plant.crop_type if plant else "Tomato"
        is_tomato = crop_type.lower() == "tomato"

        if not is_tomato:
            # Multi-crop honesty: do not run tomato model or generate fake AI predictions on other crops
            return ImageAnalysisResponse(
                observation_id=obs.id,
                plant_id=obs.plant_id,
                crop_type=crop_type,
                predicted_stage=obs.manual_growth_stage or "Model Standby (Manual Mode)",
                confidence_score=None,
                model_version="1.0.0",
                stage_scores=None,
                model_available=False,
                source="Manual Classification Mode",
                analysis_summary=f"Visual AI classification model is currently trained exclusively for Tomato. For {crop_type}, manual growth stage entry is enabled.",
                known_limitations=f"No trained deep learning visual checkpoint exists for {crop_type} yet. Phenology forecasting uses validated {crop_type} GDD baseline."
            )

        abs_path = StorageService.get_absolute_path(obs.image_path)
        if not abs_path.exists():
            raise HTTPException(status_code=404, detail="Observation image file not found on disk.")

        if not classifier_instance.is_available:
            classifier_instance.load_model()
            if not classifier_instance.is_available:
                raise HTTPException(
                    status_code=503,
                    detail="AI growth stage classification model is currently unavailable. You may manually assign the growth stage."
                )

        analysis = classifier_instance.predict(str(abs_path))

        # Save classification back to observation record
        obs.ai_growth_stage = analysis["predicted_stage"]
        obs.confidence_score = analysis["confidence_score"]
        obs.stage_scores_json = json.dumps(analysis["stage_scores"])
        obs.model_version = analysis["model_version"]
        db.commit()
        db.refresh(obs)

        return ImageAnalysisResponse(
            observation_id=obs.id,
            plant_id=obs.plant_id,
            crop_type=crop_type,
            predicted_stage=analysis["predicted_stage"],
            confidence_score=analysis["confidence_score"],
            model_version=analysis["model_version"],
            stage_scores=analysis["stage_scores"],
            model_available=True,
            source=analysis["source"],
            analysis_summary=analysis["analysis_summary"],
            known_limitations=analysis["known_limitations"]
        )

    @staticmethod
    def correct_growth_stage(db: Session, obs_id: str, new_stage: str) -> ObservationResponse:
        obs = db.query(Observation).filter(Observation.id == obs_id).first()
        if not obs:
            raise HTTPException(status_code=404, detail="Observation not found")

        obs.manual_growth_stage = new_stage
        db.commit()
        db.refresh(obs)
        return ObservationService._to_response(obs)

    @staticmethod
    def _to_response(obs: Observation) -> ObservationResponse:
        scores = json.loads(obs.stage_scores_json) if obs.stage_scores_json else None
        return ObservationResponse(
            id=obs.id,
            plant_id=obs.plant_id,
            plant_name=obs.plant.name if obs.plant else None,
            crop_type=obs.plant.crop_type if obs.plant else None,
            observation_date=obs.observation_date,
            image_path=obs.image_path,
            temperature=obs.temperature,
            humidity=obs.humidity,
            soil_moisture=obs.soil_moisture,
            sunlight_hours=obs.sunlight_hours,
            rainfall=obs.rainfall,
            manual_growth_stage=obs.manual_growth_stage,
            ai_growth_stage=obs.ai_growth_stage,
            confidence_score=obs.confidence_score,
            model_version=obs.model_version,
            stage_scores=scores,
            effective_stage=obs.effective_stage,
            is_demo=obs.is_demo,
            data_source="MANUAL_ENTRY",
            created_at=obs.created_at
        )
