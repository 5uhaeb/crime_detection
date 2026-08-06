from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    message: str
    database_connected: bool = False


class ModelInfoResponse(BaseModel):
    name: str | None = None
    input_shape: list[Any] | None = None
    output_shape: list[Any] | None = None
    labels: list[str]
    labels_are_placeholder: bool
    keras_version_saved: str | None = None
    model_dir: str


class PredictionResponse(BaseModel):
    predicted_class: str
    confidence: float = Field(ge=0, le=1)
    raw_probabilities: dict[str, float]
    labels_are_placeholder: bool
    disclaimer: str
    analysis_id: str | None = None
    analyzed_at: str | None = None


class VideoFramePrediction(BaseModel):
    frame_index: int
    timestamp_seconds: float
    predicted_class: str
    confidence: float


class VideoPredictionResponse(BaseModel):
    sampled_frames: int
    suspicious_frames: int
    average_confidence: float
    frame_predictions: list[VideoFramePrediction]
    labels_are_placeholder: bool
    disclaimer: str
    analysis_id: str | None = None
    analyzed_at: str | None = None
