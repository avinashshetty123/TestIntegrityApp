from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="TestIntegrity AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "healthy", "service": "TestIntegrity AI"}

@app.post("/analyze")
def analyze_frame(data: dict):
    return {"status": "analyzed", "alerts": [], "confidence": 0.8}

@app.post("/deepfake/predict")
async def predict_deepfake(
    file: UploadFile = File(...),
    userId: str = Form(...),
    meetingId: str = Form(...),
    participantId: str = Form(...)
):
    try:
        # Simple mock detection
        import random
        is_deepfake = random.random() < 0.05  # 5% chance
        confidence = random.uniform(0.8, 0.95)
        
        print(f"🛡️ Deepfake check for user {userId}: {'DETECTED' if is_deepfake else 'CLEAN'} (confidence: {confidence:.2f})")
        
        return {
            "is_deepfake": is_deepfake,
            "confidence": confidence,
            "userId": userId,
            "meetingId": meetingId,
            "participantId": participantId
        }
        
    except Exception as e:
        return {
            "is_deepfake": False,
            "confidence": 0.0,
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)