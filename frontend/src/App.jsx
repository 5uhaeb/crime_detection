import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Database, Image, ShieldAlert, Video } from "lucide-react";
import { getAnalyses, getHealth, getStats, predictImage, predictVideo } from "./api.js";
import HealthBadge from "./components/HealthBadge.jsx";
import ResultCard from "./components/ResultCard.jsx";
import UploadBox from "./components/UploadBox.jsx";

const DISCLAIMER = "Research prototype only. Training-label order is missing, so outputs have no verified real-world meaning and must never be used as evidence or for law-enforcement, safety, or emergency decisions.";
const DEMOS = [
  { id:"subway", title:"Subway incident", file:"/demos/subway-robbery.webm", filename:"demo-subway-robbery.webm", detail:"6 sec // fixed CCTV // New York", source:"https://commons.wikimedia.org/wiki/File:NYPD_Wanted_-_Robbery_(Manhattan).webm" },
  { id:"street", title:"Street incident", file:"/demos/street-robbery.webm", filename:"demo-street-robbery.webm", detail:"6 sec // fixed CCTV // New York", source:"https://commons.wikimedia.org/wiki/File:Robbery_75_Precinct_-_6-23-12.webm" },
];

export default function App() {
  const [health,setHealth]=useState(null),[healthLoading,setHealthLoading]=useState(true),[imageFile,setImageFile]=useState(null),[imageResult,setImageResult]=useState(null),[videoFile,setVideoFile]=useState(null),[videoResult,setVideoResult]=useState(null),[playbackTime,setPlaybackTime]=useState(0),[loading,setLoading]=useState(false),[videoLoading,setVideoLoading]=useState(false),[error,setError]=useState(""),[analyses,setAnalyses]=useState([]),[stats,setStats]=useState({total:0,by_kind:{}}),[sampleEvery,setSampleEvery]=useState(30);
  const previewUrl=useMemo(()=>imageFile?URL.createObjectURL(imageFile):"",[imageFile]);
  const videoPreviewUrl=useMemo(()=>videoFile?URL.createObjectURL(videoFile):"",[videoFile]);
  useEffect(()=>{getHealth().then(setHealth).catch(err=>setHealth({status:"error",message:err.message})).finally(()=>setHealthLoading(false));},[]);
  async function refreshHistory(){const [historyData,statsData]=await Promise.all([getAnalyses(),getStats()]);setAnalyses(historyData.analyses||[]);setStats(statsData);}
  useEffect(()=>{refreshHistory().catch(()=>null);},[]);
  useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);
  useEffect(()=>()=>{if(videoPreviewUrl)URL.revokeObjectURL(videoPreviewUrl);},[videoPreviewUrl]);
  async function handleImage(file){setImageFile(file);setImageResult(null);setError("");setLoading(true);try{setImageResult(await predictImage(file));await refreshHistory().catch(()=>null);}catch(err){setError(err.message);}finally{setLoading(false);}}
  async function handleVideo(file){setVideoFile(file);setVideoResult(null);setError("");setVideoLoading(true);try{setVideoResult(await predictVideo(file,sampleEvery));await refreshHistory().catch(()=>null);}catch(err){setError(err.message);}finally{setVideoLoading(false);}}
  async function runDemo(demo){setError("");setVideoLoading(true);try{const response=await fetch(demo.file);if(!response.ok)throw new Error("Demo file could not be loaded.");const blob=await response.blob();await handleVideo(new File([blob],demo.filename,{type:"video/webm"}));document.getElementById("video-analysis")?.scrollIntoView({behavior:"smooth",block:"start"});}catch(err){setError(err.message);setVideoLoading(false);}}
  return <main className="console-shell"><div className="console-wrap">
    <header className="masthead"><div><p className="eyebrow">Cyber Police // Visual Forensics</p><h1 className="hero-title">Event Analysis Console</h1><p className="hero-copy">Inspect visual model output, compare probability signals, and review analysis telemetry from one controlled workspace.</p></div><HealthBadge health={health} loading={healthLoading}/></header>
    <div className="warning-strip"><AlertCircle className="h-5 w-5 shrink-0"/><p>{DISCLAIMER}</p></div>
    {error&&<div className="error-strip"><AlertCircle className="h-5 w-5 shrink-0"/><p>{error}</p></div>}
    <section className="metric-grid" aria-label="Analysis overview"><Metric label="Saved analyses" value={stats.total||0} icon={Database}/><Metric label="Image records" value={stats.by_kind?.image||0} icon={Image}/><Metric label="Video records" value={stats.by_kind?.video||0} icon={Video}/></section>
    <section className="panel"><div className="panel-head"><div><p className="module-id">Quick start // Public-domain samples</p><h2>Show Demo</h2><p className="muted mt-2 text-sm">Preview a short, non-graphic CCTV sample and send it through the real video pipeline. Results are not pre-recorded.</p></div></div><div className="demo-grid">{DEMOS.map(demo=><article className="demo-card" key={demo.id}><video src={demo.file} controls muted playsInline preload="metadata" aria-label={`${demo.title} preview`}/><div className="demo-copy"><p className="module-id">Test file // {demo.id}</p><h3>{demo.title}</h3><p className="muted">{demo.detail}</p><div className="demo-actions"><button className="action-button" disabled={videoLoading} onClick={()=>runDemo(demo)}>{videoLoading?"Processing…":"Run this demo"}</button><a href={demo.source} target="_blank" rel="noreferrer">Source + license</a></div></div></article>)}</div><p className="demo-note">Content note: real surveillance footage of reported robberies; no graphic injury is shown. Public-domain status and context are documented at each source link.</p></section>
    <section className="grid-two"><UploadBox title="Evidence image input" description="Load one local frame to inspect anonymous class probabilities." accept="image/*" previewUrl={previewUrl} fileName={imageFile?.name} loading={loading} onFile={handleImage}/><ResultCard result={imageResult}/></section>
    <section className="grid-two" id="video-analysis"><UploadBox title="Video signal sampler" description="Sample frames from a local video and summarize model output over time." accept="video/*" fileName={videoFile?.name} loading={videoLoading} onFile={handleVideo} mode="video"/>
      <RiskMonitor result={videoResult} videoUrl={videoPreviewUrl} playbackTime={playbackTime} onTime={setPlaybackTime} sampleEvery={sampleEvery} onSampleEvery={setSampleEvery}/>
    </section>
    <section className="panel"><div className="panel-head"><div><p className="module-id">Module 05 // Archive</p><h2>Recent Analyses</h2><p className="muted mt-2 text-sm">MongoDB stores metadata and outputs only. Uploaded media is discarded after processing.</p></div><button className="action-button" onClick={()=>refreshHistory().catch(err=>setError(err.message))}>Refresh feed</button></div>{analyses.length?<div className="data-table">{analyses.map(a=><div key={a.id} className="archive-row"><span className="archive-kind">{a.kind}</span><div className="truncate"><strong>{a.filename}</strong><div className="muted truncate">{a.predicted_class||`${a.sampled_frames||0} sampled frames`}</div></div><time className="muted" dateTime={a.created_at}>{new Date(a.created_at).toLocaleString()}</time></div>)}</div>:<p className="muted text-sm">No analyses saved. Load an image or video to initialize the feed.</p>}</section>
  </div></main>;
}
function Metric({label,value,icon:Icon}){return <div className="metric">{Icon&&<Icon className="metric-icon"/>}<p className="metric-label">{label}</p><p className="metric-value">{value}</p></div>}

const DEMO_RISK={class_0:18,class_1:58,class_2:92};
function RiskMonitor({result,videoUrl,playbackTime,onTime,sampleEvery,onSampleEvery}){
 const frame=result?.frame_predictions?.reduce((closest,item)=>Math.abs(item.timestamp_seconds-playbackTime)<Math.abs(closest.timestamp_seconds-playbackTime)?item:closest,result.frame_predictions[0]);
 const risk=frame?DEMO_RISK[frame.predicted_class]??Math.round(frame.confidence*100):0;
 const level=risk>=75?"danger":risk>=40?"warning":"clear";
 return <section className={`panel risk-monitor ${level}`}><p className="module-id">Prototype // Synchronized monitor</p><h2>Live Risk Console</h2>{result&&videoUrl?<div className="mt-5"><div className={`live-alert ${level}`}><ShieldAlert/><div><span>{level==="danger"?"High-risk signal":level==="warning"?"Review signal":"No elevated signal"}</span><small>Playback {playbackTime.toFixed(1)}s // {frame?.predicted_class}</small></div><strong>{risk}%</strong></div><video className="monitor-video" src={videoUrl} controls playsInline onTimeUpdate={e=>onTime(e.currentTarget.currentTime)}/><div className="risk-track"><div className="risk-level" style={{width:`${risk}%`}}/></div><div className="risk-labels"><span>LOW</span><span>REVIEW</span><span>WARN</span></div><p className="warning-strip mt-4">Prototype mapping only: class_0 → low, class_1 → review, class_2 → warning. This mapping is not supplied by the model and must be replaced with the original training labels before integration.</p></div>:<p className="muted mt-3 text-sm leading-6">Choose a demo or upload a video. The unchanged model will pre-scan it, then this panel replays the result as synchronized warning telemetry.</p>}<label className="muted mt-5 block text-sm">Scan interval // {sampleEvery} frames<input className="range-control mt-3" type="range" min="5" max="120" step="5" value={sampleEvery} onChange={e=>onSampleEvery(Number(e.target.value))}/></label></section>;
}
