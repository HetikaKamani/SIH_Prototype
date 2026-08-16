import os
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

MODEL_ID = "hetika-kamani/railmadad-2-yolo11n-t1"

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=os.getenv("ROBOFLOW_API_KEY")
)


def detect_objects(image_path: str):
    """
    Run the trained RailMadad YOLO model on an image.
    """

    result = client.infer(
        image_path,
        model_id=MODEL_ID
    )

    detections = []

    for prediction in result.get("predictions", []):
        detections.append({
            "class_name": prediction["class"],
            "confidence": round(prediction["confidence"], 2),
            "x": prediction["x"],
            "y": prediction["y"],
            "width": prediction["width"],
            "height": prediction["height"]
        })

    return detections
def vision_to_complaint(detections):
    """
    Convert YOLO detections into complaint text.
    """

    if not detections:
        return ""

    return " ".join(
        detection["class_name"].replace("_", " ")
        for detection in detections
    )