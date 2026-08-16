from datetime import datetime, timedelta


# --------------------------------------------------
# SLA CONFIGURATION
# --------------------------------------------------

SLA_HOURS = {
    "CRITICAL": 1,
    "HIGH": 6,
    "MEDIUM": 24,
    "LOW": 48
}


# --------------------------------------------------
# GET SLA HOURS
# --------------------------------------------------

def get_sla_hours(severity: str) -> int:
    """
    Return SLA duration in hours based on severity.
    """

    return SLA_HOURS.get(
        severity.upper(),
        48
    )


# --------------------------------------------------
# CALCULATE SLA DEADLINE
# --------------------------------------------------

def calculate_sla_deadline(
    severity: str,
    created_at: datetime
) -> datetime:
    """
    Calculate the SLA deadline for a complaint.
    """

    sla_hours = get_sla_hours(severity)

    return created_at + timedelta(
        hours=sla_hours
    )


# --------------------------------------------------
# GET SLA STATUS
# --------------------------------------------------

def get_sla_status(
    sla_deadline: datetime,
    created_at: datetime,
    current_time: datetime = None
) -> str:
    """
    Determine the current SLA status.
    """

    if current_time is None:
        current_time = datetime.utcnow()

    if current_time >= sla_deadline:
        return "SLA_BREACHED"

    total_duration = (
        sla_deadline - created_at
    ).total_seconds()

    remaining_duration = (
        sla_deadline - current_time
    ).total_seconds()

    if total_duration <= 0:
        return "SLA_BREACHED"

    remaining_ratio = (
        remaining_duration / total_duration
    )

    if remaining_ratio <= 0.20:
        return "APPROACHING_DEADLINE"

    return "WITHIN_SLA"


# --------------------------------------------------
# COMPLETE SLA INFORMATION
# --------------------------------------------------

def calculate_sla_info(
    severity: str,
    created_at: datetime
) -> dict:
    """
    Generate complete SLA information.
    """

    sla_hours = get_sla_hours(severity)

    sla_deadline = calculate_sla_deadline(
        severity,
        created_at
    )

    return {
        "sla_hours": sla_hours,
        "sla_deadline": sla_deadline,
        "sla_status": get_sla_status(
            sla_deadline,
            created_at
        )
    }