import os
import asyncio
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
from .storage import analysis_stats, healthy as database_healthy, recent_analyses, save_analysis


app = FastAPI(
    title="Visual Event Analysis API",
    version="2.0.0",
    description=f"{DISCLAIMER}\n\nUploads are processed transiently and are not stored. MongoDB stores only filenames, model outputs, and aggregate metadata.",
)

MAX_IMAGE_BYTES = int(os.getenv("MAX_IMAGE_BYTES", str(10 * 1024 * 1024)))
MAX_VIDEO_BYTES = int(os.getenv("MAX_VIDEO_BYTES", str(100 * 1024 * 1024)))

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
    if origin.strip()
]
allow_all_origins = "*" in allowed_origins
allowed_origin_regex = os.getenv("CORS_ORIGIN_REGEX", r"https://.*\.vercel\.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else allowed_origins,
    allow_origin_regex=None if allow_all_origins else allowed_origin_regex,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    try:
        model_service.load()
        db_ok = database_healthy()
        return HealthResponse(status="ok" if db_ok else "degraded", model_loaded=True, database_connected=db_ok, message="Model is ready." if db_ok else "Model is ready, but analysis history is unavailable.")
    except ModelLoadError as exc:
        return HealthResponse(status="degraded", model_loaded=False, database_connected=database_healthy(), message=str(exc))


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
        image_bytes = await file.read(MAX_IMAGE_BYTES + 1)
        if len(image_bytes) > MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail=f"Image exceeds the {MAX_IMAGE_BYTES // (1024 * 1024)} MB limit.")
        batch = preprocess_image_bytes(image_bytes)
        prediction = model_service.predict(batch)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ModelLoadError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    saved = await _save_analysis_safely({
        "kind": "image",
        "filename": _safe_filename(file.filename, "image"),
        "content_type": file.content_type,
        "size_bytes": len(image_bytes),
        "predicted_class": prediction.predicted_class,
        "confidence": prediction.confidence,
        "raw_probabilities": prediction.raw_probabilities,
        "labels_are_placeholder": model_service.labels_are_placeholder,
    })
    return PredictionResponse(
        predicted_class=prediction.predicted_class,
        confidence=prediction.confidence,
        raw_probabilities=prediction.raw_probabilities,
        labels_are_placeholder=model_service.labels_are_placeholder,
        disclaimer=DISCLAIMER,
        analysis_id=saved.get("id") if saved else None,
        analyzed_at=saved.get("created_at") if saved else None,
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
        video_bytes = await file.read(MAX_VIDEO_BYTES + 1)
        if len(video_bytes) > MAX_VIDEO_BYTES:
            raise HTTPException(status_code=413, detail=f"Video exceeds the {MAX_VIDEO_BYTES // (1024 * 1024)} MB limit.")
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            temp_file.write(video_bytes)
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

    suspicious = [] if model_service.labels_are_placeholder else [
        item for item in predictions
        if item.predicted_class.lower() not in {"normal", "non-crime", "safe"}
    ]
    average_confidence = confidence_total / len(predictions) if predictions else 0.0

    saved = await _save_analysis_safely({
        "kind": "video",
        "filename": _safe_filename(file.filename, "video"),
        "content_type": file.content_type,
        "size_bytes": len(video_bytes),
        "sample_every": sample_every,
        "sampled_frames": len(predictions),
        "average_confidence": round(average_confidence, 6),
        "class_counts": _class_counts(predictions),
        "labels_are_placeholder": model_service.labels_are_placeholder,
    })
    return VideoPredictionResponse(
        sampled_frames=len(predictions),
        suspicious_frames=len(suspicious),
        average_confidence=round(average_confidence, 6),
        frame_predictions=predictions,
        labels_are_placeholder=model_service.labels_are_placeholder,
        disclaimer=DISCLAIMER,
        analysis_id=saved.get("id") if saved else None,
        analyzed_at=saved.get("created_at") if saved else None,
    )


@app.get("/analyses", tags=["History"], summary="List recent analysis metadata")
async def analyses(limit: int = 20, kind: str | None = None):
    if limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="limit must be between 1 and 100.")
    if kind not in {None, "image", "video"}:
        raise HTTPException(status_code=400, detail="kind must be image or video.")
    try:
        return {"analyses": await asyncio.to_thread(recent_analyses, limit, kind)}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Analysis history is unavailable.") from exc


@app.get("/analyses/stats", tags=["History"], summary="Get aggregate analysis counts")
async def stats():
    try:
        return await asyncio.to_thread(analysis_stats)
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Analysis statistics are unavailable.") from exc


async def _save_analysis_safely(record: dict):
    try:
        return await asyncio.to_thread(save_analysis, record)
    except Exception:
        return None


def _safe_filename(filename: str | None, fallback: str) -> str:
    return Path(filename or fallback).name[:180]


def _class_counts(predictions: list[VideoFramePrediction]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for prediction in predictions:
        counts[prediction.predicted_class] = counts.get(prediction.predicted_class, 0) + 1
    return counts
