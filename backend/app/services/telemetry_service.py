from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.plant import Plant
from app.models.telemetry import TelemetryReading
from app.schemas.telemetry import (
    TelemetryReadingCreate,
    TelemetryReadingResponse,
    TelemetrySummaryResponse,
    ParameterStat
)

VALID_RANGES = {
    "temperature": (-30.0, 65.0, "°C"),
    "soil_moisture": (0.0, 100.0, "%"),
    "humidity": (0.0, 100.0, "%"),
    "sunlight_hours": (0.0, 24.0, "hrs"),
    "rainfall": (0.0, 500.0, "mm"),
}

class TelemetryService:
    @staticmethod
    def validate_and_record(
        db: Session,
        reading_in: TelemetryReadingCreate,
        plant_id: str,
        observation_id: Optional[str] = None
    ) -> TelemetryReading:
        param = reading_in.parameter_name.lower().strip()
        val = reading_in.value
        
        # Check boundary validity
        min_v, max_v, std_unit = VALID_RANGES.get(param, (-9999.0, 9999.0, reading_in.unit))
        status = "VALID"
        if val < min_v or val > max_v:
            status = "REJECTED"

        reading = TelemetryReading(
            plant_id=plant_id,
            observation_id=observation_id,
            parameter_name=param,
            value=val,
            unit=std_unit,
            timestamp=reading_in.timestamp or datetime.utcnow(),
            data_source=reading_in.data_source or "MANUAL_ENTRY",
            sensor_id=reading_in.sensor_id,
            validation_status=status
        )
        db.add(reading)
        db.commit()
        db.refresh(reading)
        return reading

    @staticmethod
    def get_summary(
        db: Session,
        range_key: str = "all",
        plant_id: Optional[str] = None,
        crop_type: Optional[str] = None,
        data_source: Optional[str] = None,
        include_demo: bool = True
    ) -> TelemetrySummaryResponse:
        now = datetime.utcnow()
        cutoff_date = None

        if range_key == "24h":
            cutoff_date = now - timedelta(hours=24)
        elif range_key == "7d":
            cutoff_date = now - timedelta(days=7)
        elif range_key == "30d":
            cutoff_date = now - timedelta(days=30)
        elif range_key == "90d":
            cutoff_date = now - timedelta(days=90)

        query = db.query(TelemetryReading).filter(TelemetryReading.validation_status == "VALID")
        if cutoff_date:
            query = query.filter(TelemetryReading.timestamp >= cutoff_date)
        if plant_id:
            query = query.filter(TelemetryReading.plant_id == plant_id)
        if crop_type and crop_type.lower() != "all":
            query = query.join(Plant).filter(Plant.crop_type.ilike(crop_type))
        elif not include_demo:
            query = query.join(Plant).filter(Plant.is_demo == False)
        if data_source and data_source.lower() not in ["all", ""]:
            query = query.filter(TelemetryReading.data_source == data_source.upper().strip())

        all_readings = query.all()
        total_count = len(all_readings)

        # Source breakdown
        sources = {"IOT_SENSOR": 0, "MANUAL_ENTRY": 0, "EXTERNAL_IMPORT": 0}
        grouped_by_param: Dict[str, List[TelemetryReading]] = {
            "temperature": [],
            "soil_moisture": [],
            "humidity": [],
            "sunlight_hours": [],
            "rainfall": []
        }

        for r in all_readings:
            sources[r.data_source] = sources.get(r.data_source, 0) + 1
            if r.parameter_name in grouped_by_param:
                grouped_by_param[r.parameter_name].append(r)

        param_stats: Dict[str, ParameterStat] = {}
        for p_name, (min_v, max_v, unit_label) in VALID_RANGES.items():
            records = grouped_by_param.get(p_name, [])
            if records:
                vals = [r.value for r in records]
                plant_ids = {r.plant_id for r in records}
                plant_vals: Dict[str, List[float]] = {}
                p_sources: Dict[str, int] = {}
                for r in records:
                    plant_vals.setdefault(r.plant_id, []).append(r.value)
                    p_sources[r.data_source] = p_sources.get(r.data_source, 0) + 1

                per_plant_avgs = {
                    pid: round(float(sum(v_list) / len(v_list)), 1)
                    for pid, v_list in plant_vals.items()
                }
                sorted_records = sorted(records, key=lambda x: x.timestamp)
                param_stats[p_name] = ParameterStat(
                    parameter_name=p_name,
                    unit=unit_label,
                    mean=round(float(sum(vals) / len(vals)), 1),
                    min=round(float(min(vals)), 1),
                    max=round(float(max(vals)), 1),
                    readings_count=len(vals),
                    plants_count=len(plant_ids),
                    formula=f"Mean = Sum of {len(vals)} valid {p_name} readings / {len(vals)}",
                    per_plant_averages=per_plant_avgs,
                    source_breakdown=p_sources,
                    latest_reading=sorted_records[-1].value,
                    latest_timestamp=sorted_records[-1].timestamp
                )
            else:
                param_stats[p_name] = ParameterStat(
                    parameter_name=p_name,
                    unit=unit_label,
                    mean=None,
                    min=None,
                    max=None,
                    readings_count=0,
                    plants_count=0,
                    formula=f"Mean = Sum of valid {p_name} readings / Count",
                    per_plant_averages={},
                    source_breakdown={},
                    latest_reading=None,
                    latest_timestamp=None
                )

        temp_stat = param_stats["temperature"]
        soil_stat = param_stats["soil_moisture"]
        humid_stat = param_stats["humidity"]
        sun_stat = param_stats["sunlight_hours"]
        rain_stat = param_stats["rainfall"]

        # Rainfall is cumulative total over period
        rain_total = None
        if rain_stat.readings_count > 0:
            rain_vals = [r.value for r in grouped_by_param["rainfall"]]
            rain_total = round(float(sum(rain_vals)), 1)

        is_avail = total_count > 0
        date_label_map = {
            "24h": "Last 24 Hours",
            "7d": "Last 7 Days",
            "30d": "Last 30 Days",
            "90d": "Last 90 Days",
            "all": "All Recorded Telemetry"
        }

        return TelemetrySummaryResponse(
            date_range_label=date_label_map.get(range_key, f"Timeframe: {range_key}"),
            total_readings_count=total_count,
            source_breakdown=sources,
            parameters=param_stats,
            average_temperature=temp_stat.mean,
            average_soil_moisture=soil_stat.mean,
            average_humidity=humid_stat.mean,
            average_sunlight_hours=sun_stat.mean,
            total_rainfall=rain_total,
            is_data_available=is_avail,
            calculation_timestamp=now,
            calculation_methodology="Measurement-level arithmetic mean of validated sensor records & manual entries",
            demonstration_mode=include_demo
        )

    @staticmethod
    def get_readings(
        db: Session,
        parameter: Optional[str] = None,
        range_key: str = "all",
        plant_id: Optional[str] = None,
        crop_type: Optional[str] = None,
        data_source: Optional[str] = None,
        limit: int = 200,
        include_demo: bool = True
    ) -> List[TelemetryReadingResponse]:
        now = datetime.utcnow()
        cutoff_date = None

        if range_key == "24h":
            cutoff_date = now - timedelta(hours=24)
        elif range_key == "7d":
            cutoff_date = now - timedelta(days=7)
        elif range_key == "30d":
            cutoff_date = now - timedelta(days=30)
        elif range_key == "90d":
            cutoff_date = now - timedelta(days=90)

        # Normalize parameter name alias
        clean_param = (parameter or "").lower().strip()
        if clean_param in ["daily_sunlight", "sunlight"]:
            clean_param = "sunlight_hours"

        query = db.query(TelemetryReading).outerjoin(Plant).filter(TelemetryReading.validation_status == "VALID")
        if clean_param:
            query = query.filter(TelemetryReading.parameter_name == clean_param)
        if cutoff_date:
            query = query.filter(TelemetryReading.timestamp >= cutoff_date)
        if plant_id:
            query = query.filter(TelemetryReading.plant_id == plant_id)
        if crop_type and crop_type.lower() != "all":
            query = query.filter(Plant.crop_type.ilike(crop_type))
        elif not include_demo:
            query = query.filter(Plant.is_demo == False)
        if data_source and data_source.lower() not in ["all", ""]:
            query = query.filter(TelemetryReading.data_source == data_source.upper().strip())

        readings = query.order_by(TelemetryReading.timestamp.desc()).limit(limit).all()

        return [
            TelemetryReadingResponse(
                id=r.id,
                plant_id=r.plant_id,
                plant_name=r.plant.name if r.plant else None,
                crop_type=r.plant.crop_type if r.plant else None,
                observation_id=r.observation_id,
                parameter_name=r.parameter_name,
                value=r.value,
                unit=r.unit,
                timestamp=r.timestamp,
                data_source=r.data_source,
                sensor_id=r.sensor_id,
                validation_status=r.validation_status
            )
            for r in readings
        ]
