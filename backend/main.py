import os
import re
from contextlib import asynccontextmanager
from typing import Optional

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForSequenceClassification, AutoTokenizer

# Ruta al modelo BERT/BETO entrenado (puede sobreescribirse con BETO_MODEL_PATH)
MODEL_PATH = os.environ.get("BETO_MODEL_PATH", "./IA_dataset/beto-phishing-final")
PHISHING_LABEL_IDX = int(os.environ.get("PHISHING_LABEL_IDX", "1"))
INPUT_TEMPLATE = os.environ.get(
    "BETO_INPUT_TEMPLATE",
    "Asunto: {subject} | Cuerpo: {body} | URLs: {url_count}",
)

URL_REGEX = re.compile(
    r"(https?://[^\s<>\"{}|\\^`\[\]]+|\bwww\.[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+(?:/[^\s<>\"{}|\\^`\[\]]*)?)",
    re.IGNORECASE,
)

device = "cuda" if torch.cuda.is_available() else "cpu"
tokenizer = None
model = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global tokenizer, model
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"No se encontró la carpeta del modelo entrenado en: {MODEL_PATH}. "
            "Coloca la carpeta IA_dataset/beto-phishing-final junto al proyecto o define BETO_MODEL_PATH."
        )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH).to(device)
    model.eval()
    yield


app = FastAPI(title="Backend FastAPI - Detector de Phishing BETO", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    subject: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)
    url_count: Optional[int] = None
    text: Optional[str] = None


class PredictResponse(BaseModel):
    is_phishing: bool
    label: str
    prediction: int
    raw_label: str
    confidence: float
    url_count: int


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_path": MODEL_PATH,
        "device": device,
        "loaded": model is not None and tokenizer is not None,
    }


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="El modelo BETO aún no está cargado.")

    detected_url_count = (
        req.url_count
        if req.url_count is not None
        else len(URL_REGEX.findall(f"{req.subject}\n{req.body}"))
    )

    formatted_text = (
        req.text
        if req.text
        else INPUT_TEMPLATE.format(
            subject=req.subject.strip(),
            body=req.body.strip(),
            url_count=detected_url_count,
        )
    )

    inputs = tokenizer(
        formatted_text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512,
    ).to(device)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)[0].cpu().tolist()

    pred_idx = int(torch.argmax(outputs.logits, dim=-1).item())
    confidence = float(probs[pred_idx])
    raw_label = str(model.config.id2label.get(pred_idx, f"LABEL_{pred_idx}"))
    is_phishing = pred_idx == PHISHING_LABEL_IDX

    return PredictResponse(
        is_phishing=is_phishing,
        label="phishing" if is_phishing else "seguro",
        prediction=pred_idx,
        raw_label=raw_label,
        confidence=round(confidence, 4),
        url_count=detected_url_count,
    )
