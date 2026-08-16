from app.complaint_engine import classify_complaint


test_complaints = [
    "B3 coach mein AC se paani gir raha hai",
    "S4 ka toilet bahut dirty hai",
    "Coach mein light nahi chal rahi",
    "Kisi ne mera bag chura liya",
    "Passenger ko medical emergency hai"
]


for complaint in test_complaints:
    result = classify_complaint(complaint)

    print("\nComplaint:", complaint)
    print("Result:", result)