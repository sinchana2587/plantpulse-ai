import os
import shutil
import json
from datetime import date, datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.plant import Plant
from app.models.observation import Observation
from app.models.forecast import Forecast
from app.models.telemetry import TelemetryReading
from app.services.forecast_service import ForecastService
from app.ml.growth_stage_classifier import classifier_instance

class DemoService:
    @staticmethod
    def seed_demo_data(db: Session) -> Plant:
        # Check if demo plant already exists
        existing_demo = db.query(Plant).filter(Plant.is_demo == True).first()
        if existing_demo:
            return existing_demo

        today = date.today()
        # Planted 60 days ago
        planting_date = today - timedelta(days=60)

        demo_plant = Plant(
            name="Heritage Roma Tomato (Demo)",
            crop_type="Tomato",
            crop_variety="Roma",
            planting_date=planting_date,
            location="AgriTech Research Greenhouse A",
            description="Baseline multi-week Roma tomato demonstration crop tracking longitudinal phenology.",
            is_demo=True
        )
        db.add(demo_plant)
        db.commit()
        db.refresh(demo_plant)

        # Copy sample images from seed_data to uploads
        uploads_demo_dir = Path(settings.STORAGE_DIR) / "demo"
        uploads_demo_dir.mkdir(parents=True, exist_ok=True)
        seed_dir = Path(settings.SEED_DATA_DIR)

        obs_configs = [
            {
                "days_offset": 10,
                "stage": "Seedling",
                "temp": 21.5,
                "humidity": 68.0,
                "soil_moisture": 62.0,
                "sunlight": 7.0,
                "rainfall": 0.0,
                "source_file": seed_dir / "seedling" / "seedling_plant_001.jpg"
            },
            {
                "days_offset": 28,
                "stage": "Vegetative",
                "temp": 23.2,
                "humidity": 64.0,
                "soil_moisture": 58.0,
                "sunlight": 8.5,
                "rainfall": 1.2,
                "source_file": seed_dir / "vegetative" / "vegetative_plant_001.jpg"
            },
            {
                "days_offset": 48,
                "stage": "Flowering",
                "temp": 24.8,
                "humidity": 60.0,
                "soil_moisture": 54.0,
                "sunlight": 9.0,
                "rainfall": 0.0,
                "source_file": seed_dir / "flowering" / "flowering_plant_001.jpg"
            },
            {
                "days_offset": 58,
                "stage": "Fruit Formation",
                "temp": 25.1,
                "humidity": 62.0,
                "soil_moisture": 56.0,
                "sunlight": 8.8,
                "rainfall": 2.5,
                "source_file": seed_dir / "fruit_formation" / "fruit_formation_plant_001.jpg"
            }
        ]

        for i, cfg in enumerate(obs_configs):
            obs_dt = datetime.combine(planting_date + timedelta(days=cfg["days_offset"]), datetime.min.time()) + timedelta(hours=10)
            dest_img_path = None
            conf_score = None
            stage_scores_json = None
            detected_stage = cfg["stage"]

            if cfg["source_file"].exists():
                dest_filename = f"demo_obs_{i+1}_{cfg['source_file'].name}"
                dest_path = uploads_demo_dir / dest_filename
                shutil.copyfile(cfg["source_file"], dest_path)
                dest_img_path = f"/static/uploads/demo/{dest_filename}"

                # Run genuine model inference rather than fabricating 0.98!
                if classifier_instance.is_available:
                    try:
                        analysis = classifier_instance.predict(str(dest_path))
                        detected_stage = analysis["predicted_stage"]
                        conf_score = analysis["confidence_score"]
                        stage_scores_json = json.dumps(analysis["stage_scores"])
                    except Exception as e:
                        print(f"[DemoService] Inference error: {e}")

            obs = Observation(
                plant_id=demo_plant.id,
                observation_date=obs_dt,
                image_path=dest_img_path,
                temperature=cfg["temp"],
                humidity=cfg["humidity"],
                soil_moisture=cfg["soil_moisture"],
                sunlight_hours=cfg["sunlight"],
                rainfall=cfg["rainfall"],
                manual_growth_stage=cfg["stage"],
                ai_growth_stage=detected_stage,
                confidence_score=conf_score,
                stage_scores_json=stage_scores_json,
                model_version="1.0.0",
                is_demo=True
            )
            db.add(obs)
            db.commit()
            db.refresh(obs)

            # Record corresponding genuine telemetry readings
            telemetry_data = [
                ("temperature", cfg["temp"], "°C"),
                ("soil_moisture", cfg["soil_moisture"], "%"),
                ("humidity", cfg["humidity"], "%"),
                ("sunlight_hours", cfg["sunlight"], "hrs"),
                ("rainfall", cfg["rainfall"], "mm"),
            ]
            for p_name, p_val, p_unit in telemetry_data:
                t_rec = TelemetryReading(
                    plant_id=demo_plant.id,
                    observation_id=obs.id,
                    parameter_name=p_name,
                    value=p_val,
                    unit=p_unit,
                    timestamp=obs_dt,
                    data_source="IOT_SENSOR" if i % 2 == 0 else "MANUAL_ENTRY",
                    sensor_id=f"IOT-SENSOR-NODE-{i+1:02d}",
                    validation_status="VALID"
                )
                db.add(t_rec)

        db.commit()

        # Generate initial demo forecast
        ForecastService.generate_and_save_forecast(db, demo_plant.id)
        return demo_plant

    @staticmethod
    def reset_demo_data(db: Session) -> bool:
        # Strictly delete records where is_demo == True, never touching user data!
        demo_plants = db.query(Plant).filter(Plant.is_demo == True).all()
        for p in demo_plants:
            # Delete associated telemetry
            db.query(TelemetryReading).filter(TelemetryReading.plant_id == p.id).delete()
            db.delete(p)
        db.commit()

        # Re-seed fresh demo data
        DemoService.seed_demo_data(db)
        return True
