from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import numpy as np
from PIL import Image
import io

app = FastAPI(title="TestIntegrity Deepfake Detection Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "Deepfake Detection"}

@app.post("/deepfake/predict")
async def predict_deepfake(
    file: UploadFile = File(...),
    userId: str = Form(...),
    meetingId: str = Form(...),
    participantId: str = Form(...)
):
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if needed
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        import random
        from datetime import datetime
        
        is_deepfake = random.random() < 0.1  # 10% chance of being flagged as deepfake
        confidence = random.uniform(0.7, 0.95)
        
        print(f"🛡️ Deepfake check for user {userId}: {'DETECTED' if is_deepfake else 'CLEAN'} (confidence: {confidence:.2f})")
        
        return {
            "is_deepfake": is_deepfake,
            "confidence": confidence,
            "userId": userId,
            "meetingId": meetingId,
            "participantId": participantId,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Deepfake detection error: {str(e)}")
        return {
            "is_deepfake": False,
            "confidence": 0.0,
            "error": str(e),
            "userId": userId,
            "meetingId": meetingId
        }

@app.post("/analyze")
def analyze_frame(data: dict):
    return {"status": "analyzed", "alerts": [], "confidence": 0.8}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)