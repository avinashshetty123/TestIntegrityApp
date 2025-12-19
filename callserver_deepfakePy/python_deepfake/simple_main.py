from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

@app.post("/detect-deepfake")
def detect_deepfake(data: dict):
    return {"is_deepfake": False, "confidence": 0.95}