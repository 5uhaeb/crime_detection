const API_URL = import.meta.env.VITE_API_URL || "https://crime-detection-v1.onrender.com";

async function parseResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail || data.message || "Request failed.");
  }
  return data;
}

export async function getHealth() {
  const response = await fetch(`${API_URL}/health`);
  return parseResponse(response);
}

export async function predictImage(file) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/predict`, {
    method: "POST",
    body: formData,
  });
  return parseResponse(response);
}

export async function predictVideo(file, sampleEvery = 30) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/predict-video?sample_every=${sampleEvery}`, {
    method: "POST",
    body: formData,
  });
  return parseResponse(response);
}

export async function getAnalyses(limit = 12) {
  const response = await fetch(`${API_URL}/analyses?limit=${limit}`);
  return parseResponse(response);
}

export async function getStats() {
  const response = await fetch(`${API_URL}/analyses/stats`);
  return parseResponse(response);
}

export { API_URL };
