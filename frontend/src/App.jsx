import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, Image, Video } from "lucide-react";
import { getAnalyses, getHealth, getStats, predictImage, predictVideo } from "./api.js";
import HealthBadge from "./components/HealthBadge.jsx";
import ResultCard from "./components/ResultCard.jsx";
import UploadBox from "./components/UploadBox.jsx";

const DISCLAIMER = "Research prototype only. Training-label order is missing, so outputs have no verified real-world meaning and must never be used as evidence or for law-enforcement, safety, or emergency decisions.";

export default function App() {
  const [health,setHealth]=useState(null),[healthLoading,setHealthLoading]=useState(true),[imageFile,setImageFile]=useState(null),[imageResult,setImageResult]=useState(null),[videoFile,setVideoFile]=useState(null),[videoResult,setVideoResult]=useState(null),[loading,setLoading]=useState(false),[videoLoading,setVideoLoading]=useState(false),[error,setError]=useState(""),[analyses,setAnalyses]=useState([]),[stats,setStats]=useState({total:0,by_kind:{}}),[sampleEvery,setSampleEvery]=useState(30);
  const previewUrl=useMemo(()=>imageFile?URL.createObjectURL(imageFile):"",[imageFile]);
  useEffect(()=>{getHealth().then(setHealth).catch(err=>setHealth({status:"error",message:err.message})).finally(()=>setHealthLoading(false));},[]);
  async function refreshHistory(){const [historyData,statsData]=await Promise.all([getAnalyses(),getStats()]);setAnalyses(historyData.analyses||[]);setStats(statsData);}
  useEffect(()=>{refreshHistory().catch(()=>null);},[]);
  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);
  async function handleImage(file){setImageFile(file);setImageResult(null);setError("");setLoading(true);try{setImageResult(await predictImage(file));await refreshHistory().catch(()=>null);}catch(err){setError(err.message);}finally{setLoading(false);}}
  async function handleVideo(file){setVideoFile(file);setVideoResult(null);setError("");setVideoLoading(true);try{setVideoResult(await predictVideo(file,sampleEvery));await refreshHistory().catch(()=>null);}catch(err){setError(err.message);}finally{setVideoLoading(false);}}
  return <main className="console-shell"><div className="console-wrap">
    <header className="masthead"><div><p className="eyebrow">Cyber Police // Visual Forensics</p><h1 className="hero-title">Event Analysis Console</h1><p className="hero-copy">Inspect visual model output, compare probability signals, and review analysis telemetry from one controlled workspace.</p></div><HealthBadge health={health} loading={healthLoading}/></header>
    <div className="warning-strip"><AlertCircle className="h-5 w-5 shrink-0"/><p>{DISCLAIMER}</p></div>
    {error&&<div className="error-strip"><AlertCircle className="h-5 w-5 shrink-0"/><p>{error}</p></div>}
    <section className="metric-grid" aria-label="Analysis overview"><Metric label="Saved analyses" value={stats.total||0} icon={Database}/><Metric label="Image records" value={stats.by_kind?.image||0} icon={Image}/><Metric label="Video records" value={stats.by_kind?.video||0} icon={Video}/></section>
    <section className="grid-two"><UploadBox title="Evidence image input" description="Load one local frame to inspect anonymous class probabilities." accept="image/*" previewUrl={previewUrl} fileName={imageFile?.name} loading={loading} onFile={handleImage}/><ResultCard result={imageResult}/></section>
    <section className="grid-two"><UploadBox title="Video signal sampler" description="Sample frames from a local video and summarize model output over time." accept="video/*" fileName={videoFile?.name} loading={videoLoading} onFile={handleVideo} mode="video"/>
      <section className="panel"><p className="module-id">Module 04 // Telemetry</p><h2>Video Summary</h2>{videoResult?<div className="mt-5"><div className="metric-grid"><Metric label="Sampled" value={videoResult.sampled_frames}/><Metric label="Classes" value={new Set(videoResult.frame_predictions.map(f=>f.predicted_class)).size}/><Metric label="Avg conf." value={`${Math.round(videoResult.average_confidence*100)}%`}/></div><div className="data-table mt-4">{videoResult.frame_predictions.map(f=><div key={f.frame_index} className="data-row"><span>{f.timestamp_seconds}s</span><strong>{f.predicted_class}</strong><span>{Math.round(f.confidence*100)}%</span></div>)}</div></div>:<p className="muted mt-3 text-sm leading-6">Awaiting video input. Processing time scales with file length and sampling interval.</p>}<label className="muted mt-5 block text-sm">Sampling interval // {sampleEvery} frames<input className="range-control mt-3" type="range" min="5" max="120" step="5" value={sampleEvery} onChange={e=>setSampleEvery(Number(e.target.value))}/></label></section>
    </section>
    <section className="panel"><div className="panel-head"><div><p className="module-id">Module 05 // Archive</p><h2>Recent Analyses</h2><p className="muted mt-2 text-sm">MongoDB stores metadata and outputs only. Uploaded media is discarded after processing.</p></div><button className="action-button" onClick={()=>refreshHistory().catch(err=>setError(err.message))}>Refresh feed</button></div>{analyses.length?<div className="data-table">{analyses.map(a=><div key={a.id} className="archive-row"><span className="archive-kind">{a.kind}</span><div className="truncate"><strong>{a.filename}</strong><div className="muted truncate">{a.predicted_class||`${a.sampled_frames||0} sampled frames`}</div></div><time className="muted" dateTime={a.created_at}>{new Date(a.created_at).toLocaleString()}</time></div>)}</div>:<p className="muted text-sm">No analyses saved. Load an image or video to initialize the feed.</p>}</section>
  </div></main>;
}
function Metric({label,value,icon:Icon}){return <div className="metric">{Icon&&<Icon className="metric-icon"/>}<p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>}
