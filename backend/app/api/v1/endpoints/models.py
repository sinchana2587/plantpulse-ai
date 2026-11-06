from fastapi import APIRouter
from app.ml.growth_stage_classifier import classifier_instance

router = APIRouter()

@router.get("/status")
def get_model_status():
    return classifier_instance.get_status()
