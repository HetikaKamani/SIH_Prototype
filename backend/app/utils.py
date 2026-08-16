from datetime import datetime


def generate_complaint_id() -> str:
    """
    Generate a unique RailMadad complaint ID.
    Example: RM-20260816-153045-4821
    """

    now = datetime.now()

    timestamp = now.strftime("%Y%m%d-%H%M%S")

    microseconds = now.microsecond // 100

    return f"RM-{timestamp}-{microseconds:04d}"