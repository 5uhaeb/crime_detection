import numpy as np
import pytest
from PIL import Image
from io import BytesIO

from app.main import _class_counts, _safe_filename
from app.schemas import VideoFramePrediction
from app.utils import normalize_probabilities, preprocess_image_bytes


def test_preprocess_image_has_expected_shape_and_range():
    image = Image.new("RGB", (320, 180), color=(255, 64, 0))
    buffer = BytesIO()
    image.save(buffer, format="PNG")

    batch = preprocess_image_bytes(buffer.getvalue())

    assert batch.shape == (1, 96, 96, 3)
    assert batch.dtype == np.float32
    assert 0 <= batch.min() <= batch.max() <= 1


def test_broken_image_stream_is_rejected_cleanly():
    broken_png = bytes.fromhex("89504e470d0a1a0a0000000d49484452")
    with pytest.raises(ValueError, match="not a readable image"):
        preprocess_image_bytes(broken_png)


def test_normalize_probabilities_handles_logits_and_binary_output():
    assert np.allclose(normalize_probabilities(np.array([2.0, 3.0, 5.0])), [0.2, 0.3, 0.5])
    assert np.allclose(normalize_probabilities(np.array([0.8])), [0.2, 0.8])


def test_filename_is_reduced_to_safe_basename():
    assert _safe_filename("../../private/example.jpg", "image") == "example.jpg"
    assert _safe_filename(None, "image") == "image"


def test_video_class_counts_are_aggregated():
    rows = [
        VideoFramePrediction(frame_index=0, timestamp_seconds=0, predicted_class="class_1", confidence=0.8),
        VideoFramePrediction(frame_index=30, timestamp_seconds=1, predicted_class="class_1", confidence=0.7),
        VideoFramePrediction(frame_index=60, timestamp_seconds=2, predicted_class="class_2", confidence=0.6),
    ]
    assert _class_counts(rows) == {"class_1": 2, "class_2": 1}
