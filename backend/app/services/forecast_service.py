import json
from datetime import datetime, date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.forecast import Forecast
from app.schemas.forecast import ForecastResponse, DateRange
from app.ml.phenology_engine import PhenologyEngine

class ForecastService:
    @staticmethod
    def generate_and_save_forecast(db: Session, plant_id: str) -> Optional[ForecastResponse]:
        plant = db.query(Plant).filter(Plant.id == plant_id).first()
        if not plant:
            return None

        # Fetch observations chronologically
        observations = (
            db.query(Observation)
            .filter(Observation.plant_id == plant_id)
            .order_by(Observation.observation_date.asc())
            .all()
        )

        current_stage = "Seedling"
        if observations:
            latest_obs = observations[-1]
            current_stage = latest_obs.effective_stage

        # Run phenological engine
        milestone_data = PhenologyEngine.predict_milestones(
            planting_date=plant.planting_date,
            current_stage=current_stage,
            observations=observations,
            crop_type=plant.crop_type,
            crop_variety=plant.crop_variety
        )

        # Set older forecasts for this plant to is_latest = False
        db.query(Forecast).filter(Forecast.plant_id == plant_id).update({"is_latest": False})

        # Helper to convert date to date object safely
        def to_d(dt_val):
            if dt_val is None:
                return None
            if isinstance(dt_val, datetime):
                return dt_val.date()
            if isinstance(dt_val, date):
                return dt_val
            return None

        flowering_start = to_d(milestone_data["flowering_window"]["start"])
        flowering_end = to_d(milestone_data["flowering_window"]["end"])
        fruit_start = to_d(milestone_data["fruit_formation_window"]["start"])
        fruit_end = to_d(milestone_data["fruit_formation_window"]["end"])
        maturity_start = to_d(milestone_data["maturity_window"]["start"])
        maturity_end = to_d(milestone_data["maturity_window"]["end"])
        harvest_start = to_d(milestone_data["harvest_window"]["start"])
        harvest_end = to_d(milestone_data["harvest_window"]["end"])

        forecast_record = Forecast(
            plant_id=plant_id,
            forecast_date=datetime.utcnow(),
            current_stage=current_stage,
            method=milestone_data["method"],
            model_version=milestone_data["model_version"],
            observations_used_count=milestone_data["observations_used_count"],
            flowering_start=flowering_start,
            flowering_end=flowering_end,
            fruit_formation_start=fruit_start,
            fruit_formation_end=fruit_end,
            maturity_start=maturity_start,
            maturity_end=maturity_end,
            harvest_window_start=harvest_start,
            harvest_window_end=harvest_end,
            environmental_factors_json=json.dumps(milestone_data["environmental_factors"]),
            assumptions_json=json.dumps(milestone_data["assumptions"]),
            limitations_json=json.dumps(milestone_data["limitations"]),
            recommendations_json=json.dumps(milestone_data["recommendations"]),
            is_latest=True
        )
        db.add(forecast_record)
        db.commit()
        db.refresh(forecast_record)

        return ForecastService._to_response(forecast_record)

    @staticmethod
    def get_latest_forecast(db: Session, plant_id: str) -> Optional[ForecastResponse]:
        fc = (
            db.query(Forecast)
            .filter(Forecast.plant_id == plant_id, Forecast.is_latest == True)
            .order_by(Forecast.created_at.desc())
            .first()
        )
        if not fc:
            # Check if any forecast exists at all
            fc = (
                db.query(Forecast)
                .filter(Forecast.plant_id == plant_id)
                .order_by(Forecast.created_at.desc())
                .first()
            )
        if not fc:
            return None
        return ForecastService._to_response(fc)

    @staticmethod
    def get_forecast_history(db: Session, plant_id: str) -> List[ForecastResponse]:
        fcs = (
            db.query(Forecast)
            .filter(Forecast.plant_id == plant_id)
            .order_by(Forecast.created_at.desc())
            .all()
        )
        return [ForecastService._to_response(fc) for fc in fcs]

    @staticmethod
    def _to_response(fc: Forecast) -> ForecastResponse:
        env_factors = json.loads(fc.environmental_factors_json) if fc.environmental_factors_json else {}
        assumptions = json.loads(fc.assumptions_json) if fc.assumptions_json else []
        limitations = json.loads(fc.limitations_json) if fc.limitations_json else []
        recommendations = json.loads(fc.recommendations_json) if fc.recommendations_json else []

        return ForecastResponse(
            id=fc.id,
            plant_id=fc.plant_id,
            forecast_date=fc.forecast_date,
            current_stage=fc.current_stage,
            method=fc.method,
            model_version=fc.model_version,
            observations_used_count=fc.observations_used_count,
            flowering_window=DateRange(start=fc.flowering_start, end=fc.flowering_end),
            fruit_formation_window=DateRange(start=fc.fruit_formation_start, end=fc.fruit_formation_end),
            maturity_window=DateRange(start=fc.maturity_start, end=fc.maturity_end),
            harvest_window=DateRange(start=fc.harvest_window_start, end=fc.harvest_window_end),
            environmental_factors=env_factors,
            assumptions=assumptions,
            limitations=limitations,
            recommendations=recommendations,
            is_latest=fc.is_latest,
            created_at=fc.created_at
        )
