from app.vision_engine import detect_objects, vision_to_complaint
from app.complaint_engine import classify_complaint

image_path = r"C:\Users\hetik\SIH\SIH_Prototype\backend\testpic.jpeg"

# Step 1: YOLO detection
detections = detect_objects(image_path)

print("YOLO Detection:")
print(detections)

# Step 2: Convert detection into complaint text
complaint_text = vision_to_complaint(detections)

print("\nGenerated Complaint Text:")
print(complaint_text)

# Step 3: Send to Complaint Engine
result = classify_complaint(complaint_text)

print("\nComplaint Engine Result:")
print(result)