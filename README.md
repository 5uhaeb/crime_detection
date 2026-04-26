# Crime Detection AI

A full-stack prototype for running image and sampled-video inference with a Keras MobileNetV2-based model.

**Disclaimer:** This model is for educational/prototype use only and should not be used as the sole basis for safety, law enforcement, or emergency decisions. Do not treat predictions as proof that a crime occurred.

## What Is Included

- FastAPI backend with `/health`, `/model/info`, `/predict`, and `/predict-video`
- React + Vite + Tailwind frontend dashboard
- Keras model loading from `config.json` and `model.weights.h5`
- Image preprocessing for `96x96` RGB input
- Dockerfiles and `docker-compose.yml`
- Deployment notes for Render, Netlify/Vercel, and Docker

## Model Assets

The model files are kept at the repository root:

- `config.json`
- `metadata.json`
- `model.weights.h5`
- `labels.json`

`labels.json` currently contains placeholder labels:

```json
["class_0", "class_1", "class_2"]
```

Update these labels with the exact class names and order used during training. The model output has three softmax classes, but the training class order is not present in the uploaded metadata.

## Local Backend Setup

TensorFlow wheels are usually available for Python 3.10-3.12. If your system Python is newer, use Docker or create a compatible virtual environment.

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Environment variables:

```bash
BACKEND_PORT=8000
MODEL_DIR=..
CORS_ORIGINS=http://localhost:5173
```

## Local Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env` when the API is not on the default local URL:

```bash
VITE_API_URL=http://localhost:8000
```

## Docker Compose

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

## API Examples

Health:

```bash
curl http://localhost:8000/health
```

Model info:

```bash
curl http://localhost:8000/model/info
```

Image prediction:

```bash
curl -X POST http://localhost:8000/predict ^
  -F "file=@sample.jpg"
```

Video prediction:

```bash
curl -X POST "http://localhost:8000/predict-video?sample_every=30" ^
  -F "file=@sample.mp4"
```

## Deployment

### Render Backend

1. Create a new Web Service from this GitHub repo.
2. Use Docker deployment with `backend/Dockerfile`.
3. Set environment variables:
   - `MODEL_DIR=/app/model`
   - `CORS_ORIGINS=https://your-frontend-domain`
4. Expose port `8000`.

### Netlify or Vercel Frontend

1. Set the project root to `frontend`.
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Set environment variable:
   - `VITE_API_URL=https://your-backend-domain`

### Docker Backend Only

```bash
docker build -f backend/Dockerfile -t crime-detection-api .
docker run --rm -p 8000:8000 -e MODEL_DIR=/app/model crime-detection-api
```

### Docker Frontend Only

```bash
docker build -f frontend/Dockerfile -t crime-detection-web --build-arg VITE_API_URL=http://localhost:8000 .
docker run --rm -p 5173:80 crime-detection-web
```

## Project Structure

```text
backend/
  app/
    main.py
    model_loader.py
    schemas.py
    utils.py
  requirements.txt
  Dockerfile
  .env.example
frontend/
  src/
    components/
    App.jsx
    api.js
    main.jsx
  package.json
  Dockerfile
  .env.example
config.json
metadata.json
model.weights.h5
labels.json
docker-compose.yml
```

## Notes For Beginners

- The backend rebuilds the model architecture from `config.json`, then loads the weights from `model.weights.h5`.
- Uploaded images are converted to RGB, resized to `96x96`, normalized to `0-1`, and wrapped in a batch dimension.
- Predictions depend heavily on the original training data. Validate the model before using it in any real workflow.
