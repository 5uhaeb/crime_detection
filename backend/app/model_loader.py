import json
import os
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np

from .utils import normalize_probabilities


DISCLAIMER = (
    "This model is for educational/prototype use only and should not be used "
    "as the sole basis for safety, law enforcement, or emergency decisions."
)


class ModelLoadError(RuntimeError):
    pass


@dataclass
class Prediction:
    predicted_class: str
    confidence: float
    raw_probabilities: dict[str, float]


class CrimeModelService:
    def __init__(self) -> None:
        default_model_dir = Path(__file__).resolve().parents[2]
        self.model_dir = Path(os.getenv("MODEL_DIR", default_model_dir)).resolve()
        self.config_path = self.model_dir / "config.json"
        self.weights_path = self.model_dir / "model.weights.h5"
        self.metadata_path = self.model_dir / "metadata.json"
        self.labels_path = self.model_dir / "labels.json"
        self._model: Any | None = None
        self._labels: list[str] = []
        self._labels_are_placeholder = True
        self._metadata: dict[str, Any] = {}
        self._lock = Lock()

    @property
    def loaded(self) -> bool:
        return self._model is not None

    @property
    def labels(self) -> list[str]:
        return self._labels

    @property
    def labels_are_placeholder(self) -> bool:
        return self._labels_are_placeholder

    def load(self) -> None:
        with self._lock:
            if self._model is not None:
                return

            self._ensure_required_files()
            self._metadata = self._read_json(self.metadata_path, default={})
            self._labels, self._labels_are_placeholder = self._load_labels()

            try:
                import keras

                config_text = self.config_path.read_text(encoding="utf-8")
                try:
                    model = keras.models.model_from_json(config_text)
                except Exception:
                    # Keras 3 configs saved from the native serializer may need
                    # the lower-level deserializer when model_from_json cannot
                    # resolve nested objects from the JSON string.
                    config = json.loads(config_text)
                    model = keras.saving.deserialize_keras_object(config)

                model.load_weights(str(self.weights_path))
                self._model = model
            except ImportError as exc:
                raise ModelLoadError(
                    "TensorFlow/Keras is not installed. Install backend requirements "
                    "with Python 3.10-3.12, or run the Docker backend image."
                ) from exc
            except Exception as exc:
                raise ModelLoadError(
                    "Failed to load config.json with model.weights.h5. Confirm both "
                    "files came from the same Keras model export."
                ) from exc

            self._align_labels_to_output()

    def info(self) -> dict[str, Any]:
        if self._model is None:
            self.load()

        return {
            "name": getattr(self._model, "name", None),
            "input_shape": self._shape_to_list(getattr(self._model, "input_shape", None)),
            "output_shape": self._shape_to_list(getattr(self._model, "output_shape", None)),
            "labels": self._labels,
            "labels_are_placeholder": self._labels_are_placeholder,
            "keras_version_saved": self._metadata.get("keras_version"),
            "model_dir": str(self.model_dir),
        }

    def predict(self, batch: np.ndarray) -> Prediction:
        if self._model is None:
            self.load()

        raw = self._model.predict(batch, verbose=0)
        probabilities = normalize_probabilities(raw)
        self._align_labels_to_count(len(probabilities))

        index = int(np.argmax(probabilities))
        raw_probabilities = {
            self._labels[i]: round(float(probabilities[i]), 6)
            for i in range(len(probabilities))
        }
        return Prediction(
            predicted_class=self._labels[index],
            confidence=round(float(probabilities[index]), 6),
            raw_probabilities=raw_probabilities,
        )

    def _ensure_required_files(self) -> None:
        missing = [
            str(path)
            for path in (self.config_path, self.weights_path)
            if not path.exists()
        ]
        if missing:
            raise ModelLoadError("Missing required model file(s): " + ", ".join(missing))

    def _read_json(self, path: Path, default: Any) -> Any:
        if not path.exists():
            return default
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise ModelLoadError(f"{path.name} is not valid JSON.") from exc

    def _load_labels(self) -> tuple[list[str], bool]:
        if not self.labels_path.exists():
            return ["class_0", "class_1", "class_2"], True

        data = self._read_json(self.labels_path, default=[])
        if isinstance(data, dict):
            labels = data.get("labels", [])
            placeholder = bool(data.get("placeholder", False))
        else:
            labels = data
            placeholder = False

        if not labels or not all(isinstance(label, str) for label in labels):
            raise ModelLoadError("labels.json must contain a string list or {'labels': [...]} object.")
        return labels, placeholder

    def _align_labels_to_output(self) -> None:
        output_shape = getattr(self._model, "output_shape", None)
        output_count = output_shape[-1] if output_shape else len(self._labels)
        self._align_labels_to_count(int(output_count))

    def _align_labels_to_count(self, count: int) -> None:
        if len(self._labels) == count:
            return
        self._labels = [f"class_{index}" for index in range(count)]
        self._labels_are_placeholder = True

    def _shape_to_list(self, shape: Any) -> list[Any] | None:
        if shape is None:
            return None
        return list(shape)


model_service = CrimeModelService()
