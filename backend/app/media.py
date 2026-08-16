from pathlib import Path
from uuid import uuid4
import shutil

from fastapi import UploadFile, HTTPException


# ==================================================
# MEDIA CONFIGURATION
# ==================================================

MEDIA_DIR = Path("uploads") / "evidence"

MEDIA_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# Maximum file size = 20 MB
MAX_FILE_SIZE = 20 * 1024 * 1024


# ==================================================
# ALLOWED FILE TYPES
# ==================================================

ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}


ALLOWED_VIDEO_TYPES = {
    "video/mp4",
    "video/quicktime",
    "video/x-msvideo"
}


ALLOWED_TYPES = (
    ALLOWED_IMAGE_TYPES |
    ALLOWED_VIDEO_TYPES
)


# ==================================================
# VALIDATE MEDIA
# ==================================================

def validate_media(file: UploadFile):

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="File name is missing"
        )

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                "Unsupported file type. "
                "Allowed formats: JPG, JPEG, PNG, WEBP, "
                "MP4, MOV and AVI"
            )
        )


# ==================================================
# GET MEDIA TYPE
# ==================================================

def get_media_type(content_type: str) -> str:

    if content_type in ALLOWED_IMAGE_TYPES:
        return "IMAGE"

    if content_type in ALLOWED_VIDEO_TYPES:
        return "VIDEO"

    return "UNKNOWN"


# ==================================================
# SAVE MEDIA FILE
# ==================================================

async def save_media_file(
    complaint_id: str,
    file: UploadFile
):
    """
    Save uploaded evidence file locally.

    Returns:
        file information dictionary
    """

    # Validate file
    validate_media(file)

    # Create complaint-specific directory
    complaint_dir = (
        MEDIA_DIR / complaint_id
    )

    complaint_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    # Generate unique file name
    extension = Path(
        file.filename
    ).suffix.lower()

    unique_filename = (
        f"{uuid4().hex}{extension}"
    )

    file_path = (
        complaint_dir / unique_filename
    )

    # Save file
    total_size = 0

    with open(file_path, "wb") as buffer:

        while True:

            chunk = await file.read(1024 * 1024)

            if not chunk:
                break

            total_size += len(chunk)

            if total_size > MAX_FILE_SIZE:

                # Delete partially saved file
                if file_path.exists():
                    file_path.unlink()

                raise HTTPException(
                    status_code=413,
                    detail="File size cannot exceed 20 MB"
                )

            buffer.write(chunk)

    return {
        "original_filename": file.filename,
        "stored_filename": unique_filename,
        "file_path": str(file_path),
        "content_type": file.content_type,
        "media_type": get_media_type(
            file.content_type
        ),
        "file_size": total_size
    }