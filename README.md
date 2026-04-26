# Crime Detection AI

A full-stack prototype for running image and sampled-video inference with a Keras MobileNetV2-based model.

**Disclaimer:** This model is for educational/prototype use only and should not be used as the sole basis for safety, law enforcement, or emergency decisions. Do not treat predictions as proof that a crime occurred.

## What Is Included

- FastAPI backend with `/health`, `/model/info`, `/predict`, and `/predict-video`
- React + Vite + Tailwind frontend dashboard
- Keras model loading from `config.json` and `model.weights.h5`
- Image preprocessing for `96x96` RGB input
- Dockerfiles and `docker-compose.yml`
- Provider-ready deployment files for Render, Vercel, and Docker

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

### Recommended Production Flow

Deploy the backend to Render first, then copy the Render service URL into Vercel as `VITE_API_URL`.

### Render Backend

This repo includes `render.yaml`, so Render can create the backend service from the repository root.

1. In Render, choose **New** -> **Blueprint**.
2. Connect `https://github.com/5uhaeb/crime_detection`.
3. Select the included `render.yaml`.
4. The blueprint starts with `CORS_ORIGINS=*` so the first Vercel deploy can connect immediately.
5. After the frontend URL is final, replace `*` with your Vercel domain.

Manual Render settings if you do not use the blueprint:

- Service type: Web Service
- Environment: Docker
- Dockerfile path: `./backend/Dockerfile`
- Docker build context directory: `.`
- Health check path: `/health`
- Port: Render sets `PORT` automatically; the Dockerfile reads it.
- Environment variables:
   - `MODEL_DIR=/app/model`
   - `CORS_ORIGINS=*` for first deploy, then `https://your-vercel-app.vercel.app`

After deploy, verify:

```bash
curl https://your-render-backend.onrender.com/health
```

### Vercel Frontend

This repo includes root `vercel.json` for a monorepo deployment. Keep the Vercel project root as the repository root.

Vercel settings:

- Framework preset: Vite
- Install command: `cd frontend && npm install`
- Build command: `cd frontend && npm run build`
- Output directory: `frontend/dist`
- Environment variables:
  - `VITE_API_URL=https://your-render-backend.onrender.com`

The `vercel.json` file also rewrites browser routes to `index.html`, which keeps the single-page React app working on refresh.

After Vercel deploys, return to Render and set:

```bash
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

If you use Vercel preview deployments, add each preview URL to `CORS_ORIGINS` as a comma-separated list.

### Netlify Frontend

Netlify also works, but Vercel is preconfigured in this repo.

1. Set the base directory to `frontend`.
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Set `VITE_API_URL=https://your-render-backend.onrender.com`.

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
render.yaml
vercel.json
```

## Notes For Beginners

- The backend rebuilds the model architecture from `config.json`, then loads the weights from `model.weights.h5`.
- Uploaded images are converted to RGB, resized to `96x96`, normalized to `0-1`, and wrapped in a batch dimension.
- Predictions depend heavily on the original training data. Validate the model before using it in any real workflow.
