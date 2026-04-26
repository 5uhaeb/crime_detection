import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .model_loader import DISCLAIMER, ModelLoadError, model_service
from .schemas import (
    HealthResponse,
    ModelInfoResponse,
    PredictionResponse,
    VideoFramePrediction,
    VideoPredictionResponse,
)
from .utils import preprocess_image_bytes, preprocess_rgb_array


app = FastAPI(
    title="Crime Detection AI API",
    version="1.0.0",
    description=DISCLAIMER,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
allow_all_origins = "*" in allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        model_service.load()
        return HealthResponse(status="ok", model_loaded=True, message="Backend and model are ready.")
    except ModelLoadError as exc:
        return HealthResponse(status="degraded", model_loaded=False, message=str(exc))


@app.get("/model/info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    try:
        return ModelInfoResponse(**model_service.info())
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.post("/predict", response_model=PredictionResponse)
async def predict(file: UploadFile = File(...)) -> PredictionResponse:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Upload an image file.")

    try:
        batch = preprocess_image_bytes(await file.read())
        prediction = model_service.predict(batch)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return PredictionResponse(
        predicted_class=prediction.predicted_class,
        confidence=prediction.confidence,
        raw_probabilities=prediction.raw_probabilities,
        labels_are_placeholder=model_service.labels_are_placeholder,
        disclaimer=DISCLAIMER,
    )


@app.post("/predict-video", response_model=VideoPredictionResponse)
async def predict_video(file: UploadFile = File(...), sample_every: int = 30) -> VideoPredictionResponse:
    try:
        import cv2
    except ImportError as exc:
        raise HTTPException(
            status_code=503,
            detail="Video prediction requires opencv-python-headless. Install backend requirements or use Docker.",
        ) from exc

    if sample_every < 1:
        raise HTTPException(status_code=400, detail="sample_every must be 1 or greater.")
    if not file.content_type or not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="Upload a video file.")

    suffix = Path(file.filename or "upload.mp4").suffix or ".mp4"
    temp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(await file.read())
            temp_path = temp_file.name

        capture = cv2.VideoCapture(temp_path)
        if not capture.isOpened():
            raise HTTPException(status_code=400, detail="Could not read the uploaded video.")

        fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        frame_index = 0
        predictions: list[VideoFramePrediction] = []
        confidence_total = 0.0

        while True:
            ok, frame = capture.read()
            if not ok:
                break

            if frame_index % sample_every == 0:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                prediction = model_service.predict(preprocess_rgb_array(rgb_frame))
                confidence_total += prediction.confidence
                predictions.append(
                    VideoFramePrediction(
                        frame_index=frame_index,
                        timestamp_seconds=round(frame_index / fps, 3),
                        predicted_class=prediction.predicted_class,
                        confidence=prediction.confidence,
                    )
                )

            frame_index += 1

        capture.release()
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink(missing_ok=True)

    suspicious = [
        item
        for item in predictions
        if item.predicted_class.lower() not in {"normal", "non-crime", "safe", "class_0"}
    ]
    average_confidence = confidence_total / len(predictions) if predictions else 0.0

    return VideoPredictionResponse(
        sampled_frames=len(predictions),
        suspicious_frames=len(suspicious),
        average_confidence=round(average_confidence, 6),
        frame_predictions=predictions,
        labels_are_placeholder=model_service.labels_are_placeholder,
        disclaimer=DISCLAIMER,
    )
