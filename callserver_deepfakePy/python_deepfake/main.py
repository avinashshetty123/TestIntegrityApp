from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image
import torch
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Deepfake Detection API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model
try:
    model_name = "prithivMLmods/deepfake-detector-model-v1"
    logger.info(f"Loading model: {model_name}")
    processor = AutoImageProcessor.from_pretrained(model_name)
    model = SiglipForImageClassification.from_pretrained(model_name)
    id2label = model.config.id2label
    logger.info("Model loaded successfully")
except Exception as e:
    logger.error(f"Failed to load model: {e}")
    raise

@app.get("/")
async def root():
    return {"message": "Deepfake Detection API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post('/predict')
async def predict(file: UploadFile = File(...)):
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        inputs = processor(images=image, return_tensors='pt')
        
        with torch.no_grad():
            outputs = model(**inputs)
            probs = torch.nn.functional.softmax(outputs.logits, dim=1)[0]
            
            result = {
                "real": float(probs[1]),
                "fake": float(probs[0]),
                "label": id2label[torch.argmax(probs).item()],
                "confidence": float(torch.max(probs))
            }
            
        logger.info(f"Prediction result: {result}")
        return result
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))