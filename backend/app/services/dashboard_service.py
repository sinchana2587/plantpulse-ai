from datetime import date, datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.forecast import Forecast
from app.schemas.dashboard import (
    DashboardResponse,
    StageCount,
    UpcomingMilestone,
    EnvironmentalSummary,
    PlantAttentionItem
)
from app.services.observation_service import ObservationService

class DashboardService:
    @staticmethod
    def get_dashboard_summary(db: Session, include_demo: bool = True, user_id: Optional[str] = None) -> DashboardResponse:
        plant_query = db.query(Plant)
        obs_query = db.query(Observation)
        
        if user_id:
            if include_demo:
                plant_query = plant_query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
                obs_query = obs_query.join(Plant).filter((Plant.user_id == user_id) | (Plant.is_demo == True))
            else:
                plant_query = plant_query.filter(Plant.user_id == user_id, Plant.is_demo == False)
                obs_query = obs_query.join(Plant).filter(Plant.user_id == user_id, Plant.is_demo == False)
        else:
            if not include_demo:
                plant_query = plant_query.filter(Plant.is_demo == False)
                obs_query = obs_query.join(Plant).filter(Plant.is_demo == False)

        total_plants = plant_query.count()
        
        # Plants that have at least 1 observation
        monitored_plant_ids = obs_query.with_entities(Observation.plant_id).distinct().all()
        monitored_plants = len(monitored_plant_ids)

        # Stage distribution across all plants
        stage_counts: Dict[str, int] = {
            "Seedling": 0,
            "Vegetative": 0,
            "Flowering": 0,
            "Fruit Formation": 0,
            "Maturity": 0
        }

        plants = plant_query.all()
        upcoming_milestones: List[UpcomingMilestone] = []
        attention_items: List[PlantAttentionItem] = []

        today = date.today()

        for plant in plants:
            latest_obs = (
                db.query(Observation)
                .filter(Observation.plant_id == plant.id)
                .order_by(Observation.observation_date.desc())
                .first()
            )
            curr_stage = latest_obs.effective_stage if latest_obs else "Seedling"
            if curr_stage in stage_counts:
                stage_counts[curr_stage] += 1
            else:
                stage_counts[curr_stage] = stage_counts.get(curr_stage, 0) + 1

            # Check latest forecast for upcoming milestones
            latest_fc = (
                db.query(Forecast)
                .filter(Forecast.plant_id == plant.id, Forecast.is_latest == True)
                .first()
            )
            if latest_fc:
                # Find the next upcoming milestone
                if curr_stage in ["Seedling", "Vegetative"] and latest_fc.flowering_start:
                    days_rem = (latest_fc.flowering_start - today).days
                    upcoming_milestones.append(UpcomingMilestone(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        milestone_name="Flowering",
                        target_window_start=str(latest_fc.flowering_start),
                        target_window_end=str(latest_fc.flowering_end),
                        days_remaining=days_rem
                    ))
                elif curr_stage == "Flowering" and latest_fc.fruit_formation_start:
                    days_rem = (latest_fc.fruit_formation_start - today).days
                    upcoming_milestones.append(UpcomingMilestone(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        milestone_name="Fruit Formation",
                        target_window_start=str(latest_fc.fruit_formation_start),
                        target_window_end=str(latest_fc.fruit_formation_end),
                        days_remaining=days_rem
                    ))
                elif curr_stage == "Fruit Formation" and latest_fc.maturity_start:
                    days_rem = (latest_fc.maturity_start - today).days
                    upcoming_milestones.append(UpcomingMilestone(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        milestone_name="Maturity & Ripening",
                        target_window_start=str(latest_fc.maturity_start),
                        target_window_end=str(latest_fc.maturity_end),
                        days_remaining=days_rem
                    ))
                elif curr_stage == "Maturity" and latest_fc.harvest_window_start:
                    days_rem = (latest_fc.harvest_window_start - today).days
                    upcoming_milestones.append(UpcomingMilestone(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        milestone_name="Harvest Window",
                        target_window_start=str(latest_fc.harvest_window_start),
                        target_window_end=str(latest_fc.harvest_window_end),
                        days_remaining=days_rem
                    ))

            # Environmental attention detection
            if latest_obs:
                if latest_obs.soil_moisture is not None and latest_obs.soil_moisture < 40.0:
                    attention_items.append(PlantAttentionItem(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        issue=f"Low Soil Moisture ({latest_obs.soil_moisture:.1f}%)",
                        severity="warning",
                        recommendation="Increase drip cycle frequency to prevent blossom drop and water stress."
                    ))
                if latest_obs.temperature is not None and (latest_obs.temperature > 33.0 or latest_obs.temperature < 14.0):
                    attention_items.append(PlantAttentionItem(
                        plant_id=plant.id,
                        plant_name=plant.name,
                        issue=f"Temperature Stress ({latest_obs.temperature:.1f}°C)",
                        severity="alert",
                        recommendation="Adjust greenhouse ventilation or shading to protect pollen viability."
                    ))

        # Recent 5 observations
        recent_query = db.query(Observation)
        if not include_demo:
            recent_query = recent_query.join(Plant).filter(Plant.is_demo == False)
        recent_obs_records = (
            recent_query
            .order_by(Observation.observation_date.desc())
            .limit(5)
            .all()
        )
        recent_observations = [ObservationService._to_response(o) for o in recent_obs_records]

        # Overall environmental averages
        env_obs_query = db.query(Observation)
        if not include_demo:
            env_obs_query = env_obs_query.join(Plant).filter(Plant.is_demo == False)
        all_obs = env_obs_query.all()
        obs_count = len(all_obs)
        temps = [o.temperature for o in all_obs if o.temperature is not None]
        humids = [o.humidity for o in all_obs if o.humidity is not None]
        soils = [o.soil_moisture for o in all_obs if o.soil_moisture is not None]
        rains = [o.rainfall for o in all_obs if o.rainfall is not None]
        suns = [o.sunlight_hours for o in all_obs if o.sunlight_hours is not None]

        env_summary = EnvironmentalSummary(
            average_temperature=round(float(sum(temps)/len(temps)), 1) if temps else None,
            average_humidity=round(float(sum(humids)/len(humids)), 1) if humids else None,
            average_soil_moisture=round(float(sum(soils)/len(soils)), 1) if soils else None,
            total_rainfall=round(float(sum(rains)), 1) if rains else None,
            average_sunlight_hours=round(float(sum(suns)/len(suns)), 1) if suns else None,
            observation_count=obs_count
        )

        stage_dist = [StageCount(stage=k, count=v) for k, v in stage_counts.items()]

        return DashboardResponse(
            total_plants=total_plants,
            monitored_plants=monitored_plants,
            stage_distribution=stage_dist,
            upcoming_milestones=upcoming_milestones[:5],
            recent_observations=recent_observations,
            environmental_overview=env_summary,
            plants_requiring_attention=attention_items[:5]
        )
