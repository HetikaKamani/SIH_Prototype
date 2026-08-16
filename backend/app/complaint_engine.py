import re


COMPLAINT_RULES = {
    "cleanliness": {
        "keywords": [
            "dirty",
            "garbage",
            "trash",
            "unclean",
            "toilet",
            "kachra",
            "ganda",
            "safai",
            "bad smell"
        ],
        "category": "Cleanliness",
        "subcategory": "General Cleanliness",
        "department": "OBHS",
        "severity": "MEDIUM"
    },

"ac_leakage": {
    "keywords": [
        "ac leakage",
        "ac leak",
        "ac leaking",
        "ac is leaking",
        "water leakage",
        "water leaking",
        "water is leaking",
        "water dripping",
        "water is dripping",
        "leaking from the ac",
        "leaking water from ac",
        "water leaking from ac",
        "ac se paani",
        "ac se pani",
        "paani gir",
        "pani gir",
        "ac problem"
    ],
    "category": "Coach Maintenance",
    "subcategory": "AC Water Leakage",
    "department": "Electrical/Maintenance",
    "severity": "HIGH"
},

    "broken_seat": {
        "keywords": [
            "broken seat",
            "seat broken",
            "seat damaged",
            "tooti seat",
            "seat is broken",
            "seat is damaged",
            "seat toot",
            "seat damage"
        ],
        "category": "Coach Maintenance",
        "subcategory": "Broken Seat",
        "department": "Coaching Depot",
        "severity": "MEDIUM"
    },

    "electrical": {
        "keywords": [
            "light",
            "light not working",
            "light nahi",
            "light nahi chal",
            "fan",
            "fan not working",
            "fan nahi",
            "electricity",
            "power",
            "bulb",
            "bulb kharab"
        ],
        "category": "Electrical",
        "subcategory": "Electrical Failure",
        "department": "Electrical Department",
        "severity": "HIGH"
    },

    "security": {
        "keywords": [
            "theft",
            "stolen",
            "robbery",
            "harassment",
            "fight",
            "threat",
            "chori",
            "chura",
            "chor",
            "stole",
            "bag chori",
            "bag chura",
            "bag stolen"
        ],
        "category": "Security",
        "subcategory": "Security Incident",
        "department": "RPF",
        "severity": "CRITICAL"
    },

    "medical": {
        "keywords": [
            "medical",
            "injury",
            "injured",
            "bleeding",
            "unconscious",
            "emergency",
            "doctor",
            "ambulance",
            "tabiyat kharab",
            "behosh",
            "chot lagi"
        ],
        "category": "Medical",
        "subcategory": "Medical Emergency",
        "department": "Medical Unit",
        "severity": "CRITICAL"
    }
}


def normalize_text(text: str) -> str:
    """Normalize complaint text for matching."""

    text = text.lower().strip()

    # Remove unnecessary punctuation
    text = re.sub(r"[^\w\s]", " ", text)

    # Remove extra spaces
    text = re.sub(r"\s+", " ", text)

    return text


def keyword_matches(text: str, keyword: str) -> bool:
    """
    Match keywords safely.

    Multi-word phrases use substring matching.
    Single words use word-boundary matching so that
    'ac' does not accidentally match 'coach'.
    """

    keyword = keyword.lower().strip()

    if " " in keyword:
        return keyword in text

    return bool(re.search(rf"\b{re.escape(keyword)}\b", text))


def classify_complaint(text: str) -> dict:
    """
    Classify a passenger complaint.

    Returns:
        category
        subcategory
        severity
        confidence
        department
    """

    text = normalize_text(text)

    if not text:
        return {
            "category": "Unknown",
            "subcategory": "Unknown",
            "severity": "LOW",
            "confidence": 0.0,
            "department": "Manual Review"
        }

    best_match = None
    best_score = 0

    for rule in COMPLAINT_RULES.values():

        score = sum(
            keyword_matches(text, keyword)
            for keyword in rule["keywords"]
        )

        if score > best_score:
            best_score = score
            best_match = rule

    if best_match is None:

        return {
            "category": "Unknown",
            "subcategory": "Unclassified Complaint",
            "severity": "LOW",
            "confidence": 0.30,
            "department": "Manual Review"
        }

    # Prototype confidence calculation
    confidence = min(
        0.70 + (best_score * 0.08),
        0.98
    )

    return {
        "category": best_match["category"],
        "subcategory": best_match["subcategory"],
        "severity": best_match["severity"],
        "confidence": round(confidence, 2),
        "department": best_match["department"]
    }
def vision_to_complaint(detections):
    """
    Convert YOLO detections into text for the complaint engine.
    """

    if not detections:
        return ""

    return " ".join(
        detection["class_name"].replace("_", " ")
        for detection in detections
    )