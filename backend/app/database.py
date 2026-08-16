import os
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient
from dotenv import load_dotenv


env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(env_path)


MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise ValueError("MONGODB_URI is not set in .env")


client = MongoClient(MONGODB_URI)

db = client["railmadad"]

complaints_collection = db["complaints"]
def save_complaint(complaint: dict):
    """
    Save a complaint document to MongoDB.
    """

    result = complaints_collection.insert_one(complaint)

    return str(result.inserted_id)

def get_all_complaints():
    """
    Get all complaints from MongoDB.
    """

    complaints = list(
        complaints_collection.find(
            {},
            {"_id": 0}
        )
    )

    return complaints
def get_complaint_by_id(complaint_id: str):
    """
    Get a single complaint by complaint ID.
    """

    complaint = complaints_collection.find_one(
        {"complaint_id": complaint_id},
        {"_id": 0}
    )

    return complaint
def update_complaint_status(complaint_id: str, status: str):
    """
    Update the status of a complaint.
    """

    result = complaints_collection.update_one(
        {"complaint_id": complaint_id},
        {
            "$set": {
                "status": status
            }
        }
    )

    return result.modified_count

# --------------------------------------------------
# DASHBOARD STATISTICS
# --------------------------------------------------

def get_dashboard_stats():
    """
    Get overall complaint statistics for the officer dashboard.
    """

    total = complaints_collection.count_documents({})

    submitted = complaints_collection.count_documents({
        "status": "SUBMITTED"
    })

    assigned = complaints_collection.count_documents({
        "status": "ASSIGNED"
    })

    in_progress = complaints_collection.count_documents({
        "status": "IN_PROGRESS"
    })

    resolved = complaints_collection.count_documents({
        "status": "RESOLVED"
    })

    escalated = complaints_collection.count_documents({
        "status": "ESCALATED"
    })

    rejected = complaints_collection.count_documents({
        "status": "REJECTED"
    })

    critical = complaints_collection.count_documents({
        "severity": "CRITICAL"
    })

    high = complaints_collection.count_documents({
        "severity": "HIGH"
    })

    medium = complaints_collection.count_documents({
        "severity": "MEDIUM"
    })

    low = complaints_collection.count_documents({
        "severity": "LOW"
    })

    return {
        "total_complaints": total,
        "status": {
            "submitted": submitted,
            "assigned": assigned,
            "in_progress": in_progress,
            "resolved": resolved,
            "escalated": escalated,
            "rejected": rejected
        },
        "severity": {
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low
        }
    }


# --------------------------------------------------
# DASHBOARD ANALYTICS
# --------------------------------------------------

def get_dashboard_analytics():
    """
    Get category, department and severity analytics
    for the officer dashboard.
    """

    # Category-wise complaints
    category_pipeline = [
        {
            "$group": {
                "_id": "$category",
                "count": {"$sum": 1}
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ]

    category_results = list(
        complaints_collection.aggregate(category_pipeline)
    )

    category_wise = [
        {
            "category": item["_id"],
            "count": item["count"]
        }
        for item in category_results
    ]

    # Department-wise complaints
    department_pipeline = [
        {
            "$group": {
                "_id": "$department",
                "count": {"$sum": 1}
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ]

    department_results = list(
        complaints_collection.aggregate(department_pipeline)
    )

    department_wise = [
        {
            "department": item["_id"],
            "count": item["count"]
        }
        for item in department_results
    ]

    # Severity-wise complaints
    severity_pipeline = [
        {
            "$group": {
                "_id": "$severity",
                "count": {"$sum": 1}
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ]

    severity_results = list(
        complaints_collection.aggregate(severity_pipeline)
    )

    severity_wise = [
        {
            "severity": item["_id"],
            "count": item["count"]
        }
        for item in severity_results
    ]

    # Status-wise complaints
    status_pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        },
        {
            "$sort": {
                "count": -1
            }
        }
    ]

    status_results = list(
        complaints_collection.aggregate(status_pipeline)
    )

    status_wise = [
        {
            "status": item["_id"],
            "count": item["count"]
        }
        for item in status_results
    ]

    return {
        "category_wise": category_wise,
        "department_wise": department_wise,
        "severity_wise": severity_wise,
        "status_wise": status_wise
    }

# --------------------------------------------------
# FILTER AND SEARCH COMPLAINTS
# --------------------------------------------------

def search_complaints(
    status: str = None,
    severity: str = None,
    department: str = None,
    category: str = None,
    priority: str = None,
    search: str = None,
    page: int = 1,
    limit: int = 10
):
    """
    Search, filter and paginate complaints.
    """

    query = {}

    # Status filter
    if status:
        query["status"] = status

    # Severity filter
    if severity:
        query["severity"] = severity

    # Department filter
    if department:
        query["department"] = department

    # Category filter
    if category:
        query["category"] = category

    # Priority filter
    if priority:
        query["priority"] = priority

    # Text search
    if search:
        query["$or"] = [
            {
                "text": {
                    "$regex": search,
                    "$options": "i"
                }
            },
            {
                "category": {
                    "$regex": search,
                    "$options": "i"
                }
            },
            {
                "subcategory": {
                    "$regex": search,
                    "$options": "i"
                }
            },
            {
                "complaint_id": {
                    "$regex": search,
                    "$options": "i"
                }
            }
        ]

    # Count total matching complaints
    total = complaints_collection.count_documents(query)

    # Pagination
    skip = (page - 1) * limit

    complaints = list(
        complaints_collection.find(
            query,
            {"_id": 0}
        )
        .skip(skip)
        .limit(limit)
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "count": len(complaints),
        "complaints": complaints
    }

# --------------------------------------------------
# UPDATE SLA STATUS
# --------------------------------------------------

def update_sla_status(
    complaint_id: str,
    sla_status: str,
    escalation_required: bool = False
):
    """
    Update SLA status and escalation state.
    """

    update_data = {
        "sla_status": sla_status,
        "escalation_required": escalation_required,
        "updated_at": datetime.utcnow()
    }

    if escalation_required:
        update_data["escalated_at"] = datetime.utcnow()

    result = complaints_collection.update_one(
        {
            "complaint_id": complaint_id
        },
        {
            "$set": update_data
        }
    )

    return result.modified_count

# --------------------------------------------------
# CHECK AND PROCESS SLA
# --------------------------------------------------

def process_sla_for_complaint(
    complaint: dict
):
    """
    Check SLA status and automatically escalate
    the complaint if its SLA has been breached.
    """

    from app.sla import get_sla_status

    created_at = complaint.get("created_at")
    sla_deadline = complaint.get("sla_deadline")

    if not created_at or not sla_deadline:
        return None

    # MongoDB may return datetime objects directly.
    current_time = datetime.utcnow()

    sla_status = get_sla_status(
        sla_deadline,
        created_at,
        current_time
    )

    escalation_required = (
        sla_status == "SLA_BREACHED"
    )

    update_data = {
        "sla_status": sla_status,
        "escalation_required": escalation_required,
        "updated_at": current_time
    }

    if escalation_required:
        update_data["status"] = "ESCALATED"

        if not complaint.get("escalated_at"):
            update_data["escalated_at"] = current_time

    complaints_collection.update_one(
        {
            "complaint_id": complaint["complaint_id"]
        },
        {
            "$set": update_data
        }
    )

    return {
        "complaint_id": complaint["complaint_id"],
        "sla_status": sla_status,
        "escalation_required": escalation_required
    }

# --------------------------------------------------
# UPDATE COMPLAINT LOCATION
# --------------------------------------------------

def update_complaint_location(
    complaint_id: str,
    latitude: float,
    longitude: float,
    location_name: str = None
):
    """
    Update the geographical location of a complaint.
    """

    result = complaints_collection.update_one(
        {
            "complaint_id": complaint_id
        },
        {
            "$set": {
                "latitude": latitude,
                "longitude": longitude,
                "location_name": location_name,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return result.modified_count

# --------------------------------------------------
# GET COMPLAINTS FOR MAP
# --------------------------------------------------

def get_map_complaints(
    status: str = None,
    severity: str = None,
    department: str = None
):
    """
    Get complaints that have valid geographical coordinates.
    """

    query = {
        "latitude": {
            "$exists": True,
            "$ne": None
        },
        "longitude": {
            "$exists": True,
            "$ne": None
        }
    }

    if status:
        query["status"] = status

    if severity:
        query["severity"] = severity

    if department:
        query["department"] = department

    complaints = list(
        complaints_collection.find(
            query,
            {
                "_id": 0,
                "complaint_id": 1,
                "text": 1,
                "category": 1,
                "subcategory": 1,
                "severity": 1,
                "department": 1,
                "priority": 1,
                "status": 1,
                "sla_status": 1,
                "escalation_required": 1,
                "latitude": 1,
                "longitude": 1,
                "location_name": 1,
                "created_at": 1
            }
        )
    )

    return complaints

# ==================================================
# STATUS HISTORY
# ==================================================

def add_status_history(
    complaint_id: str,
    old_status: str,
    new_status: str
):
    """
    Add a status change entry to the complaint history.
    """

    history_entry = {
        "old_status": old_status,
        "new_status": new_status,
        "changed_at": datetime.utcnow()
    }

    result = complaints_collection.update_one(
        {
            "complaint_id": complaint_id
        },
        {
            "$push": {
                "status_history": history_entry
            },
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
    )

    return result.modified_count

def get_status_history(
    complaint_id: str
):
    """
    Get the status history of a complaint.
    """

    complaint = complaints_collection.find_one(
        {
            "complaint_id": complaint_id
        },
        {
            "_id": 0,
            "complaint_id": 1,
            "status_history": 1
        }
    )

    if complaint is None:
        return None

    return {
        "complaint_id": complaint_id,
        "status_history": complaint.get(
            "status_history",
            []
        )
    }

    # ==================================================
# MEDIA / EVIDENCE
# ==================================================

def save_evidence(
    complaint_id: str,
    evidence: dict
):
    """
    Save evidence metadata against a complaint.
    """

    result = complaints_collection.update_one(
        {
            "complaint_id": complaint_id
        },
        {
            "$push": {
                "evidence": evidence
            },
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
    )

    return result.modified_count


# ==================================================
# GET COMPLAINT EVIDENCE
# ==================================================

def get_complaint_evidence(
    complaint_id: str
):
    """
    Get all evidence attached to a complaint.
    """

    complaint = complaints_collection.find_one(
        {
            "complaint_id": complaint_id
        },
        {
            "_id": 0,
            "complaint_id": 1,
            "evidence": 1
        }
    )

    if complaint is None:
        return None

    return {
        "complaint_id": complaint_id,
        "evidence": complaint.get(
            "evidence",
            []
        )
    }


# ==================================================
# DELETE EVIDENCE METADATA
# ==================================================

def delete_evidence_metadata(
    complaint_id: str,
    evidence_id: str
):
    """
    Remove evidence metadata from MongoDB.
    """

    result = complaints_collection.update_one(
        {
            "complaint_id": complaint_id
        },
        {
            "$pull": {
                "evidence": {
                    "evidence_id": evidence_id
                }
            },
            "$set": {
                "updated_at": datetime.utcnow()
            }
        }
    )

    return result.modified_count