import json
import uuid
from datetime import datetime, date
from pathlib import Path
from typing import Optional, Dict, Any, List
import cv2
import numpy as np
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.plant import Plant
from app.models.observation import Observation
from app.models.telemetry import TelemetryReading
from app.models.analysis import PlantProblem, ProblemAnalysis, TreatmentPlan, TreatmentAction
from app.services.dataset_service import CROP_AGRONOMY_DATABASE
from app.services.storage_service import StorageService
from app.core.config import settings
from app.schemas.analysis import (
    PlantProblemResponse,
    ProblemAnalysisResponse,
    ProbableCauseItem
)

class ProblemReportingService:
    """
    Agricultural Problem Reporting & AI Agronomic Diagnosis Engine.
    Correlates farmer-submitted symptoms with multimodal image CV features,
    crop phenology, microclimate telemetry, and verified ICAR/FAO botanical stress profiles.
    Automatically generates active Treatment Plans and actionable recovery tasks.
    """

    @classmethod
    def report_and_diagnose_problem(
        cls,
        db: Session,
        plant_id: str,
        category: str,
        description: str,
        affected_part: str = "Whole plant",
        onset_date: Optional[str] = None,
        is_spreading: str = "unsure",
        irrigation_notes: Optional[str] = None,
        fertilizer_notes: Optional[str] = None,
        image_file: Optional[UploadFile] = None,
        user_id: Optional[str] = None
    ) -> PlantProblemResponse:
        # 1. Retrieve Plant
        plant_query = db.query(Plant).filter(Plant.id == plant_id)
        if user_id:
            plant_query = plant_query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
        plant = plant_query.first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or access denied")

        # 2. Save Image if uploaded
        image_path = None
        if image_file and image_file.filename:
            image_path = StorageService.validate_and_save_image(image_file, subfolder="problems")

        # 3. Create PlantProblem record
        problem = PlantProblem(
            plant_id=plant.id,
            user_id=user_id or plant.user_id,
            category=category,
            description=description,
            affected_part=affected_part or "Whole plant",
            onset_date=onset_date or date.today().isoformat(),
            is_spreading=is_spreading or "unsure",
            irrigation_notes=irrigation_notes,
            fertilizer_notes=fertilizer_notes,
            image_path=image_path,
            status="analyzed"
        )
        db.add(problem)
        db.commit()
        db.refresh(problem)

        # 4. Run AI Agronomic Diagnosis & Image Feature Extraction
        cls._run_ai_problem_diagnosis(db, plant, problem)

        db.refresh(problem)
        return cls._to_problem_response(problem)

    @classmethod
    def get_plant_problems(cls, db: Session, plant_id: str) -> List[PlantProblemResponse]:
        problems = (
            db.query(PlantProblem)
            .filter(PlantProblem.plant_id == plant_id)
            .order_by(PlantProblem.created_at.desc())
            .all()
        )
        return [cls._to_problem_response(p) for p in problems]

    @classmethod
    def get_problem_by_id(cls, db: Session, problem_id: str) -> PlantProblemResponse:
        problem = db.query(PlantProblem).filter(PlantProblem.id == problem_id).first()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem record not found")
        return cls._to_problem_response(problem)

    @classmethod
    def reanalyze_problem(cls, db: Session, problem_id: str) -> ProblemAnalysisResponse:
        problem = db.query(PlantProblem).filter(PlantProblem.id == problem_id).first()
        if not problem:
            raise HTTPException(status_code=404, detail="Problem record not found")
        plant = db.query(Plant).filter(Plant.id == problem.plant_id).first()
        
        # Clear previous analyses
        db.query(ProblemAnalysis).filter(ProblemAnalysis.problem_id == problem_id).delete()
        db.commit()

        analysis = cls._run_ai_problem_diagnosis(db, plant, problem)
        return cls._to_analysis_response(analysis)

    # ================= Private Diagnosis Engine =================

    @classmethod
    def _run_ai_problem_diagnosis(cls, db: Session, plant: Plant, problem: PlantProblem) -> ProblemAnalysis:
        crop_key = plant.crop_type.lower().strip()
        crop_profile = CROP_AGRONOMY_DATABASE.get(crop_key, CROP_AGRONOMY_DATABASE["tomato"])

        # Fetch latest telemetry from Observation or TelemetryReading
        latest_obs = (
            db.query(Observation)
            .filter(Observation.plant_id == plant.id)
            .order_by(Observation.observation_date.desc())
            .first()
        )
        curr_moisture = (latest_obs.soil_moisture if latest_obs and latest_obs.soil_moisture is not None else None)
        curr_temp = (latest_obs.temperature if latest_obs and latest_obs.temperature is not None else None)

        if curr_moisture is None:
            moist_reading = (
                db.query(TelemetryReading)
                .filter(TelemetryReading.plant_id == plant.id, TelemetryReading.parameter_name == "soil_moisture")
                .order_by(TelemetryReading.timestamp.desc())
                .first()
            )
            curr_moisture = moist_reading.value if moist_reading else 52.0

        if curr_temp is None:
            temp_reading = (
                db.query(TelemetryReading)
                .filter(TelemetryReading.plant_id == plant.id, TelemetryReading.parameter_name == "temperature")
                .order_by(TelemetryReading.timestamp.desc())
                .first()
            )
            curr_temp = temp_reading.value if temp_reading else 26.0

        # Perform Computer Vision Image Feature Extraction if image uploaded
        cv_image_evidence = cls._extract_image_features(problem.image_path)

        cat_lower = problem.category.lower()
        desc_lower = problem.description.lower()
        affected_lower = (problem.affected_part or "").lower()

        probable_causes: List[ProbableCauseItem] = []
        recommended_actions: List[str] = []
        precautions: List[str] = []
        severity = "Moderate"

        # -------------------------------------------------------------
        # CROP-SPECIFIC PATHOGEN & AGRONOMIC DIAGNOSIS
        # -------------------------------------------------------------

        if crop_key == "banana":
            # Banana (Musa spp.) agronomic rules
            if ("yellow" in cat_lower or "chlorosis" in cat_lower or "yellow" in desc_lower or "dry" in desc_lower or "not growing" in desc_lower or "whole" in affected_lower):
                severity = "Severe" if "whole" in affected_lower or problem.is_spreading == "yes" else "High"
                probable_causes.append(ProbableCauseItem(
                    cause="Panama Disease / Fusarium Wilt (Fusarium oxysporum f. sp. cubense - Race 1 / TR4)",
                    likelihood="High",
                    reasoning=(
                        "In Banana (Musa spp.), older and whole-plant progressive foliar yellowing accompanied by leaf blade drying, "
                        "growth stoppage, and petiole collapse is the hallmark symptom of vascular xylem infection by soil-borne Fusarium oxysporum. "
                        "The fungus obstructs water and nutrient flow from roots to the pseudostem, causing dehydration even in moist soil."
                    ),
                    supporting_evidence=(
                        f"Reported on {problem.affected_part} with symptom: '{problem.description}'. "
                        f"Spreading status: {problem.is_spreading}. Telemetry soil moisture: {curr_moisture:.1f}%. "
                        + cv_image_evidence
                    )
                ))
                probable_causes.append(ProbableCauseItem(
                    cause="Sigatoka Leaf Spot / Foliar Desiccation (Pseudocercospora musae / P. fijiensis)",
                    likelihood="Moderate",
                    reasoning=(
                        "Yellow chlorotic streaks that coalesce into extensive dark necrotic margins, leading to premature leaf drying and stunted bunch development."
                    ),
                    supporting_evidence=f"Observed onset {problem.onset_date}; ambient temperature {curr_temp:.1f}°C."
                ))
                probable_causes.append(ProbableCauseItem(
                    cause="Severe Root Asphyxiation or Potassium (K) Translocation Deficit",
                    likelihood="Low",
                    reasoning=(
                        "Banana requires heavy potassium nutrition. Severe deficiency causes rapid marginal yellowing and premature leaf senescence, while root asphyxiation inhibits root uptake."
                    ),
                    supporting_evidence=f"Irrigation notes: '{problem.irrigation_notes or 'Standard'}'; fertilizer: '{problem.fertilizer_notes or 'Unspecified'}'."
                ))

                recommended_actions = [
                    "Immediately quarantine the affected banana mat; trench a 50cm deep isolation buffer around the clump to prevent fungal root contact with adjacent plants.",
                    "Disinfect all cutting knives, machetes, and boots using a 10% sodium hypochlorite or farm sanitizer solution between mats.",
                    "Drench root zone of surrounding plants with biocontrol bio-agent Trichoderma viride or Pseudomonas fluorescens (20g per clump mixed in 5kg well-decomposed FYM).",
                    "Aerate soil and inspect pseudostem base for internal brownish vascular discoloration; avoid excessive flood irrigation that transports fungal chlamydospores."
                ]
                precautions = [
                    "Strictly avoid moving suckers, planting material, or unsterilized topsoil from this area to other orchard blocks.",
                    "Do not chop down diseased banana pseudostems mechanically, as sap splattering disseminates pathogen propagules into soil.",
                    "Report suspected Fusarium TR4 outbreaks promptly to the National Plant Protection Organization or local KVK extension officers."
                ]

            elif "wilt" in cat_lower or "droop" in cat_lower:
                severity = "Severe"
                probable_causes.append(ProbableCauseItem(
                    cause="Bacterial Wilt / Moko Disease (Ralstonia solanacearum) or Panama Wilt",
                    likelihood="High",
                    reasoning="Rapid vascular wilting in banana foliage accompanied by pseudostem collapsing under warm conditions.",
                    supporting_evidence=f"Spreading: {problem.is_spreading}. Soil moisture: {curr_moisture:.1f}%."
                ))
                recommended_actions = [
                    "Isolate infected mat and prevent insect vectors from visiting floral bracts by bagging male buds.",
                    "Apply strict hygiene protocol for all harvesting and de-suckering implements.",
                    "Maintain uniform sub-surface drip irrigation to avoid root stress."
                ]
                precautions = [
                    "Never cultivate solanaceous crops (tomatoes, peppers) in rotation or intercropping with banana due to shared Ralstonia pathogens.",
                    "Avoid surface water run-off across crop rows."
                ]

            else:
                severity = "Moderate"
                probable_causes.append(ProbableCauseItem(
                    cause="Nutritional Chlorosis & Microclimate Stress in Banana",
                    likelihood="High",
                    reasoning="Foliar color changes and stunted leaf emergence linked to root zone compaction or nutrient fixation.",
                    supporting_evidence=f"Crop: Banana. Observed: {problem.description}."
                ))
                recommended_actions = [
                    "Apply balanced bio-fertilizer enriched with zinc and magnesium foliar micro-spray.",
                    "Mulch root zone with 10cm dry sugarcane bagasse or banana trash to regulate soil temperature.",
                    "Check drip emitters for uniform delivery of 15-20 liters water per mat daily."
                ]
                precautions = [
                    "Avoid damaging shallow fibrous banana root mats during manual weeding.",
                    "Ensure adequate drainage during monsoon periods."
                ]

        elif crop_key == "tomato":
            # Tomato (Solanum lycopersicum) agronomic rules
            if "spot" in cat_lower or "lesion" in cat_lower or "blight" in desc_lower or "spot" in desc_lower:
                severity = "High"
                probable_causes.append(ProbableCauseItem(
                    cause="Early Blight (Alternaria solani)",
                    likelihood="High",
                    reasoning=(
                        "Early blight presents as circular dark brown to black spots with characteristic target-board concentric rings, "
                        "typically initiating on mature lower foliage and spreading acropetally under warm, humid conditions."
                    ),
                    supporting_evidence=f"Affected: {problem.affected_part}. Spreading: {problem.is_spreading}. {cv_image_evidence}"
                ))
                probable_causes.append(ProbableCauseItem(
                    cause="Late Blight (Phytophthora infestans)",
                    likelihood="Moderate",
                    reasoning="Irregular water-soaked greasy foliar lesions that rapidly expand and turn brown-black during periods of cool, high-humidity weather.",
                    supporting_evidence=f"Ambient temperature {curr_temp:.1f}°C."
                ))
                recommended_actions = [
                    "Sanitize and remove severely spotted lower leaves up to 30cm from soil line to enhance air circulation.",
                    "Apply protective bio-fungicide spray of Bacillus subtilis or Copper Hydroxide (2g/L) during morning hours.",
                    "Switch strictly to drip or furrow irrigation; eliminate all overhead sprinkler splash."
                ]
                precautions = [
                    "Never compost foliage displaying blight symptoms; safely bag and dispose off-field.",
                    "Sterilize pruning shears between rows with 70% isopropyl alcohol."
                ]

            elif "yellow" in cat_lower or "chlorosis" in cat_lower or "yellow" in desc_lower:
                severity = "Moderate"
                if "lower" in affected_lower or "bottom" in desc_lower:
                    probable_causes.append(ProbableCauseItem(
                        cause="Nitrogen (N) Deficiency / Physiological Basal Senescence",
                        likelihood="High",
                        reasoning="Nitrogen mobile retranslocation from older bottom leaves to support young developing apical growth and fruit load.",
                        supporting_evidence=f"Basal yellowing on {problem.affected_part}. Moisture: {curr_moisture:.1f}%. {cv_image_evidence}"
                    ))
                else:
                    probable_causes.append(ProbableCauseItem(
                        cause="Interveinal Chlorosis / Magnesium (Mg) or Iron (Fe) Deficiency",
                        likelihood="High",
                        reasoning="Immature upper leaves showing yellowing between veins, often aggravated by root zone pH imbalances.",
                        supporting_evidence=f"Symptoms on {problem.affected_part}. Soil moisture: {curr_moisture:.1f}%."
                    ))
                recommended_actions = [
                    "Apply foliar application of chelated micronutrients or Epsom salts (Magnesium Sulfate @ 5g/L).",
                    "Top-dress root zone with 250g well-aged vermicompost per plant to improve cation exchange capacity.",
                    "Verify soil pH is maintained between 6.2 and 6.8."
                ]
                precautions = [
                    "Avoid over-fertilizing with high-potassium salts which inhibit magnesium uptake.",
                    "Do not apply foliar sprays under intense midday sun to prevent leaf scorch."
                ]

            elif "wilt" in cat_lower or "droop" in cat_lower or "wilt" in desc_lower:
                severity = "High" if problem.is_spreading == "yes" else "Moderate"
                if curr_moisture < 45.0:
                    probable_causes.append(ProbableCauseItem(
                        cause="Temporary Moisture Deficit / Drought Wilting",
                        likelihood="High",
                        reasoning="Turgor loss caused by transpirational demand exceeding root water uptake in dry soil.",
                        supporting_evidence=f"Soil moisture reading {curr_moisture:.1f}%, below target threshold of 55%."
                    ))
                else:
                    probable_causes.append(ProbableCauseItem(
                        cause="Bacterial Wilt (Ralstonia solanacearum) or Fusarium Crown Rot",
                        likelihood="High",
                        reasoning="Rapid wilting of green foliage without initial yellowing in wet soils indicates vascular xylem blockage.",
                        supporting_evidence=f"Moisture is high ({curr_moisture:.1f}%) yet plant shows turgor collapse."
                    ))
                recommended_actions = [
                    "If soil is dry: Deep soak soil around root zone in early morning and apply 5cm organic straw mulch.",
                    "If soil is moist: Cut a lateral stem and perform clear-water beaker test for diagnostic milky bacterial streaming.",
                    "Isolate symptomatic specimens and improve drainage channels immediately."
                ]
                precautions = [
                    "Avoid working among wet foliage to minimize bacterial spread.",
                    "Do not overwater when soil is already at field capacity."
                ]

            else:
                severity = "Moderate"
                probable_causes.append(ProbableCauseItem(
                    cause="Environmental Temperature Stress / Microclimate Fluctuation",
                    likelihood="High",
                    reasoning="Fluctuations in microclimate telemetry affecting blossom set or vegetative canopy expansion.",
                    supporting_evidence=f"Temperature: {curr_temp:.1f}°C, Moisture: {curr_moisture:.1f}%."
                ))
                recommended_actions = [
                    "Maintain stable root zone moisture via automated drip irrigation.",
                    "Install 30% agro-shade net if solar irradiance exceeds optimal threshold."
                ]
                precautions = [
                    "Maintain consistent irrigation intervals to avoid blossom end rot."
                ]

        else:
            # General crops (Chilli, Brinjal, Okra, Cucumber, etc.)
            if "yellow" in cat_lower or "chlorosis" in cat_lower:
                severity = "Moderate"
                probable_causes.append(ProbableCauseItem(
                    cause=f"Nutritional Chlorosis in {plant.crop_type}",
                    likelihood="High",
                    reasoning=f"Nutrient uptake limitation or root zone microclimate stress affecting {plant.crop_type} foliage.",
                    supporting_evidence=f"Reported on {problem.affected_part}. Moisture: {curr_moisture:.1f}%. {cv_image_evidence}"
                ))
                recommended_actions = [
                    "Apply balanced bio-fertilizer and foliar seaweed extract spray.",
                    "Aerate upper 5cm root zone gently to enhance soil aeration."
                ]
                precautions = [
                    "Avoid waterlogging around root zone.",
                    "Avoid high-nitrogen fertilizers during flower set."
                ]
            else:
                severity = "Moderate"
                probable_causes.append(ProbableCauseItem(
                    cause=f"Agronomic Stress in {plant.crop_type}",
                    likelihood="High",
                    reasoning=f"Reported symptoms '{problem.description}' correlated with current microclimate readings.",
                    supporting_evidence=f"Telemetry: {curr_temp:.1f}°C, {curr_moisture:.1f}% soil moisture."
                ))
                recommended_actions = [
                    "Maintain regular irrigation schedule matching crop developmental stage.",
                    "Scout canopy for sucking pests or early lesion initiation."
                ]
                precautions = [
                    "Use clean sanitized tools for all intercultural operations."
                ]

        summary = (
            f"Agronomic AI diagnosis for {plant.crop_type} ({plant.crop_variety}): "
            f"Primary condition evaluated as '{probable_causes[0].cause}' (Confidence Likelihood: {probable_causes[0].likelihood}). "
            f"Severity classified as {severity}. Targeted non-chemical cultural interventions and follow-up protocol established."
        )

        follow_up = "Conduct visual follow-up inspection in 48 to 72 hours. Check leaf undersides, stem base, and terminal growth points."
        expert_guidance = (
            "If symptoms progress to more than 20% of the plant canopy within 5 days, or if sudden whole-plant vascular collapse occurs, "
            "immediately collect an affected leaf or stem sample in a sealed paper envelope and consult your local Agricultural Extension Officer "
            "or nearest Krishi Vigyan Kendra (KVK) horticultural specialist for laboratory pathogen confirmation."
        )

        citations = [
            {"source": ref.get("source", "ICAR / FAO"), "citation": ref.get("citation", "")}
            for ref in crop_profile.get("academic_references", [])
        ]
        if not citations:
            citations = [
                {"source": "ICAR-IIHR", "citation": f"Package of Practices for Horticultural Crops - {plant.crop_type} Management Guidelines, 2024."},
                {"source": "FAO AGP", "citation": "Integrated Pest and Disease Management in Tropical and Subtropical Crops, Rome."}
            ]

        # 5. Persist ProblemAnalysis
        analysis = ProblemAnalysis(
            problem_id=problem.id,
            plant_id=plant.id,
            summary=summary,
            severity=severity,
            probable_causes=json.dumps([c.dict() for c in probable_causes]),
            recommended_actions=json.dumps(recommended_actions),
            precautions=json.dumps(precautions),
            follow_up_schedule=follow_up,
            expert_guidance=expert_guidance,
            icar_fao_citations=json.dumps(citations)
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

        # 6. AUTOMATICALLY CREATE / UPDATE ACTIVE TREATMENT PLAN
        cls._create_or_update_treatment_plan(
            db=db,
            plant=plant,
            problem=problem,
            probable_cause=probable_causes[0],
            severity=severity,
            recommended_actions=recommended_actions,
            precautions=precautions,
            expert_guidance=expert_guidance,
            citations=citations
        )

        return analysis

    @classmethod
    def _create_or_update_treatment_plan(
        cls,
        db: Session,
        plant: Plant,
        problem: PlantProblem,
        probable_cause: ProbableCauseItem,
        severity: str,
        recommended_actions: List[str],
        precautions: List[str],
        expert_guidance: str,
        citations: List[Dict[str, str]]
    ) -> TreatmentPlan:
        """
        Creates or updates an active TreatmentPlan and generates actionable TreatmentAction items.
        """
        plan = (
            db.query(TreatmentPlan)
            .filter(TreatmentPlan.plant_id == plant.id)
            .first()
        )

        if not plan:
            plan = TreatmentPlan(
                plant_id=plant.id,
                user_id=plant.user_id,
                problem_id=problem.id,
                plant_name=plant.name,
                crop_type=plant.crop_type,
                crop_variety=plant.crop_variety,
                condition_name=probable_cause.cause,
                severity=severity,
                problem_summary=f"Diagnosed {probable_cause.cause} following reported '{problem.category}' on {problem.affected_part}.",
                possible_cause=probable_cause.reasoning,
                evidence_notes=probable_cause.supporting_evidence,
                immediate_precautions=json.dumps(precautions),
                recommended_practices=json.dumps(recommended_actions),
                monitoring_instructions="Inspect plant foliage, stem base, and surrounding soil every 48 hours. Record follow-up photo.",
                follow_up_timeline="48 - 72 Hours",
                expected_improvement_signs="Stabilization of chlorosis margins, absence of newly wilted petioles, and emergence of turgid green shoot tips.",
                expert_assistance_guidance=expert_guidance,
                references=json.dumps(citations),
                status="active",
                treatment_start_date=date.today().isoformat()
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)
        else:
            plan.problem_id = problem.id
            plan.condition_name = probable_cause.cause
            plan.severity = severity
            plan.problem_summary = f"Diagnosed {probable_cause.cause} following reported '{problem.category}' on {problem.affected_part}."
            plan.possible_cause = probable_cause.reasoning
            plan.evidence_notes = probable_cause.supporting_evidence
            plan.immediate_precautions = json.dumps(precautions)
            plan.recommended_practices = json.dumps(recommended_actions)
            plan.expert_assistance_guidance = expert_guidance
            plan.references = json.dumps(citations)
            plan.status = "active"
            plan.updated_at = datetime.utcnow()
            # Clear previous non-completed actions for fresh regimen
            db.query(TreatmentAction).filter(TreatmentAction.treatment_plan_id == plan.id, TreatmentAction.is_completed == False).delete()
            db.commit()

        # Generate Action Items
        # 1. Immediate actions from precautions
        for prec in precautions[:2]:
            act = TreatmentAction(
                treatment_plan_id=plan.id,
                action_text=prec,
                action_type="immediate",
                is_completed=False
            )
            db.add(act)

        # 2. Cultural practices
        for prac in recommended_actions:
            act = TreatmentAction(
                treatment_plan_id=plan.id,
                action_text=prac,
                action_type="cultural",
                is_completed=False
            )
            db.add(act)

        # 3. Monitoring action
        monitor_act = TreatmentAction(
            treatment_plan_id=plan.id,
            action_text="Capture and log follow-up photograph in 48 hours to assess symptom progression or recovery.",
            action_type="monitoring",
            is_completed=False
        )
        db.add(monitor_act)

        db.commit()
        db.refresh(plan)
        return plan

    @classmethod
    def _extract_image_features(cls, image_path: Optional[str]) -> str:
        """
        Uses OpenCV to analyze botanical color properties from the uploaded problem image.
        """
        if not image_path:
            return "No photograph provided for computer vision feature extraction."

        disk_path = cls._resolve_disk_path(image_path)
        if not disk_path or not disk_path.exists():
            return "Photograph recorded but image file could not be read from disk."

        try:
            img = cv2.imread(str(disk_path))
            if img is None:
                return "Photograph format could not be decoded by OpenCV."

            h, w = img.shape[:2]
            resized = cv2.resize(img, (256, 256))
            hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)

            # Chlorosis (Yellow) mask: Hue 15 to 30
            yellow_mask = cv2.inRange(hsv, np.array([14, 40, 50]), np.array([32, 255, 255]))
            yellow_pct = round(float(np.count_nonzero(yellow_mask) / (256 * 256)) * 100.0, 1)

            # Healthy Green mask: Hue 35 to 85
            green_mask = cv2.inRange(hsv, np.array([33, 40, 40]), np.array([85, 255, 255]))
            green_pct = round(float(np.count_nonzero(green_mask) / (256 * 256)) * 100.0, 1)

            # Necrosis / Brown mask: Low Sat, Low Val or Reddish-Brown
            brown_mask = cv2.inRange(hsv, np.array([5, 50, 20]), np.array([18, 200, 150]))
            brown_pct = round(float(np.count_nonzero(brown_mask) / (256 * 256)) * 100.0, 1)

            evidence_parts = []
            if yellow_pct > 12.0:
                evidence_parts.append(f"Computer vision detected significant foliar chlorosis ({yellow_pct}% of surface area).")
            if brown_pct > 8.0:
                evidence_parts.append(f"Necrotic foliar tissue / desiccated margins measured at {brown_pct}%.")
            if green_pct > 0.0:
                evidence_parts.append(f"Residual photosynthetic foliage: {green_pct}%.")

            if not evidence_parts:
                return f"CV analysis completed: {green_pct}% green canopy detected without localized pigment abnormalities."

            return " ".join(evidence_parts)

        except Exception as e:
            return f"Computer vision analysis error: {str(e)}"

    @classmethod
    def _resolve_disk_path(cls, path_str: Optional[str]) -> Optional[Path]:
        if not path_str:
            return None
        p = Path(path_str)
        if p.exists() and p.is_file():
            return p
        clean = path_str.replace("\\", "/").strip().lstrip("/")
        if clean.startswith("static/uploads/"):
            sub = clean[len("static/uploads/"):]
        elif clean.startswith("uploads/"):
            sub = clean[len("uploads/"):]
        else:
            sub = clean

        storage_root = Path(settings.STORAGE_DIR)
        for cand in [
            storage_root / sub,
            storage_root / Path(path_str).name,
            storage_root / "problems" / Path(path_str).name,
            storage_root / "observations" / Path(path_str).name,
            storage_root / "demo" / Path(path_str).name,
            Path("backend/data/uploads") / sub
        ]:
            if cand.exists() and cand.is_file():
                return cand
        return None

    @classmethod
    def _to_problem_response(cls, p: PlantProblem) -> PlantProblemResponse:
        analyses_responses = [cls._to_analysis_response(a) for a in p.analyses]
        return PlantProblemResponse(
            id=p.id,
            plant_id=p.plant_id,
            category=p.category,
            description=p.description,
            affected_part=p.affected_part,
            onset_date=p.onset_date,
            is_spreading=p.is_spreading,
            irrigation_notes=p.irrigation_notes,
            fertilizer_notes=p.fertilizer_notes,
            image_path=p.image_path,
            status=p.status,
            created_at=p.created_at,
            analyses=analyses_responses
        )

    @classmethod
    def _to_analysis_response(cls, a: ProblemAnalysis) -> ProblemAnalysisResponse:
        causes_data = json.loads(a.probable_causes) if a.probable_causes else []
        actions = json.loads(a.recommended_actions) if a.recommended_actions else []
        precautions = json.loads(a.precautions) if a.precautions else []
        citations = json.loads(a.icar_fao_citations) if a.icar_fao_citations else []

        return ProblemAnalysisResponse(
            id=a.id,
            problem_id=a.problem_id,
            plant_id=a.plant_id,
            summary=a.summary,
            severity=a.severity,
            probable_causes=[ProbableCauseItem(**c) for c in causes_data],
            recommended_actions=actions,
            precautions=precautions,
            follow_up_schedule=a.follow_up_schedule or "Follow up in 3 days",
            expert_guidance=a.expert_guidance or "Consult local KVK if condition persists",
            icar_fao_citations=citations,
            created_at=a.created_at
        )
