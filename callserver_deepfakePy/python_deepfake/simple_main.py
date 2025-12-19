from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image
import torch
import io
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deepfake Detection API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model once
MODEL_NAME = "prithivMLmods/deepfake-detector-model-v1"
logger.info("Loading model...")

processor = AutoImageProcessor.from_pretrained(MODEL_NAME)
model = SiglipForImageClassification.from_pretrained(MODEL_NAME)
model.eval()

id2label = model.config.id2label
logger.info("Model loaded successfully")

@app.get("/")
def root():
    return {"message": "Deepfake Detection API running"}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if not file or not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        inputs = processor(images=image, return_tensors="pt")

        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.softmax(outputs.logits, dim=1)[0]

        result = {
            "fake": float(probs[0]),
            "real": float(probs[1]),
            "label": id2label[int(torch.argmax(probs))],
            "confidence": float(torch.max(probs))
        }

        return result

    except Exception as e:
        logger.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=str(e))
