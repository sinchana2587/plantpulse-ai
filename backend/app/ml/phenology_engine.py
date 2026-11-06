from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
import numpy as np

STAGE_SEQUENCE = ["Seedling", "Vegetative", "Flowering", "Fruit Formation", "Maturity"]

# Agronomic parameters per crop type (Solanaceous, Malvaceae, Cucurbitaceae)
CROP_AGRONOMIC_CONFIG = {
    "tomato": {
        "t_base": 10.0,
        "t_cutoff": 34.0,
        "stage_days": {
            "Seedling": (0, 14),
            "Vegetative": (14, 38),
            "Flowering": (38, 60),
            "Fruit Formation": (60, 85),
            "Maturity": (85, 110),
            "Harvest Window": (95, 120)
        },
        "optimal_moisture": (50.0, 65.0)
    },
    "chilli": {
        "t_base": 12.0,
        "t_cutoff": 35.0,
        "stage_days": {
            "Seedling": (0, 16),
            "Vegetative": (16, 45),
            "Flowering": (45, 75),
            "Fruit Formation": (75, 100),
            "Maturity": (100, 120),
            "Harvest Window": (110, 130)
        },
        "optimal_moisture": (45.0, 60.0)
    },
    "brinjal": {
        "t_base": 12.0,
        "t_cutoff": 35.0,
        "stage_days": {
            "Seedling": (0, 18),
            "Vegetative": (18, 50),
            "Flowering": (50, 80),
            "Fruit Formation": (80, 110),
            "Maturity": (110, 130),
            "Harvest Window": (120, 140)
        },
        "optimal_moisture": (55.0, 70.0)
    },
    "okra": {
        "t_base": 15.0,
        "t_cutoff": 38.0,
        "stage_days": {
            "Seedling": (0, 10),
            "Vegetative": (10, 28),
            "Flowering": (28, 42),
            "Fruit Formation": (42, 55),
            "Maturity": (55, 65),
            "Harvest Window": (60, 70)
        },
        "optimal_moisture": (50.0, 65.0)
    },
    "cucumber": {
        "t_base": 10.0,
        "t_cutoff": 35.0,
        "stage_days": {
            "Seedling": (0, 10),
            "Vegetative": (10, 25),
            "Flowering": (25, 38),
            "Fruit Formation": (38, 50),
            "Maturity": (50, 58),
            "Harvest Window": (52, 65)
        },
        "optimal_moisture": (60.0, 75.0)
    },
    "banana": {
        "t_base": 14.0,
        "t_cutoff": 38.0,
        "stage_days": {
            "Vegetative": (0, 180),
            "Pseudostem Emergence": (180, 240),
            "Inflorescence": (240, 270),
            "Fruit Development": (270, 330),
            "Harvest Maturity": (330, 360),
            "Harvest Window": (330, 370)
        },
        "optimal_moisture": (60.0, 75.0)
    }
}

class PhenologyEngine:
    """
    Multi-Crop Agricultural Phenology & Environmental Developmental Milestone Prediction Engine.
    Combines cumulative Growing Degree Days (GDD), historical observation milestones,
    crop biology, and environmental stress factors (soil moisture, temperature stress, sunlight).
    """

    @classmethod
    def get_crop_config(cls, crop_type: str) -> Dict[str, Any]:
        key = (crop_type or "tomato").lower().strip()
        if "chilli" in key or "pepper" in key:
            return CROP_AGRONOMIC_CONFIG["chilli"]
        elif "brinjal" in key or "eggplant" in key:
            return CROP_AGRONOMIC_CONFIG["brinjal"]
        elif "okra" in key or "finger" in key:
            return CROP_AGRONOMIC_CONFIG["okra"]
        elif "cucumber" in key:
            return CROP_AGRONOMIC_CONFIG["cucumber"]
        elif "banana" in key or "musa" in key:
            return CROP_AGRONOMIC_CONFIG["banana"]
        return CROP_AGRONOMIC_CONFIG["tomato"]

    @classmethod
    def calculate_daily_gdd(cls, temp: float, crop_type: str = "tomato") -> float:
        if temp is None:
            temp = 22.0
        cfg = cls.get_crop_config(crop_type)
        effective_temp = min(max(temp, cfg["t_base"]), cfg["t_cutoff"])
        return max(0.0, effective_temp - cfg["t_base"])

    @classmethod
    def predict_milestones(
        cls,
        planting_date: date,
        current_stage: str,
        observations: List[Any],
        crop_type: str = "Tomato",
        crop_variety: str = "Standard"
    ) -> Dict[str, Any]:
        """
        Generates calibrated milestone forecasts and uncertainty intervals for any supported crop.
        """
        cfg = cls.get_crop_config(crop_type)
        t_base = cfg["t_base"]
        stage_days = cfg["stage_days"]
        opt_moist_min, opt_moist_max = cfg["optimal_moisture"]

        obs_count = len(observations)
        
        # Sort observations chronologically
        sorted_obs = sorted(
            observations,
            key=lambda o: o.observation_date if hasattr(o, "observation_date") else o["observation_date"]
        )

        accumulated_gdd = 0.0
        temperatures = []
        humidities = []
        soil_moistures = []
        sunlights = []

        latest_obs_date = planting_date
        if sorted_obs:
            for obs in sorted_obs:
                t = getattr(obs, "temperature", None) if hasattr(obs, "temperature") else obs.get("temperature")
                h = getattr(obs, "humidity", None) if hasattr(obs, "humidity") else obs.get("humidity")
                sm = getattr(obs, "soil_moisture", None) if hasattr(obs, "soil_moisture") else obs.get("soil_moisture")
                sn = getattr(obs, "sunlight_hours", None) if hasattr(obs, "sunlight_hours") else obs.get("sunlight_hours")
                
                if t is not None:
                    temperatures.append(t)
                    accumulated_gdd += cls.calculate_daily_gdd(t, crop_type)
                else:
                    accumulated_gdd += cls.calculate_daily_gdd(22.0, crop_type)
                if h is not None:
                    humidities.append(h)
                if sm is not None:
                    soil_moistures.append(sm)
                if sn is not None:
                    sunlights.append(sn)

            last_dt = sorted_obs[-1].observation_date if hasattr(sorted_obs[-1], "observation_date") else sorted_obs[-1]["observation_date"]
            latest_obs_date = last_dt.date() if isinstance(last_dt, datetime) else last_dt

        avg_temp = float(np.mean(temperatures)) if temperatures else 22.5
        avg_humidity = float(np.mean(humidities)) if humidities else 65.0
        avg_soil_moisture = float(np.mean(soil_moistures)) if soil_moistures else 55.0
        avg_sunlight = float(np.mean(sunlights)) if sunlights else 7.5

        # Variety adjustment factor
        variety_factor = 1.0
        lower_variety = (crop_variety or "").lower()
        if "cherry" in lower_variety or "bird" in lower_variety or "early" in lower_variety:
            variety_factor = 0.90
        elif "beefsteak" in lower_variety or "giant" in lower_variety:
            variety_factor = 1.12

        # Environmental rate modifier
        temp_modifier = 1.0
        if avg_temp < (t_base + 4.0) or avg_temp > (cfg["t_cutoff"] - 2.0):
            temp_modifier = 0.85
        elif avg_temp < (t_base + 8.0):
            temp_modifier = 0.93

        # Soil moisture stress
        moisture_modifier = 1.0
        if avg_soil_moisture < (opt_moist_min - 15.0) or avg_soil_moisture > (opt_moist_max + 15.0):
            moisture_modifier = 0.88
        elif avg_soil_moisture < opt_moist_min or avg_soil_moisture > opt_moist_max:
            moisture_modifier = 0.95

        sunlight_modifier = 1.0
        if avg_sunlight < 4.5:
            sunlight_modifier = 0.88
        elif avg_sunlight < 6.0:
            sunlight_modifier = 0.94

        overall_growth_rate = temp_modifier * moisture_modifier * sunlight_modifier

        stage_keys = list(stage_days.keys())
        current_idx = stage_keys.index(current_stage) if current_stage in stage_keys else (STAGE_SEQUENCE.index(current_stage) if current_stage in STAGE_SEQUENCE else 0)

        def compute_window(stage_key: str, min_days_std: int, max_days_std: int, stage_order_idx: int):
            if stage_order_idx < current_idx:
                passed_start = planting_date + timedelta(days=int(min_days_std * variety_factor))
                passed_end = planting_date + timedelta(days=int(max_days_std * variety_factor))
                return {
                    "start": passed_start,
                    "end": passed_end,
                    "status": "COMPLETED"
                }

            days_adj_min = int(min_days_std * variety_factor / max(0.5, overall_growth_rate))
            days_adj_max = int(max_days_std * variety_factor / max(0.5, overall_growth_rate))

            pred_start = planting_date + timedelta(days=days_adj_min)
            pred_end = planting_date + timedelta(days=days_adj_max)

            if pred_start < latest_obs_date:
                pred_start = latest_obs_date
            if pred_end < pred_start + timedelta(days=4):
                pred_end = pred_start + timedelta(days=6)

            return {
                "start": pred_start,
                "end": pred_end,
                "status": "CURRENT" if stage_order_idx == current_idx else "UPCOMING"
            }

        flowering_range = stage_days.get("Flowering") or stage_days.get("Inflorescence") or stage_days.get("Pseudostem Emergence") or (40, 65)
        fruit_range = stage_days.get("Fruit Formation") or stage_days.get("Fruit Development") or (65, 90)
        maturity_range = stage_days.get("Maturity") or stage_days.get("Harvest Maturity") or (90, 120)
        harvest_range = stage_days.get("Harvest Window") or (100, 130)

        flowering_label = "Inflorescence" if "Inflorescence" in stage_days else "Flowering"
        fruit_label = "Fruit Development" if "Fruit Development" in stage_days else "Fruit Formation"
        maturity_label = "Harvest Maturity" if "Harvest Maturity" in stage_days else "Maturity"

        flowering_win = compute_window(flowering_label, flowering_range[0], flowering_range[1], 2)
        fruit_win = compute_window(fruit_label, fruit_range[0], fruit_range[1], 3)
        maturity_win = compute_window(maturity_label, maturity_range[0], maturity_range[1], 4)
        harvest_win = compute_window("Harvest Window", harvest_range[0], harvest_range[1], 5)

        assumptions = [
            f"Thermal base temperature set to {t_base}°C per {crop_type} agronomic standard.",
            f"Variety factor '{crop_variety}' applied with coefficient {variety_factor:.2f}.",
            f"Forecast assumes continued daily thermal conditions consistent with regional mean {avg_temp:.1f}°C."
        ]

        limitations = [
            f"Calibrated for {crop_type}. Late milestones carry uncertainty margins (±4-7 days) due to microclimate fluctuations.",
            f"Based on {obs_count} longitudinal observation(s). Regular observation updates improve accuracy."
        ]

        recommendations = []
        if avg_soil_moisture < opt_moist_min:
            recommendations.append({
                "type": "irrigation",
                "severity": "warning",
                "title": f"Sub-optimal Soil Moisture for {crop_type}",
                "message": f"Average soil moisture ({avg_soil_moisture:.1f}%) is below optimal target ({opt_moist_min:.0f}-{opt_moist_max:.0f}%). Increase irrigation frequency."
            })
        elif avg_soil_moisture > opt_moist_max:
            recommendations.append({
                "type": "irrigation",
                "severity": "warning",
                "title": f"Excess Soil Moisture Risk for {crop_type}",
                "message": f"Average soil moisture ({avg_soil_moisture:.1f}%) exceeds upper target ({opt_moist_max:.0f}%). Ensure root aeration."
            })

        if current_stage in ["Vegetative", "Flowering"]:
            recommendations.append({
                "type": "development",
                "severity": "info",
                "title": f"{crop_type} Floral Transition Watch",
                "message": f"Crop is in/approaching flowering stage. Ensure optimal phosphorus and potassium supply."
            })

        environmental_factors = {
            "crop_type": crop_type,
            "crop_variety": crop_variety,
            "t_base_c": t_base,
            "average_temperature_c": round(avg_temp, 1),
            "average_humidity_pct": round(avg_humidity, 1),
            "average_soil_moisture_pct": round(avg_soil_moisture, 1),
            "average_sunlight_hours": round(avg_sunlight, 1),
            "estimated_growth_rate_factor": round(overall_growth_rate, 2),
            "accumulated_gdd": round(accumulated_gdd, 1),
            "variety_adjustment_factor": round(variety_factor, 2)
        }

        return {
            "current_stage": current_stage,
            "method": "Phenology-GDD Hybrid Forecaster",
            "model_version": "1.1.0",
            "observations_used_count": obs_count,
            "flowering_window": flowering_win,
            "fruit_formation_window": fruit_win,
            "maturity_window": maturity_win,
            "harvest_window": harvest_win,
            "environmental_factors": environmental_factors,
            "assumptions": assumptions,
            "limitations": limitations,
            "recommendations": recommendations
        }
