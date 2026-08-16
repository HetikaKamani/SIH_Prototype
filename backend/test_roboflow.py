import os
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient

load_dotenv()

client = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=os.getenv("ROBOFLOW_API_KEY")
)

result = client.infer(
    "testpic.jpeg",
    model_id="hetika-kamani/railmadad-2-yolo11n-t1"
)

print(result)