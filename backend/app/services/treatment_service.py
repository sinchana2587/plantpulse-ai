import json
import uuid
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.plant import Plant
from app.models.analysis import TreatmentPlan, TreatmentAction, RecoveryObservation
from app.services.storage_service import StorageService
from app.schemas.analysis import (
    TreatmentPlanResponse,
    TreatmentActionResponse,
    RecoveryObservationResponse
)

class TreatmentService:
    """
    Agricultural Treatment & Recovery Management Engine.
    Powers evidence-based treatment regimens, action completion tracking,
    follow-up photographic logs, and longitudinal recovery timelines.
    """

    @classmethod
    def get_latest_user_treatment(cls, db: Session, user_id: Optional[str] = None) -> Optional[TreatmentPlanResponse]:
        query = db.query(TreatmentPlan).join(Plant)
        if user_id:
            query = query.filter((TreatmentPlan.user_id == user_id) | (Plant.is_demo == True))
        
        latest = query.order_by(TreatmentPlan.updated_at.desc()).first()
        if not latest:
            return None
        return cls._to_response(latest)

    @classmethod
    def get_plant_treatment(cls, db: Session, plant_id: str, user_id: Optional[str] = None) -> Optional[TreatmentPlanResponse]:
        query = db.query(TreatmentPlan).filter(TreatmentPlan.plant_id == plant_id)
        if user_id:
            query = query.join(Plant).filter((TreatmentPlan.user_id == user_id) | (Plant.is_demo == True))

        latest = query.order_by(TreatmentPlan.updated_at.desc()).first()
        if not latest:
            return None
        return cls._to_response(latest)

    @classmethod
    def get_plant_treatment_history(cls, db: Session, plant_id: str) -> List[TreatmentPlanResponse]:
        plans = (
            db.query(TreatmentPlan)
            .filter(TreatmentPlan.plant_id == plant_id)
            .order_by(TreatmentPlan.created_at.desc())
            .all()
        )
        return [cls._to_response(p) for p in plans]

    @classmethod
    def get_treatment_by_id(cls, db: Session, treatment_id: str) -> TreatmentPlanResponse:
        plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == treatment_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Treatment plan not found")
        return cls._to_response(plan)

    @classmethod
    def update_action_completion(
        cls,
        db: Session,
        treatment_id: str,
        action_id: str,
        is_completed: bool
    ) -> TreatmentActionResponse:
        action = (
            db.query(TreatmentAction)
            .filter(TreatmentAction.id == action_id, TreatmentAction.treatment_plan_id == treatment_id)
            .first()
        )
        if not action:
            raise HTTPException(status_code=404, detail="Treatment action item not found")

        action.is_completed = is_completed
        action.completed_at = datetime.utcnow() if is_completed else None
        
        # Touch treatment plan updated_at
        plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == treatment_id).first()
        if plan:
            plan.updated_at = datetime.utcnow()
            # If all actions completed, mark in_progress
            all_actions = db.query(TreatmentAction).filter(TreatmentAction.treatment_plan_id == treatment_id).all()
            if all(a.is_completed for a in all_actions):
                plan.status = "in_progress"

        db.commit()
        db.refresh(action)

        return TreatmentActionResponse(
            id=action.id,
            action_text=action.action_text,
            action_type=action.action_type,
            is_completed=action.is_completed,
            completed_at=action.completed_at
        )

    @classmethod
    def add_recovery_follow_up(
        cls,
        db: Session,
        treatment_id: str,
        symptom_status: str,
        notes: Optional[str] = None,
        image_file: Optional[UploadFile] = None
    ) -> RecoveryObservationResponse:
        plan = db.query(TreatmentPlan).filter(TreatmentPlan.id == treatment_id).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Treatment plan not found")

        image_path = None
        if image_file and image_file.filename:
            image_path = StorageService.validate_and_save_image(image_file, subfolder="recovery")

        obs = RecoveryObservation(
            treatment_plan_id=plan.id,
            plant_id=plan.plant_id,
            observation_date=datetime.utcnow(),
            image_path=image_path,
            symptom_status=symptom_status,
            notes=notes or ""
        )
        db.add(obs)

        # Update treatment plan status
        if symptom_status == "improved":
            plan.status = "in_progress"
        elif symptom_status == "worsened":
            plan.status = "active"

        plan.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(obs)

        return RecoveryObservationResponse(
            id=obs.id,
            observation_date=obs.observation_date,
            image_path=obs.image_path,
            symptom_status=obs.symptom_status,
            notes=obs.notes,
            created_at=obs.created_at
        )

    @classmethod
    def _to_response(cls, p: TreatmentPlan) -> TreatmentPlanResponse:
        precautions = json.loads(p.immediate_precautions) if p.immediate_precautions else []
        practices = json.loads(p.recommended_practices) if p.recommended_practices else []
        refs = json.loads(p.references) if p.references else []

        action_responses = [
            TreatmentActionResponse(
                id=a.id,
                action_text=a.action_text,
                action_type=a.action_type,
                is_completed=a.is_completed,
                completed_at=a.completed_at
            )
            for a in p.actions
        ]

        obs_responses = [
            RecoveryObservationResponse(
                id=o.id,
                observation_date=o.observation_date,
                image_path=o.image_path,
                symptom_status=o.symptom_status,
                notes=o.notes,
                created_at=o.created_at
            )
            for o in p.recovery_observations
        ]

        return TreatmentPlanResponse(
            id=p.id,
            plant_id=p.plant_id,
            user_id=p.user_id,
            problem_id=p.problem_id,
            plant_name=p.plant_name,
            crop_type=p.crop_type,
            crop_variety=p.crop_variety,
            condition_name=p.condition_name,
            severity=p.severity,
            problem_summary=p.problem_summary,
            possible_cause=p.possible_cause,
            evidence_notes=p.evidence_notes,
            immediate_precautions=precautions,
            recommended_practices=practices,
            monitoring_instructions=p.monitoring_instructions or "Monitor plant every 48 hours.",
            follow_up_timeline=p.follow_up_timeline or "48 - 72 Hours",
            expected_improvement_signs=p.expected_improvement_signs,
            expert_assistance_guidance=p.expert_assistance_guidance,
            references=refs,
            status=p.status,
            treatment_start_date=p.treatment_start_date,
            actions=action_responses,
            recovery_observations=obs_responses,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
