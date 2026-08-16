from fastapi import FastAPI, UploadFile, File
from pathlib import Path
from pydantic import BaseModel
import shutil

from app.vision_engine import detect_objects, vision_to_complaint
from app.complaint_engine import classify_complaint
from app.routing import route_complaint


app = FastAPI(
    title="RailMadad AI Engine",
    description="AI-powered railway complaint processing engine",
    version="1.0.0"
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@app.get("/")
def root():
    return {
        "message": "RailMadad AI Engine is running"
    }


# --------------------------------------------------
# IMAGE-BASED COMPLAINT ANALYSIS
# --------------------------------------------------

@app.post("/analyze")
async def analyze_complaint(file: UploadFile = File(...)):

    file_path = UPLOAD_DIR / file.filename

    # Save uploaded image
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run YOLO object detection
    detections = detect_objects(str(file_path))

    # Convert detections into complaint text
    complaint_text = vision_to_complaint(detections)

    # Classify complaint
    complaint_result = classify_complaint(complaint_text)

    # Route complaint
    route = route_complaint(complaint_result)

    return {
        "filename": file.filename,
        "detections": detections,
        "complaint": complaint_text,
        "classification": complaint_result,
        "routing": route
    }


# --------------------------------------------------
# TEXT-BASED COMPLAINT ANALYSIS
# --------------------------------------------------

class ComplaintRequest(BaseModel):
    text: str


@app.post("/analyze-text")
def analyze_text_complaint(request: ComplaintRequest):

    # Classify text complaint
    complaint_result = classify_complaint(request.text)

    # Route complaint
    route = route_complaint(complaint_result)

    return {
        "complaint": request.text,
        "classification": complaint_result,
        "routing": route
    }