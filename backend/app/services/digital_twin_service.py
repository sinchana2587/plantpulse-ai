import json
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.plant import Plant
from app.models.observation import Observation
from app.models.telemetry import TelemetryReading
from app.models.analysis import DigitalTwinSnapshot
from app.services.dataset_service import CROP_AGRONOMY_DATABASE
from app.ml.phenology_engine import PhenologyEngine
from app.schemas.analysis import (
    DigitalTwinResponse,
    TimelineMilestone,
    WhatIfRequest,
    WhatIfResponse,
    NextBestObservationData
)

class DigitalTwinService:
    """
    Plant Digital Twin & Growth Deviation Radar Engine.
    Plots real-time crop progress against regional thermal degree day baselines,
    computes phenological deviation indices, and powers the What-If Growth Simulator.
    """

    @classmethod
    def get_digital_twin(cls, db: Session, plant_id: str, user_id: Optional[str] = None) -> DigitalTwinResponse:
        plant_query = db.query(Plant).filter(Plant.id == plant_id)
        if user_id:
            plant_query = plant_query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
        plant = plant_query.first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or access denied")

        crop_key = plant.crop_type.lower().strip()
        crop_profile = CROP_AGRONOMY_DATABASE.get(crop_key, CROP_AGRONOMY_DATABASE["tomato"])
        crop_cfg = PhenologyEngine.get_crop_config(crop_key)
        t_base = crop_cfg.get("t_base", 10.0)

        # Observations
        observations = (
            db.query(Observation)
            .filter(Observation.plant_id == plant.id)
            .order_by(Observation.observation_date.asc())
            .all()
        )

        # Plant age
        days_in_ground = max(0, (date.today() - plant.planting_date).days)

        # Reference GDD: expected cumulative GDD at optimal conditions (approx 15.5 GDD/day for tomato)
        daily_ref_gdd = max(3.0, 25.5 - t_base)
        expected_gdd = round(days_in_ground * daily_ref_gdd, 1)

        # Actual GDD calculation from recorded observations / telemetry
        actual_temps = [obs.temperature for obs in observations if obs.temperature is not None]
        if not actual_temps:
            # Check telemetry table
            telem = db.query(TelemetryReading).filter(
                TelemetryReading.plant_id == plant.id,
                TelemetryReading.parameter_name == "temperature"
            ).all()
            actual_temps = [t.value for t in telem if t.value is not None]

        mean_temp = float(sum(actual_temps) / len(actual_temps)) if actual_temps else 25.0
        daily_actual_gdd = max(1.0, mean_temp - t_base)
        actual_gdd = round(days_in_ground * daily_actual_gdd, 1)

        # Growth stages in profile
        stages = crop_profile.get("growth_stages", [])
        
        # Expected stage based on days in ground
        expected_stage = stages[0]["stage"] if stages else "Seedling"
        stage_days_cfg = crop_cfg.get("stage_days", {})
        for s_name, (d_start, d_end) in stage_days_cfg.items():
            if d_start <= days_in_ground <= d_end:
                expected_stage = s_name
                break
        else:
            if days_in_ground > 90 and stages:
                expected_stage = stages[-1]["stage"]

        # Actual current stage
        actual_stage = observations[-1].effective_stage if observations else expected_stage

        # Stage indexing
        stage_names_list = [s["stage"].lower() for s in stages]
        exp_idx = stage_names_list.index(expected_stage.lower()) if expected_stage.lower() in stage_names_list else 0
        act_idx = stage_names_list.index(actual_stage.lower()) if actual_stage.lower() in stage_names_list else 0

        # Deviation calculation
        stage_diff = act_idx - exp_idx
        deviation_days = int(round((actual_gdd - expected_gdd) / max(1.0, daily_ref_gdd)))
        
        # Determine status
        if len(observations) == 0:
            status = "Insufficient Data"
            explanation = "No photographic observations or continuous telemetry have been logged yet to establish actual developmental pace."
        elif abs(deviation_days) <= 3 and stage_diff == 0:
            status = "Within Expected Range"
            explanation = f"Crop development aligns closely with the regional thermal baseline (GDD delta: {actual_gdd - expected_gdd:+.1f} units, {deviation_days:+} days variance)."
        elif deviation_days > 3 or stage_diff > 0:
            status = "Faster Than Reference"
            explanation = f"Crop is progressing approximately {abs(deviation_days)} days ahead of standard expectation due to favorable thermal accumulation ({mean_temp:.1f}°C ambient)."
        elif deviation_days < -6 or stage_diff < -1:
            status = "Potential Growth Concern"
            explanation = f"Crop is delayed by approximately {abs(deviation_days)} days relative to expected thermal milestones. Microclimate stress (soil moisture deficit or extreme heat) is retarding phenological transition."
        else:
            status = "Slower Than Reference"
            explanation = f"Crop developmental pace is slightly trailing ({abs(deviation_days)} days behind reference) due to sub-optimal temperature or irrigation variability."

        # Build timeline
        timeline: List[TimelineMilestone] = []
        for i, st in enumerate(stages):
            s_name = st["stage"]
            day_range = st.get("days_range", "0-14").split("-")
            exp_day = int(day_range[-1].strip())
            exp_date = plant.planting_date + timedelta(days=exp_day)

            # Look for matching observation
            obs_match = next((o for o in observations if o.effective_stage.lower() == s_name.lower()), None)
            obs_day = (obs_match.observation_date.date() - plant.planting_date).days if obs_match else None
            obs_date = obs_match.observation_date.strftime("%Y-%m-%d") if obs_match else None

            if obs_match:
                m_status = "Completed"
            elif i == act_idx:
                m_status = "In Progress"
            elif i < act_idx:
                m_status = "Completed"
            elif days_in_ground > exp_day + 5:
                m_status = "Delayed"
            else:
                m_status = "Pending"

            timeline.append(TimelineMilestone(
                stage=s_name,
                expected_day=exp_day,
                expected_date=exp_date.isoformat(),
                observed_day=obs_day,
                observed_date=obs_date,
                status=m_status
            ))

        # Reference GDD Curve points
        ref_curve = []
        for d in [0, 15, 30, 45, 60, 75, 90, 105, 120]:
            ref_curve.append({
                "day": d,
                "expected_gdd": round(d * daily_ref_gdd, 1),
                "actual_gdd": round(d * daily_actual_gdd, 1) if d <= days_in_ground else None
            })

        radar_factors = {
            "thermal_accumulation_rate": round(daily_actual_gdd, 2),
            "reference_thermal_rate": round(daily_ref_gdd, 2),
            "mean_recorded_temperature": round(mean_temp, 1),
            "current_stage_match": (actual_stage.lower() == expected_stage.lower()),
            "days_ahead_or_behind": deviation_days,
            "observations_recorded": len(observations)
        }

        # Snapshot saving
        try:
            snapshot = DigitalTwinSnapshot(
                plant_id=plant.id,
                crop_type=plant.crop_type,
                chronological_age_days=days_in_ground,
                expected_gdd=expected_gdd,
                actual_gdd=actual_gdd,
                expected_stage=expected_stage,
                actual_stage=actual_stage,
                deviation_days=deviation_days,
                deviation_status=status,
                deviation_reasons=json.dumps(radar_factors)
            )
            db.add(snapshot)
            db.commit()
        except Exception:
            db.rollback()

        return DigitalTwinResponse(
            plant_id=plant.id,
            plant_name=plant.name,
            crop_type=plant.crop_type,
            crop_variety=plant.crop_variety,
            planting_date=plant.planting_date.isoformat(),
            chronological_age_days=days_in_ground,
            expected_gdd=expected_gdd,
            actual_gdd=actual_gdd,
            expected_stage=expected_stage,
            actual_stage=actual_stage,
            deviation_days=deviation_days,
            deviation_status=status,
            deviation_explanation=explanation,
            timeline=timeline,
            radar_factors=radar_factors,
            reference_gdd_curve=ref_curve
        )

    @classmethod
    def simulate_what_if(
        cls,
        db: Session,
        plant_id: str,
        request: WhatIfRequest,
        user_id: Optional[str] = None
    ) -> WhatIfResponse:
        plant_query = db.query(Plant).filter(Plant.id == plant_id)
        if user_id:
            plant_query = plant_query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
        plant = plant_query.first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or access denied")

        crop_key = plant.crop_type.lower().strip()
        crop_cfg = PhenologyEngine.get_crop_config(crop_key)
        crop_profile = CROP_AGRONOMY_DATABASE.get(crop_key, CROP_AGRONOMY_DATABASE["tomato"])
        t_base = crop_cfg.get("t_base", 10.0)

        # Baseline days to harvest
        days_in_ground = max(0, (date.today() - plant.planting_date).days)
        stages = crop_profile.get("growth_stages", [])
        total_cycle = int(stages[-1].get("days_range", "110").split("-")[-1].strip()) if stages else 110
        base_remaining = max(5, total_cycle - days_in_ground)

        # Deltas
        d_moist = request.soil_moisture_delta_pct or 0.0
        d_temp = request.temperature_delta_c or 0.0
        d_sun = request.sunlight_delta_hours or 0.0

        # Calculate daily thermal degree change
        daily_gdd_change = round(d_temp, 2)

        # Moisture factor: optimal is 55-65%
        # Increasing moisture when deficit helps accelerate; extreme moisture hurts
        consequences: List[str] = []
        harvest_shift = 0

        # Temperature simulation impact
        if d_temp > 0:
            if d_temp <= 3.0:
                shift_from_temp = int(round(-1 * (d_temp * 2.2)))
                consequences.append(f"Temperature increase of +{d_temp:.1f}°C enhances metabolic kinetics, advancing thermal maturity by ~{abs(shift_from_temp)} days.")
                harvest_shift += shift_from_temp
            else:
                consequences.append(f"Excess temperature increase (+{d_temp:.1f}°C) exceeds photosynthetic enzymatic optimum, triggering floral drop and delayed fruit set.")
                harvest_shift += 4
        elif d_temp < 0:
            shift_from_temp = int(round(abs(d_temp) * 2.5))
            consequences.append(f"Temperature drop of {d_temp:.1f}°C slows thermal accumulation, extending maturity cycle by ~{shift_from_temp} days.")
            harvest_shift += shift_from_temp

        # Moisture simulation impact
        if d_moist > 0:
            if d_moist <= 12.0:
                consequences.append(f"Optimizing root-zone soil moisture by +{d_moist:.1f}% relieves vegetative moisture stress and accelerates fruit cell sizing by ~2-3 days.")
                harvest_shift -= 2
            else:
                consequences.append(f"Heavy excess moisture (+{d_moist:.1f}%) risks soil waterlogging and root hypoxia, potentially delaying maturity.")
                harvest_shift += 3
        elif d_moist < 0:
            shift_from_moist = int(round(abs(d_moist) * 0.35))
            consequences.append(f"Moisture deficit of {d_moist:.1f}% slows cellular elongation and increases leaf stomatal closure, extending harvest wait by ~{shift_from_moist} days.")
            harvest_shift += shift_from_moist

        # Sunlight impact
        if d_sun > 0:
            consequences.append(f"Additional {d_sun:.1f} hours of daily irradiance boosts photosynthetic carbohydrate production.")
            harvest_shift -= 1
        elif d_sun < 0:
            consequences.append(f"Reduction of {abs(d_sun):.1f} sunlight hours limits assimilatory capacity and delays anthesis.")
            harvest_shift += 2

        simulated_remaining = max(3, base_remaining + harvest_shift)
        actual_shift = simulated_remaining - base_remaining

        if actual_shift < 0:
            summary = f"Simulated conditions accelerate developmental pace, shortening remaining harvest time by {abs(actual_shift)} days ({simulated_remaining} days remaining vs baseline {base_remaining})."
            rec = "Maintaining this elevated moisture and thermal management will yield an earlier, concentrated harvest."
        elif actual_shift > 0:
            summary = f"Simulated conditions introduce developmental drag, delaying harvest maturity by {actual_shift} days ({simulated_remaining} days remaining vs baseline {base_remaining})."
            rec = "Mitigate stress by maintaining stable root moisture and avoiding extreme microclimate fluctuations."
        else:
            summary = f"Simulated microclimate shifts balance out, resulting in no significant net change to harvest timing ({base_remaining} days remaining)."
            rec = "Current agronomic practices remain consistent with regional production benchmarks."

        return WhatIfResponse(
            plant_id=plant.id,
            current_estimated_harvest_days=base_remaining,
            simulated_estimated_harvest_days=simulated_remaining,
            harvest_shift_days=actual_shift,
            impact_summary=summary,
            daily_gdd_change=daily_gdd_change,
            physiological_consequences=consequences,
            agronomic_recommendation=rec,
            disclaimer="Biophysical model simulation based on Growing Degree Day (GDD) thermodynamics and crop coefficients. Actual biological development is subject to unexpected field weather events, soil pathogen dynamics, and cultivar-specific genetics."
        )

    @classmethod
    def get_next_observation_advice(cls, db: Session, plant_id: str) -> NextBestObservationData:
        from app.services.plant_analysis_service import PlantAnalysisService
        analyses = PlantAnalysisService.get_plant_analyses(db, plant_id, limit=1)
        if analyses:
            return analyses[0].next_best_observation
        
        # Default advice
        today = date.today()
        d1 = today + timedelta(days=3)
        d2 = d1 + timedelta(days=2)
        return NextBestObservationData(
            recommended_date_range=f"{d1.strftime('%b %d')} - {d2.strftime('%b %d, %Y')}",
            recommended_focus_area="Upper canopy terminal shoots and floral nodes",
            priority_developmental_transition="Upcoming Phenological Transition",
            action_guidance="Capture a high-resolution, unshaded photograph of the upper leaf nodes in natural daylight to initialize continuous Growth Intelligence tracking."
        )
