from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError


INPUT_SIZE = (96, 96)


def preprocess_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Convert an uploaded image into the 4D tensor expected by the model."""
    try:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
    except UnidentifiedImageError as exc:
        raise ValueError("The uploaded file is not a readable image.") from exc

    image = image.resize(INPUT_SIZE)
    array = np.asarray(image, dtype=np.float32) / 255.0
    return np.expand_dims(array, axis=0)


def preprocess_rgb_array(frame: np.ndarray) -> np.ndarray:
    image = Image.fromarray(frame.astype("uint8"), mode="RGB").resize(INPUT_SIZE)
    array = np.asarray(image, dtype=np.float32) / 255.0
    return np.expand_dims(array, axis=0)


def normalize_probabilities(prediction: np.ndarray) -> np.ndarray:
    values = np.asarray(prediction).reshape(-1).astype(float)
    if values.size == 1:
        positive = float(values[0])
        return np.asarray([1.0 - positive, positive], dtype=float)

    total = float(values.sum())
    if total > 0 and not np.isclose(total, 1.0):
        values = values / total
    return values
