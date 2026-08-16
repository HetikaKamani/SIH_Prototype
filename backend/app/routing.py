DEPARTMENT_CONTACTS = {
    "OBHS": {
        "department": "On Board Housekeeping Services",
        "priority": "MEDIUM",
        "sla": "24 hours",
        "escalation": False
    },

    "Electrical/Maintenance": {
        "department": "Electrical/Maintenance",
        "priority": "HIGH",
        "sla": "6 hours",
        "escalation": False
    },

    "Coaching Depot": {
        "department": "Coaching Depot",
        "priority": "MEDIUM",
        "sla": "24 hours",
        "escalation": False
    },

    "Electrical Department": {
        "department": "Electrical Department",
        "priority": "HIGH",
        "sla": "6 hours",
        "escalation": False
    },

    "RPF": {
        "department": "Railway Protection Force",
        "priority": "CRITICAL",
        "sla": "Immediate",
        "escalation": True
    },

    "Medical Unit": {
        "department": "Medical Unit",
        "priority": "CRITICAL",
        "sla": "Immediate",
        "escalation": True
    },

    "Manual Review": {
        "department": "Manual Review",
        "priority": "LOW",
        "sla": "48 hours",
        "escalation": False
    }
}


def route_complaint(classification: dict) -> dict:
    """
    Route a classified complaint to the appropriate department.
    """

    department = classification.get(
        "department",
        "Manual Review"
    )

    route = DEPARTMENT_CONTACTS.get(
        department,
        DEPARTMENT_CONTACTS["Manual Review"]
    )

    return {
        "department": route["department"],
        "priority": route["priority"],
        "sla": route["sla"],
        "escalation_required": route["escalation"]
    }