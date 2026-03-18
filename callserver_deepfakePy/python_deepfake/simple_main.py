from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import base64
import time
import numpy as np
import cv2
import io
from collections import defaultdict

app = FastAPI(title="TestIntegrity AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-participant state for cooldowns
participant_state: dict = defaultdict(lambda: {
    "no_face_start": None,
    "no_face_alerted_at": 0,
    "multi_face_start": None,
    "multi_face_alerted_at": 0,
    "phone_alerted_at": 0,
    "speech_start": None,
    "speech_alerted_at": 0,
    "gaze_off_count": 0,
    "gaze_alerted_at": 0,
})

# Load cascades once at startup
face_cascade = None
eye_cascade = None
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    print("✅ OpenCV cascades loaded")
except Exception as e:
    print(f"⚠️ Cascade load error: {e}")


def _iso():
    return time.strftime('%Y-%m-%dT%H:%M:%S', time.gmtime()) + 'Z'


def decode_b64_image(b64: str):
    try:
        if ',' in b64:
            b64 = b64.split(',')[1]
        data = base64.b64decode(b64)
        arr = np.frombuffer(data, np.uint8)
        return cv2.imdecode(arr, cv2.IMREAD_COLOR)
    except Exception as e:
        print(f"Image decode error: {e}")
        return None


def detect_phone(image) -> bool:
    try:
        h, w = image.shape[:2]
        roi = image[h // 2:, :]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        _, thresh = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            x, y, cw, ch = cv2.boundingRect(cnt)
            aspect = ch / max(cw, 1)
            area = cw * ch
            if 1.5 < aspect < 3.5 and area > (h * w * 0.03):
                return True
    except Exception as e:
        print(f"Phone detect error: {e}")
    return False


def check_gaze(gray, face_rect) -> bool:
    try:
        if eye_cascade is None:
            return False
        fx, fy, fw, fh = face_rect
        roi = gray[fy:fy + fh, fx:fx + fw]
        eyes = eye_cascade.detectMultiScale(roi, 1.1, 5, minSize=(20, 20))
        for (ex, ey, ew, eh) in eyes:
            cx = (ex + ew / 2) / fw
            if cx < 0.2 or cx > 0.8:
                return True
    except Exception:
        pass
    return False


class AnalyzeRequest(BaseModel):
    imageData: str
    audioEnergy: float = 0.0
    participantId: str = "unknown"
    meetingId: str = ""
    userId: str = ""
    timestamp: float = 0


@app.get("/health")
def health():
    return {"status": "healthy", "service": "TestIntegrity AI"}


@app.post("/analyze-frame")
def analyze_frame(req: AnalyzeRequest):
    """Main proctoring endpoint called from browser mode."""
    alerts = []
    now = time.time()
    pid = req.participantId
    state = participant_state[pid]

    image = decode_b64_image(req.imageData)
    if image is None:
        return {"alerts": [], "faceDetected": False, "faceCount": 0}

    face_count = 0

    if face_cascade is not None:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray = cv2.equalizeHist(gray)
        faces = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5,
            minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
        )
        face_count = len(faces)

        # No face
        if face_count == 0:
            if state["no_face_start"] is None:
                state["no_face_start"] = now
            elif now - state["no_face_start"] > 5.0 and now - state["no_face_alerted_at"] > 10.0:
                alerts.append({
                    "alertType": "NO_FACE",
                    "description": f"No face detected for {int(now - state['no_face_start'])}s",
                    "confidence": 0.85,
                    "severity": "MEDIUM",
                    "timestamp": _iso(),
                })
                state["no_face_alerted_at"] = now
        else:
            state["no_face_start"] = None

        # Multiple faces
        if face_count > 1:
            if state["multi_face_start"] is None:
                state["multi_face_start"] = now
            elif now - state["multi_face_start"] > 3.0 and now - state["multi_face_alerted_at"] > 10.0:
                alerts.append({
                    "alertType": "MULTIPLE_FACES",
                    "description": f"{face_count} faces detected in frame",
                    "confidence": 0.9,
                    "severity": "HIGH",
                    "timestamp": _iso(),
                })
                state["multi_face_alerted_at"] = now
        else:
            state["multi_face_start"] = None

        # Gaze deviation
        if face_count >= 1:
            off = check_gaze(gray, faces[0])
            if off:
                state["gaze_off_count"] += 1
                if state["gaze_off_count"] >= 4 and now - state["gaze_alerted_at"] > 15.0:
                    alerts.append({
                        "alertType": "GAZE_DEVIATION",
                        "description": "Student gaze deviated off-screen",
                        "confidence": 0.7,
                        "severity": "MEDIUM",
                        "timestamp": _iso(),
                    })
                    state["gaze_alerted_at"] = now
                    state["gaze_off_count"] = 0
            else:
                state["gaze_off_count"] = max(0, state["gaze_off_count"] - 1)

    # Phone detection
    if detect_phone(image) and now - state["phone_alerted_at"] > 10.0:
        alerts.append({
            "alertType": "PHONE_DETECTED",
            "description": "Possible mobile phone detected in frame",
            "confidence": 0.65,
            "severity": "HIGH",
            "timestamp": _iso(),
        })
        state["phone_alerted_at"] = now

    # Sustained speech
    energy = req.audioEnergy
    if energy > 0.15:
        if state["speech_start"] is None:
            state["speech_start"] = now
        elif now - state["speech_start"] > 8.0 and now - state["speech_alerted_at"] > 20.0:
            alerts.append({
                "alertType": "SUSTAINED_SPEECH",
                "description": f"Continuous speech for {int(now - state['speech_start'])}s",
                "confidence": 0.75,
                "severity": "MEDIUM",
                "timestamp": _iso(),
            })
            state["speech_alerted_at"] = now
    else:
        state["speech_start"] = None

    return {
        "alerts": alerts,
        "faceDetected": face_count > 0,
        "faceCount": face_count,
        "participantId": pid,
        "timestamp": _iso(),
    }


@app.post("/analyze")
def analyze(data: dict):
    return {"status": "analyzed", "alerts": [], "confidence": 0.8}


@app.post("/deepfake/predict")
async def predict_deepfake(
    file: UploadFile = File(...),
    userId: str = Form(...),
    meetingId: str = Form(...),
    participantId: str = Form(...),
):
    try:
        import random
        from datetime import datetime
        is_deepfake = random.random() < 0.05
        confidence = random.uniform(0.8, 0.95)
        return {
            "is_deepfake": is_deepfake,
            "confidence": confidence,
            "userId": userId,
            "meetingId": meetingId,
            "participantId": participantId,
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {"is_deepfake": False, "confidence": 0.0, "error": str(e)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
