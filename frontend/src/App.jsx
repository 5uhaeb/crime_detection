import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, Image, Video } from "lucide-react";

import { getAnalyses, getHealth, getStats, predictImage, predictVideo } from "./api.js";
import HealthBadge from "./components/HealthBadge.jsx";
import ResultCard from "./components/ResultCard.jsx";
import UploadBox from "./components/UploadBox.jsx";

const DISCLAIMER =
  "Educational visual-classification prototype. The original training label order is missing, so outputs have no verified real-world meaning. Never use them as evidence or for safety, law-enforcement, or emergency decisions.";

export default function App() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imageResult, setImageResult] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoResult, setVideoResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [error, setError] = useState("");
  const [analyses, setAnalyses] = useState([]);
  const [stats, setStats] = useState({ total: 0, by_kind: {} });
  const [sampleEvery, setSampleEvery] = useState(30);

  const previewUrl = useMemo(() => {
    if (!imageFile) return "";
    return URL.createObjectURL(imageFile);
  }, [imageFile]);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setHealth({ status: "error", message: err.message }))
      .finally(() => setHealthLoading(false));
  }, []);

  async function refreshHistory() {
    const [historyData, statsData] = await Promise.all([getAnalyses(), getStats()]);
    setAnalyses(historyData.analyses || []);
    setStats(statsData);
  }

  useEffect(() => {
    refreshHistory().catch(() => null);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleImage(file) {
    setImageFile(file);
    setImageResult(null);
    setError("");
    setLoading(true);
    try {
      setImageResult(await predictImage(file));
      await refreshHistory().catch(() => null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVideo(file) {
    setVideoFile(file);
    setVideoResult(null);
    setError("");
    setVideoLoading(true);
    try {
      setVideoResult(await predictVideo(file, sampleEvery));
      await refreshHistory().catch(() => null);
    } catch (err) {
      setError(err.message);
    } finally {
      setVideoLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Visual model workbench</p>
            <h1 className="mt-2 text-4xl font-semibold text-slate-950 sm:text-5xl">Visual Event Analysis Lab</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{DISCLAIMER}</p>
          </div>
          <HealthBadge health={health} loading={healthLoading} />
        </header>

        {error && (
          <div className="flex items-start gap-3 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-3" aria-label="Analysis overview">
          <Metric label="Saved analyses" value={stats.total || 0} icon={Database} />
          <Metric label="Images" value={stats.by_kind?.image || 0} icon={Image} />
          <Metric label="Videos" value={stats.by_kind?.video || 0} icon={Video} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <UploadBox
            title="Image detection"
            description="Upload a single frame or image and receive class probabilities."
            accept="image/*"
            previewUrl={previewUrl}
            fileName={imageFile?.name}
            loading={loading}
            onFile={handleImage}
          />
          <ResultCard result={imageResult} />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <UploadBox
            title="Video sampling"
            description="Sample frames from a video and summarize predictions over time."
            accept="video/*"
            fileName={videoFile?.name}
            loading={videoLoading}
            onFile={handleVideo}
            mode="video"
          />
          <section className="panel">
            <h2 className="text-lg font-semibold text-slate-950">Video summary</h2>
            {videoResult ? (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Sampled" value={videoResult.sampled_frames} />
                  <Metric label="Classes" value={new Set(videoResult.frame_predictions.map((frame) => frame.predicted_class)).size} />
                  <Metric label="Avg conf." value={`${Math.round(videoResult.average_confidence * 100)}%`} />
                </div>
                <div className="max-h-64 overflow-auto rounded-md border border-slate-200">
                  {videoResult.frame_predictions.map((frame) => (
                    <div key={frame.frame_index} className="grid grid-cols-3 gap-3 border-b border-slate-100 p-3 text-sm last:border-0">
                      <span>{frame.timestamp_seconds}s</span>
                      <span className="font-medium">{frame.predicted_class}</span>
                      <span>{Math.round(frame.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Upload a short video to sample frames. Larger videos may take longer depending on your machine.
              </p>
            )}
            <label className="mt-5 block text-sm font-medium text-slate-700">
              Sample every {sampleEvery} frames
              <input className="mt-2 w-full accent-emerald-600" type="range" min="5" max="120" step="5" value={sampleEvery} onChange={(event) => setSampleEvery(Number(event.target.value))} />
            </label>
          </section>
        </section>

        <section className="panel">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Recent analyses</h2>
              <p className="mt-1 text-sm text-slate-600">MongoDB stores metadata and outputs only. Uploaded media is discarded after processing.</p>
            </div>
            <button className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium" onClick={() => refreshHistory().catch((err) => setError(err.message))}>Refresh</button>
          </div>
          {analyses.length ? (
            <div className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-200">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="grid gap-2 p-4 text-sm sm:grid-cols-[100px_1fr_160px] sm:items-center">
                  <span className="font-semibold capitalize text-emerald-700">{analysis.kind}</span>
                  <div className="min-w-0"><div className="truncate font-medium">{analysis.filename}</div><div className="text-slate-500">{analysis.predicted_class || `${analysis.sampled_frames || 0} sampled frames`}</div></div>
                  <time className="text-slate-500" dateTime={analysis.created_at}>{new Date(analysis.created_at).toLocaleString()}</time>
                </div>
              ))}
            </div>
          ) : <p className="mt-5 text-sm text-slate-500">No analyses saved yet. Upload an image or video to begin.</p>}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value, icon: Icon }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      {Icon && <Icon className="mb-2 h-5 w-5 text-emerald-700" />}
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
