from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.forecast import Forecast
from app.schemas.plant import PlantCreate, PlantUpdate, PlantResponse

class PlantService:
    @staticmethod
    def get_plants(
        db: Session,
        skip: int = 0,
        limit: int = 100,
        crop_type: Optional[str] = None,
        monitored_only: Optional[bool] = None,
        include_demo: bool = True,
        user_id: Optional[str] = None
    ) -> List[PlantResponse]:
        query = db.query(Plant)
        
        if user_id:
            # Multi-user data isolation: only user's private plants plus demo if enabled
            if include_demo:
                query = query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
            else:
                query = query.filter(Plant.user_id == user_id, Plant.is_demo == False)
        else:
            if not include_demo:
                query = query.filter(Plant.is_demo == False)
        
        if crop_type and crop_type.lower() != "all":
            query = query.filter(Plant.crop_type.ilike(crop_type))
        plants = query.offset(skip).limit(limit).all()
        results = []
        for p in plants:
            obs_count = db.query(Observation).filter(Observation.plant_id == p.id).count()
            if monitored_only is True and obs_count == 0:
                continue
            if monitored_only is False and obs_count > 0:
                continue

            latest_obs = (
                db.query(Observation)
                .filter(Observation.plant_id == p.id)
                .order_by(Observation.observation_date.desc())
                .first()
            )
            has_fc = db.query(Forecast).filter(Forecast.plant_id == p.id).first() is not None
            
            latest_stage = latest_obs.effective_stage if latest_obs else "Seedling"
            latest_obs_dt = latest_obs.observation_date if latest_obs else None

            results.append(PlantResponse(
                id=p.id,
                name=p.name,
                crop_type=p.crop_type,
                crop_variety=p.crop_variety,
                planting_date=p.planting_date,
                location=p.location,
                description=p.description,
                is_demo=p.is_demo,
                created_at=p.created_at,
                updated_at=p.updated_at,
                latest_stage=latest_stage,
                observation_count=obs_count,
                latest_observation_date=latest_obs_dt,
                has_forecast=has_fc
            ))
        return results

    @staticmethod
    def get_plant_by_id(db: Session, plant_id: str, user_id: Optional[str] = None) -> Optional[PlantResponse]:
        query = db.query(Plant).filter(Plant.id == plant_id)
        p = query.first()
        if not p:
            return None
        # Strict user authorization check: if plant belongs to another user and is not demo
        if user_id and p.user_id and p.user_id != user_id and not p.is_demo:
            return None
        obs_count = db.query(Observation).filter(Observation.plant_id == p.id).count()
        latest_obs = (
            db.query(Observation)
            .filter(Observation.plant_id == p.id)
            .order_by(Observation.observation_date.desc())
            .first()
        )
        has_fc = db.query(Forecast).filter(Forecast.plant_id == p.id).first() is not None
        latest_stage = latest_obs.effective_stage if latest_obs else "Seedling"
        latest_obs_dt = latest_obs.observation_date if latest_obs else None

        return PlantResponse(
            id=p.id,
            name=p.name,
            crop_type=p.crop_type,
            crop_variety=p.crop_variety,
            planting_date=p.planting_date,
            location=p.location,
            description=p.description,
            is_demo=p.is_demo,
            created_at=p.created_at,
            updated_at=p.updated_at,
            latest_stage=latest_stage,
            observation_count=obs_count,
            latest_observation_date=latest_obs_dt,
            has_forecast=has_fc
        )

    @staticmethod
    def create_plant(db: Session, plant_in: PlantCreate, is_demo: bool = False, user_id: Optional[str] = None) -> Plant:
        plant = Plant(
            name=plant_in.name,
            crop_type=plant_in.crop_type,
            crop_variety=plant_in.crop_variety,
            planting_date=plant_in.planting_date,
            location=plant_in.location,
            description=plant_in.description,
            is_demo=is_demo,
            user_id=user_id
        )
        db.add(plant)
        db.commit()
        db.refresh(plant)
        return plant

    @staticmethod
    def update_plant(db: Session, plant_id: str, plant_in: PlantUpdate, user_id: Optional[str] = None) -> Optional[Plant]:
        plant = db.query(Plant).filter(Plant.id == plant_id).first()
        if not plant:
            return None
        if user_id and plant.user_id and plant.user_id != user_id and not plant.is_demo:
            return None
        update_data = plant_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(plant, field, value)
        db.commit()
        db.refresh(plant)
        return plant

    @staticmethod
    def delete_plant(db: Session, plant_id: str, user_id: Optional[str] = None) -> bool:
        plant = db.query(Plant).filter(Plant.id == plant_id).first()
        if not plant:
            return False
        if user_id and plant.user_id and plant.user_id != user_id and not plant.is_demo:
            return False
        db.delete(plant)
        db.commit()
        return True
