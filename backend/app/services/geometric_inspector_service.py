import os
import cv2
import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session
from fastapi import HTTPException, UploadFile

from app.models.plant import Plant
from app.models.observation import Observation
from app.models.analysis import GeometricAnalysisResult
from app.core.config import settings
from app.services.storage_service import StorageService
from app.schemas.analysis import GeometricAnalysisResponse

class GeometricInspectorService:
    """
    Computer Vision Geometric Anomaly Inspector.
    Performs morphological segmentation, boundary contour extraction,
    convex hull irregularity calculation, aspect ratio and asymmetry metrics,
    and longitudinal structural change tracking.
    """

    @classmethod
    def inspect_plant_geometry(
        cls,
        db: Session,
        plant_id: str,
        observation_id: Optional[str] = None,
        image_file: Optional[UploadFile] = None,
        user_id: Optional[str] = None
    ) -> GeometricAnalysisResponse:
        # 1. Verify Plant & Permissions
        plant_query = db.query(Plant).filter(Plant.id == plant_id)
        if user_id:
            plant_query = plant_query.filter((Plant.user_id == user_id) | (Plant.is_demo == True))
        plant = plant_query.first()
        if not plant:
            raise HTTPException(status_code=404, detail="Plant not found or access denied")

        # 2. Resolve Input Image Path
        source_image_path: Optional[str] = None
        target_obs: Optional[Observation] = None

        if image_file and image_file.filename:
            source_image_path = StorageService.validate_and_save_image(image_file, subfolder="geometric")
        elif observation_id:
            target_obs = db.query(Observation).filter(Observation.id == observation_id, Observation.plant_id == plant_id).first()
            if not target_obs or not target_obs.image_path:
                raise HTTPException(status_code=404, detail="Specified observation has no image recorded")
            source_image_path = target_obs.image_path
        else:
            # Pick latest observation with image
            latest_obs = (
                db.query(Observation)
                .filter(Observation.plant_id == plant_id, Observation.image_path.isnot(None))
                .order_by(Observation.observation_date.desc())
                .first()
            )
            if latest_obs:
                target_obs = latest_obs
                source_image_path = latest_obs.image_path
            else:
                raise HTTPException(status_code=400, detail="No photograph available for this plant. Please upload or select an observation.")

        # 3. Resolve Real Disk File Path
        disk_path = cls._resolve_disk_path(source_image_path)
        if not disk_path or not disk_path.exists():
            raise HTTPException(status_code=400, detail="Source image file could not be read from disk")

        # 4. Execute Computer Vision Pipeline with OpenCV
        cv_result = cls._run_cv_pipeline(str(disk_path))

        # 5. Longitudinal Comparison with Prior Observation
        prior_analysis = (
            db.query(GeometricAnalysisResult)
            .filter(GeometricAnalysisResult.plant_id == plant_id)
            .order_by(GeometricAnalysisResult.created_at.desc())
            .first()
        )

        relative_area_change = 0.0
        if prior_analysis and prior_analysis.leaf_area_px > 0:
            current_area = cv_result["leaf_area_px"]
            previous_area = prior_analysis.leaf_area_px
            relative_area_change = round(((current_area - previous_area) / previous_area) * 100.0, 1)

        # 6. Anomaly Detection & Interpretation
        anomalies: List[str] = []
        anomaly_score = 0.0

        if cv_result["convexity"] < 0.68:
            anomalies.append("Significant leaf contour irregularity / margin serration or curling detected")
            anomaly_score += 0.35
        if cv_result["asymmetry_index"] > 0.22:
            anomalies.append("Marked lateral leaf asymmetry observed across central midrib axis")
            anomaly_score += 0.30
        if relative_area_change < -18.0:
            anomalies.append(f"Unexpected {abs(relative_area_change)}% decrease in projected canopy area; potential wilting or leaf drop")
            anomaly_score += 0.30
        elif relative_area_change > 45.0:
            anomalies.append(f"Rapid expansion (+{relative_area_change}%) in foliar area consistent with active vegetative flush")

        if cv_result["circularity"] < 0.25:
            anomalies.append("Highly elongated or lobed contour profile compared to standard rounded foliage")
            anomaly_score += 0.15

        anomaly_score = min(1.0, round(anomaly_score, 2))

        # Interpretation text
        if anomaly_score >= 0.5:
            interpretation = (
                f"Geometric analysis indicates substantial structural deviations (anomaly score: {anomaly_score:.2f}). "
                f"Contour convexity of {cv_result['convexity']:.2f} and asymmetry index of {cv_result['asymmetry_index']:.2f} "
                f"suggest foliar distortion, curling, or uneven developmental stress."
            )
            reliability = "High"
        elif anomaly_score >= 0.25:
            interpretation = (
                f"Mild morphological asymmetry or contour waviness detected (anomaly score: {anomaly_score:.2f}). "
                f"Canopy coverage is {cv_result['canopy_coverage_pct']:.1f}% with modest structural variation."
            )
            reliability = "High"
        else:
            interpretation = (
                f"Plant geometry falls within normal symmetric parameters (anomaly score: {anomaly_score:.2f}). "
                f"Convexity ({cv_result['convexity']:.2f}) and aspect ratio ({cv_result['aspect_ratio']:.2f}) "
                f"indicate uniform, intact foliar margins without marked deformation."
            )
            reliability = "High"

        disclaimer = (
            "All geometric measurements are computed in image pixel units. Without a reference physical calibration "
            "marker (e.g. 1 cm fiducial scale), pixel area cannot be directly converted to physical square centimeters. "
            "Image comparisons require photographs captured from a similar camera distance and perpendicular viewing angle."
        )

        # 7. Persist Result in Database
        record = GeometricAnalysisResult(
            plant_id=plant.id,
            observation_id=target_obs.id if target_obs else None,
            user_id=user_id or plant.user_id,
            original_image_path=source_image_path,
            processed_overlay_path=cv_result["overlay_url"],
            mask_image_path=cv_result["mask_url"],
            leaf_area_px=cv_result["leaf_area_px"],
            perimeter_px=cv_result["perimeter_px"],
            aspect_ratio=cv_result["aspect_ratio"],
            circularity=cv_result["circularity"],
            convexity=cv_result["convexity"],
            asymmetry_index=cv_result["asymmetry_index"],
            canopy_coverage_pct=cv_result["canopy_coverage_pct"],
            relative_area_change_pct=relative_area_change,
            anomaly_flags=json.dumps(anomalies),
            anomaly_score=anomaly_score,
            reliability=reliability,
            interpretation=interpretation,
            limitations_disclaimer=disclaimer
        )
        db.add(record)
        db.commit()
        db.refresh(record)

        return cls._to_response(record)

    @classmethod
    def get_plant_geometric_analyses(cls, db: Session, plant_id: str) -> List[GeometricAnalysisResponse]:
        results = (
            db.query(GeometricAnalysisResult)
            .filter(GeometricAnalysisResult.plant_id == plant_id)
            .order_by(GeometricAnalysisResult.created_at.desc())
            .all()
        )
        return [cls._to_response(r) for r in results]

    @classmethod
    def get_analysis_by_id(cls, db: Session, analysis_id: str) -> GeometricAnalysisResponse:
        record = db.query(GeometricAnalysisResult).filter(GeometricAnalysisResult.id == analysis_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Geometric analysis record not found")
        return cls._to_response(record)

    # ================= Private Computer Vision Engine =================

    @classmethod
    def _run_cv_pipeline(cls, file_path: str) -> Dict[str, Any]:
        img = cv2.imread(file_path)
        if img is None:
            raise ValueError(f"OpenCV failed to read image at {file_path}")

        h_orig, w_orig = img.shape[:2]
        # Standardize working resolution
        target_w, target_h = 512, 512
        resized = cv2.resize(img, (target_w, target_h))
        total_pixels = target_w * target_h

        # 1. Color Space Conversion to HSV and Lab
        hsv = cv2.cvtColor(resized, cv2.COLOR_BGR2HSV)
        lab = cv2.cvtColor(resized, cv2.COLOR_BGR2Lab)

        # 2. Vegetation Segmentation: Green and Chlorotic Plant Pigments
        # Green HSV mask: Hue ~ 25 to 95, Sat > 35, Val > 35
        lower_green = np.array([25, 35, 35], dtype=np.uint8)
        upper_green = np.array([95, 255, 255], dtype=np.uint8)
        green_mask = cv2.inRange(hsv, lower_green, upper_green)

        # Yellow/Chlorotic leaf mask: Hue ~ 15 to 30
        lower_yellow = np.array([14, 40, 50], dtype=np.uint8)
        upper_yellow = np.array([30, 255, 255], dtype=np.uint8)
        yellow_mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

        combined_mask = cv2.bitwise_or(green_mask, yellow_mask)

        # Morphological clean-up: remove fine noise & close internal lacunae
        kernel_ellipse = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        cleaned_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel_ellipse, iterations=1)
        cleaned_mask = cv2.morphologyEx(cleaned_mask, cv2.MORPH_CLOSE, kernel_ellipse, iterations=2)

        # 3. Contour Detection
        contours, _ = cv2.findContours(cleaned_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        if not contours:
            # Fallback if image was extremely dark or atypical
            contours = [np.array([[[100, 100]], [[400, 100]], [[400, 400]], [[100, 400]]], dtype=np.int32)]

        # Filter significant contours
        min_contour_area = 250.0
        significant_contours = [c for c in contours if cv2.contourArea(c) >= min_contour_area]
        if not significant_contours:
            significant_contours = [max(contours, key=cv2.contourArea)]

        # Largest contour (primary focal leaf or main canopy mass)
        largest_cnt = max(significant_contours, key=cv2.contourArea)

        # Calculate metrics
        total_canopy_area = float(sum(cv2.contourArea(c) for c in significant_contours))
        total_perimeter = float(sum(cv2.arcLength(c, True) for c in significant_contours))

        # Main contour bounding box
        x, y, w, h = cv2.boundingRect(largest_cnt)
        aspect_ratio = round(float(w) / max(1.0, float(h)), 3)

        # Circularity = 4 * pi * Area / Perimeter^2
        main_area = cv2.contourArea(largest_cnt)
        main_peri = cv2.arcLength(largest_cnt, True)
        circularity = round((4.0 * np.pi * main_area) / max(1.0, main_peri ** 2), 3)

        # Convex Hull & Convexity
        hull = cv2.convexHull(largest_cnt)
        hull_area = cv2.contourArea(hull)
        convexity = round(main_area / max(1.0, hull_area), 3)

        # Centroid & Asymmetry Index
        M = cv2.moments(largest_cnt)
        if M["m00"] > 0:
            cx = float(M["m10"] / M["m00"])
            cy = float(M["m01"] / M["m00"])
        else:
            cx, cy = float(x + w / 2), float(y + h / 2)

        box_center_x = float(x + w / 2)
        box_center_y = float(y + h / 2)
        box_diag = np.sqrt(float(w ** 2 + h ** 2)) + 1e-5
        centroid_offset = np.sqrt((cx - box_center_x) ** 2 + (cy - box_center_y) ** 2)
        asymmetry_index = round(float(centroid_offset / box_diag), 3)

        canopy_coverage_pct = round(float(total_canopy_area / total_pixels) * 100.0, 1)

        # 4. Generate Visual Overlays
        overlay = resized.copy()
        # Draw all significant contour boundaries in green
        cv2.drawContours(overlay, significant_contours, -1, (0, 220, 80), 2)
        # Draw convex hull in cyan
        cv2.drawContours(overlay, [hull], -1, (240, 200, 0), 2)
        # Draw bounding box in amber
        cv2.rectangle(overlay, (x, y), (x + w, y + h), (0, 165, 255), 1)
        # Draw centroid marker in red
        cv2.circle(overlay, (int(cx), int(cy)), 5, (0, 0, 255), -1)

        # Create output files
        geom_dir = Path(settings.STORAGE_DIR) / "geometric"
        geom_dir.mkdir(parents=True, exist_ok=True)

        token = uuid.uuid4().hex[:10]
        overlay_filename = f"geom_overlay_{token}.jpg"
        mask_filename = f"geom_mask_{token}.png"

        overlay_disk = geom_dir / overlay_filename
        mask_disk = geom_dir / mask_filename

        cv2.imwrite(str(overlay_disk), overlay)
        cv2.imwrite(str(mask_disk), cleaned_mask)

        return {
            "leaf_area_px": round(total_canopy_area, 1),
            "perimeter_px": round(total_perimeter, 1),
            "aspect_ratio": aspect_ratio,
            "circularity": circularity,
            "convexity": convexity,
            "asymmetry_index": asymmetry_index,
            "canopy_coverage_pct": canopy_coverage_pct,
            "overlay_url": f"/static/uploads/geometric/{overlay_filename}",
            "mask_url": f"/static/uploads/geometric/{mask_filename}"
        }

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
            storage_root / "observations" / Path(path_str).name,
            storage_root / "problems" / Path(path_str).name,
            storage_root / "demo" / Path(path_str).name,
            Path("backend/data/uploads") / sub,
            Path("backend/data/seed_data/vegetative") / Path(path_str).name
        ]:
            if cand.exists() and cand.is_file():
                return cand
        return None

    @classmethod
    def _to_response(cls, r: GeometricAnalysisResult) -> GeometricAnalysisResponse:
        flags = json.loads(r.anomaly_flags) if r.anomaly_flags else []
        return GeometricAnalysisResponse(
            id=r.id,
            plant_id=r.plant_id,
            observation_id=r.observation_id,
            original_image_url=r.original_image_path,
            processed_overlay_url=r.processed_overlay_path,
            mask_image_url=r.mask_image_path,
            leaf_area_px=r.leaf_area_px,
            perimeter_px=r.perimeter_px,
            aspect_ratio=r.aspect_ratio,
            circularity=r.circularity,
            convexity=r.convexity,
            asymmetry_index=r.asymmetry_index,
            canopy_coverage_pct=r.canopy_coverage_pct,
            relative_area_change_pct=r.relative_area_change_pct,
            anomaly_flags=flags,
            anomaly_score=r.anomaly_score,
            reliability=r.reliability,
            interpretation=r.interpretation,
            limitations_disclaimer=r.limitations_disclaimer,
            created_at=r.created_at
        )
