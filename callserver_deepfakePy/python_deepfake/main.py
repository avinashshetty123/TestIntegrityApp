from fastapi import FastAPI,UploadFile,File
from transformers import AutoImageProcessor, SiglipForImageClassification
from PIL import Image
import torch
import io;
app=FastAPI();
model_name="prithivMLmods/deepfake-detector-model-v1";
processor=AutoImageProcessor.from_pretrained(model_name);
model=SiglipForImageClassification.from_pretrained(model_name);
id2label=model.config.id2label;
@app.post('/predict')
async def predict(file:UploadFile=File(...)):
    contents=await file.read()
    image=Image.open(io.BytesIO(contents).convert("RGB"))
    inputs=processor(images=image,return_tensors='pt')
    with torch.no_grad():
        outputs=model(**inputs)
        probs=torch.nn.functional.softmax(outputs.logits,dim=1)[0]
        result={
            "real":float(probs[1]),
            "fake":float(probs[0]),
            "label":id2label[torch.argmax(probs).item()]
        }
        return result