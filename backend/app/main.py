from fastapi import FastAPI, UploadFile, File, HTTPException
from pathlib import Path
from pydantic import BaseModel
from datetime import datetime
import shutil
from uuid import uuid4
from fastapi.responses import FileResponse

from app.vision_engine import detect_objects, vision_to_complaint
from app.complaint_engine import classify_complaint
from app.routing import route_complaint
from app.sla import calculate_sla_info
from app.utils import generate_complaint_id

from app.database import (
    save_complaint,
    get_all_complaints,
    get_complaint_by_id,
    update_complaint_status,
    get_dashboard_stats,
    get_dashboard_analytics,
    search_complaints,
    process_sla_for_complaint,
    complaints_collection,
    update_complaint_location,
    get_map_complaints,
    add_status_history,
    get_status_history,
    save_evidence,
    get_complaint_evidence,
    delete_evidence_metadata
)

from app.models import LocationUpdateRequest

from app.media import save_media_file


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="RailMadad AI Engine",
    description="AI-powered railway complaint processing engine",
    version="1.0.0"
)


UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():
    return {
        "message": "RailMadad AI Engine is running"
    }


# ==================================================
# IMAGE-BASED COMPLAINT ANALYSIS
# ==================================================

@app.post("/analyze")
async def analyze_complaint(file: UploadFile = File(...)):

    # Save uploaded image
    file_path = UPLOAD_DIR / file.filename

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

    # Generate unique complaint ID
    complaint_id = generate_complaint_id()

    # Generate creation timestamp
    created_at = datetime.utcnow()

    # Calculate SLA information
    sla_info = calculate_sla_info(
        complaint_result["severity"],
        created_at
    )

    # Create MongoDB document
    complaint_document = {
        "complaint_id": complaint_id,
        "text": complaint_text,
        "filename": file.filename,
        "detections": detections,

        # Block 9
        "evidence": [],

        "category": complaint_result["category"],
        "subcategory": complaint_result["subcategory"],
        "severity": complaint_result["severity"],
        "confidence": complaint_result["confidence"],

        "department": complaint_result["department"],
        "priority": route["priority"],

        "sla": f"{sla_info['sla_hours']} hours",
        "sla_hours": sla_info["sla_hours"],
        "sla_deadline": sla_info["sla_deadline"],
        "sla_status": sla_info["sla_status"],

        "escalation_required": False,
        "escalated_at": None,

        "status": "SUBMITTED",

        # Location fields
        "latitude": None,
        "longitude": None,
        "location_name": None,

        # Block 8 - Status History
        "status_history": [
            {
                "old_status": None,
                "new_status": "SUBMITTED",
                "changed_at": created_at
            }
        ],

        "created_at": created_at,
        "updated_at": created_at
    }

    # Save complaint to MongoDB
    save_complaint(complaint_document)

    return {
        "complaint_id": complaint_id,
        "filename": file.filename,
        "detections": detections,
        "complaint": complaint_text,
        "classification": complaint_result,
        "routing": route,
        "sla": {
            "hours": sla_info["sla_hours"],
            "deadline": sla_info["sla_deadline"],
            "status": sla_info["sla_status"]
        }
    }


# ==================================================
# TEXT-BASED COMPLAINT ANALYSIS
# ==================================================

class ComplaintRequest(BaseModel):
    text: str


@app.post("/analyze-text")
def analyze_text_complaint(request: ComplaintRequest):

    # Classify text complaint
    complaint_result = classify_complaint(request.text)

    # Route complaint
    route = route_complaint(complaint_result)

    # Generate unique complaint ID
    complaint_id = generate_complaint_id()

    # Generate creation timestamp
    created_at = datetime.utcnow()

    # Calculate SLA information
    sla_info = calculate_sla_info(
        complaint_result["severity"],
        created_at
    )

    # Create MongoDB document
    complaint_document = {
        "complaint_id": complaint_id,
        "text": request.text,
        "filename": None,
        "detections": [],

        # Block 9
        "evidence": [],

        "category": complaint_result["category"],
        "subcategory": complaint_result["subcategory"],
        "severity": complaint_result["severity"],
        "confidence": complaint_result["confidence"],

        "department": complaint_result["department"],
        "priority": route["priority"],

        "sla": f"{sla_info['sla_hours']} hours",
        "sla_hours": sla_info["sla_hours"],
        "sla_deadline": sla_info["sla_deadline"],
        "sla_status": sla_info["sla_status"],

        "escalation_required": False,
        "escalated_at": None,

        "status": "SUBMITTED",

        # Location fields
        "latitude": None,
        "longitude": None,
        "location_name": None,

        # Block 8 - Status History
        "status_history": [
            {
                "old_status": None,
                "new_status": "SUBMITTED",
                "changed_at": created_at
            }
        ],

        "created_at": created_at,
        "updated_at": created_at
    }

    # Save complaint to MongoDB
    save_complaint(complaint_document)

    return {
        "complaint_id": complaint_id,
        "complaint": request.text,
        "classification": complaint_result,
        "routing": route,
        "sla": {
            "hours": sla_info["sla_hours"],
            "deadline": sla_info["sla_deadline"],
            "status": sla_info["sla_status"]
        }
    }


# ==================================================
# SEARCH / FILTER COMPLAINTS
# ==================================================

@app.get("/complaints")
def get_complaints(
    status: str = None,
    severity: str = None,
    department: str = None,
    category: str = None,
    priority: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 10
):

    # Validate pagination
    if page < 1:
        return {
            "message": "Page must be greater than or equal to 1"
        }

    if limit < 1 or limit > 100:
        return {
            "message": "Limit must be between 1 and 100"
        }

    complaints = search_complaints(
        status=status,
        severity=severity,
        department=department,
        category=category,
        priority=priority,
        search=search,
        page=page,
        limit=limit
    )

    return complaints


# ==================================================
# COMPLAINT MAP
# IMPORTANT:
# This MUST come BEFORE /complaints/{complaint_id}
# ==================================================

@app.get("/complaints/map")
def complaints_map(
    status: str = None,
    severity: str = None,
    department: str = None
):

    complaints = get_map_complaints(
        status=status,
        severity=severity,
        department=department
    )

    map_data = []

    for complaint in complaints:

        map_data.append({
            "complaint_id": complaint["complaint_id"],
            "text": complaint.get("text"),
            "category": complaint.get("category"),
            "subcategory": complaint.get("subcategory"),
            "severity": complaint.get("severity"),
            "department": complaint.get("department"),
            "priority": complaint.get("priority"),
            "status": complaint.get("status"),
            "sla_status": complaint.get("sla_status"),
            "escalation_required": complaint.get(
                "escalation_required",
                False
            ),

            "location": {
                "latitude": complaint["latitude"],
                "longitude": complaint["longitude"],
                "name": complaint.get("location_name")
            },

            "created_at": complaint.get("created_at")
        })

    return {
        "count": len(map_data),
        "complaints": map_data
    }


# ==================================================
# GET COMPLAINT STATUS HISTORY
# IMPORTANT:
# This MUST come BEFORE /complaints/{complaint_id}
# ==================================================

@app.get("/complaints/{complaint_id}/history")
def complaint_history(
    complaint_id: str
):

    history = get_status_history(
        complaint_id
    )

    if history is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    return history


# ==================================================
# GET COMPLAINT EVIDENCE
# IMPORTANT:
# This MUST come BEFORE /complaints/{complaint_id}
# ==================================================

@app.get("/complaints/{complaint_id}/evidence")
def get_evidence(
    complaint_id: str
):

    evidence = get_complaint_evidence(
        complaint_id
    )

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    return evidence


# ==================================================
# GET SINGLE EVIDENCE FILE
# ==================================================

@app.get(
    "/complaints/{complaint_id}/evidence/{evidence_id}"
)
def get_evidence_file(
    complaint_id: str,
    evidence_id: str
):

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    evidence_list = complaint.get(
        "evidence",
        []
    )

    evidence = None

    for item in evidence_list:

        if item.get(
            "evidence_id"
        ) == evidence_id:

            evidence = item
            break

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )

    file_path = Path(
        evidence["file_path"]
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Evidence file not found"
        )

    return FileResponse(
        path=file_path,
        media_type=evidence.get(
            "content_type",
            "application/octet-stream"
        ),
        filename=evidence.get(
            "original_filename",
            file_path.name
        )
    )


# ==================================================
# GET SINGLE COMPLAINT
# ==================================================

@app.get("/complaints/{complaint_id}")
def get_complaint(
    complaint_id: str
):

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        return {
            "message": "Complaint not found",
            "complaint_id": complaint_id
        }

    return complaint


# ==================================================
# UPDATE COMPLAINT STATUS
# ==================================================

class StatusUpdateRequest(BaseModel):
    status: str


@app.put("/complaints/{complaint_id}/status")
def update_status(
    complaint_id: str,
    request: StatusUpdateRequest
):

    valid_statuses = [
        "SUBMITTED",
        "ASSIGNED",
        "IN_PROGRESS",
        "RESOLVED",
        "ESCALATED",
        "REJECTED"
    ]

    # Validate requested status
    if request.status not in valid_statuses:
        return {
            "message": "Invalid status",
            "valid_statuses": valid_statuses
        }

    # Get existing complaint
    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        return {
            "message": "Complaint not found",
            "complaint_id": complaint_id
        }

    # Get current status
    old_status = complaint.get(
        "status",
        "SUBMITTED"
    )

    # Prevent unnecessary history entries
    if old_status == request.status:
        return {
            "message": "Complaint is already in this status",
            "complaint_id": complaint_id,
            "status": request.status
        }

    # Update complaint status
    updated = update_complaint_status(
        complaint_id,
        request.status
    )

    if updated == 0:
        return {
            "message": "Complaint status was not changed",
            "complaint_id": complaint_id
        }

    # Add status history
    add_status_history(
        complaint_id,
        old_status,
        request.status
    )

    return {
        "message": "Complaint status updated successfully",
        "complaint_id": complaint_id,
        "old_status": old_status,
        "status": request.status
    }


# ==================================================
# DASHBOARD STATISTICS
# ==================================================

@app.get("/dashboard/stats")
def dashboard_stats():

    stats = get_dashboard_stats()

    return stats


# ==================================================
# DASHBOARD ANALYTICS
# ==================================================

@app.get("/dashboard/analytics")
def dashboard_analytics():

    analytics = get_dashboard_analytics()

    return analytics


# ==================================================
# CHECK COMPLAINT SLA
# ==================================================

@app.post("/complaints/{complaint_id}/check-sla")
def check_complaint_sla(
    complaint_id: str
):

    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        return {
            "message": "Complaint not found",
            "complaint_id": complaint_id
        }

    result = process_sla_for_complaint(
        complaint
    )

    return result


# ==================================================
# SLA DASHBOARD
# ==================================================

@app.get("/dashboard/sla")
def dashboard_sla():

    total = complaints_collection.count_documents({})

    within_sla = complaints_collection.count_documents({
        "sla_status": "WITHIN_SLA"
    })

    approaching = complaints_collection.count_documents({
        "sla_status": "APPROACHING_DEADLINE"
    })

    breached = complaints_collection.count_documents({
        "sla_status": "SLA_BREACHED"
    })

    escalated = complaints_collection.count_documents({
        "escalation_required": True
    })

    return {
        "total_complaints": total,
        "within_sla": within_sla,
        "approaching_deadline": approaching,
        "sla_breached": breached,
        "escalated": escalated
    }


# ==================================================
# LOCATION VALIDATION
# ==================================================

def validate_coordinates(
    latitude: float,
    longitude: float
):

    if latitude < -90 or latitude > 90:
        raise HTTPException(
            status_code=400,
            detail="Latitude must be between -90 and 90"
        )

    if longitude < -180 or longitude > 180:
        raise HTTPException(
            status_code=400,
            detail="Longitude must be between -180 and 180"
        )


# ==================================================
# UPDATE COMPLAINT LOCATION
# ==================================================

@app.put("/complaints/{complaint_id}/location")
def update_location(
    complaint_id: str,
    request: LocationUpdateRequest
):

    # Validate coordinates
    validate_coordinates(
        request.latitude,
        request.longitude
    )

    # Check complaint exists
    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Update location
    updated = update_complaint_location(
        complaint_id=complaint_id,
        latitude=request.latitude,
        longitude=request.longitude,
        location_name=request.location_name
    )

    if updated == 0:
        return {
            "message": "Location was not changed",
            "complaint_id": complaint_id
        }

    return {
        "message": "Complaint location updated successfully",
        "complaint_id": complaint_id,
        "latitude": request.latitude,
        "longitude": request.longitude,
        "location_name": request.location_name
    }


# ==================================================
# BLOCK 9
# UPLOAD COMPLAINT EVIDENCE
# ==================================================

@app.post(
    "/complaints/{complaint_id}/evidence"
)
async def upload_evidence(
    complaint_id: str,
    file: UploadFile = File(...)
):

    # Check complaint exists
    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    # Save file
    file_info = await save_media_file(
        complaint_id,
        file
    )

    # Generate evidence ID
    evidence_id = (
        f"EV-{uuid4().hex[:12].upper()}"
    )

    # Create evidence metadata
    evidence = {
        "evidence_id": evidence_id,

        "original_filename": file_info[
            "original_filename"
        ],

        "stored_filename": file_info[
            "stored_filename"
        ],

        "file_path": file_info[
            "file_path"
        ],

        "content_type": file_info[
            "content_type"
        ],

        "media_type": file_info[
            "media_type"
        ],

        "file_size": file_info[
            "file_size"
        ],

        "uploaded_at": datetime.utcnow()
    }

    # Save metadata in MongoDB
    saved = save_evidence(
        complaint_id,
        evidence
    )

    if saved == 0:
        return {
            "message": "Evidence could not be saved",
            "complaint_id": complaint_id
        }

    return {
        "message": "Evidence uploaded successfully",
        "complaint_id": complaint_id,
        "evidence": {
            "evidence_id": evidence_id,
            "filename": file_info[
                "original_filename"
            ],
            "media_type": file_info[
                "media_type"
            ],
            "content_type": file_info[
                "content_type"
            ],
            "file_size": file_info[
                "file_size"
            ]
        }
    }


# ==================================================
# BLOCK 9
# DELETE EVIDENCE
# ==================================================

@app.delete(
    "/complaints/{complaint_id}/evidence/{evidence_id}"
)
def delete_evidence(
    complaint_id: str,
    evidence_id: str
):

    # Check complaint exists
    complaint = get_complaint_by_id(
        complaint_id
    )

    if complaint is None:
        raise HTTPException(
            status_code=404,
            detail="Complaint not found"
        )

    evidence_list = complaint.get(
        "evidence",
        []
    )

    evidence = None

    for item in evidence_list:

        if item.get(
            "evidence_id"
        ) == evidence_id:

            evidence = item
            break

    if evidence is None:
        raise HTTPException(
            status_code=404,
            detail="Evidence not found"
        )

    # Delete physical file
    file_path = Path(
        evidence["file_path"]
    )

    if file_path.exists():
        file_path.unlink()

    # Delete MongoDB metadata
    deleted = delete_evidence_metadata(
        complaint_id,
        evidence_id
    )

    if deleted == 0:
        return {
            "message": "Evidence could not be deleted",
            "complaint_id": complaint_id,
            "evidence_id": evidence_id
        }

    return {
        "message": "Evidence deleted successfully",
        "complaint_id": complaint_id,
        "evidence_id": evidence_id
    }