import os
import uuid
from pathlib import Path
from fastapi import UploadFile, HTTPException
from PIL import Image
from app.core.config import settings

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_MIMES = {"image/jpeg", "image/png", "image/webp"}

class StorageService:
    @staticmethod
    def validate_and_save_image(file: UploadFile, subfolder: str = "observations") -> str:
        # Check filename extension
        original_filename = file.filename or "uploaded_image.jpg"
        ext = os.path.splitext(original_filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Check content type if provided
        if file.content_type and file.content_type not in ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported MIME type '{file.content_type}'. Allowed: {', '.join(ALLOWED_MIMES)}"
            )

        # Path traversal protection: generate unique clean filename
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        target_dir = Path(settings.STORAGE_DIR) / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)
        file_path = target_dir / unique_filename

        # Read content and enforce size restriction
        contents = file.file.read()
        if len(contents) > settings.MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"File size exceeds maximum limit of {settings.MAX_IMAGE_SIZE_BYTES // (1024*1024)}MB."
            )
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # Validate image integrity with PIL
        import io
        try:
            image = Image.open(io.BytesIO(contents))
            image.verify()  # verify that it's a valid image header
            # Reopen to allow further operations or format check
            image = Image.open(io.BytesIO(contents))
            if image.format.lower() not in ["jpeg", "png", "webp"]:
                raise HTTPException(status_code=400, detail=f"Invalid image format: {image.format}")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Corrupted or invalid image file: {str(e)}")

        # Write safely to disk
        with open(file_path, "wb") as f:
            f.write(contents)

        # Return relative storage path for API/frontend consumption
        relative_path = f"/static/uploads/{subfolder}/{unique_filename}"
        return relative_path

    @staticmethod
    def get_absolute_path(relative_path: str) -> Path:
        # Strips prefix /static/uploads/
        clean_rel = relative_path.replace("/static/uploads/", "").lstrip("/\\")
        # Prevent path traversal
        resolved = (Path(settings.STORAGE_DIR) / clean_rel).resolve()
        if not str(resolved).startswith(str(Path(settings.STORAGE_DIR).resolve())):
            raise HTTPException(status_code=403, detail="Access denied: invalid file path.")
        return resolved
