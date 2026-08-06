import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, FileVideo, Link, Loader2, ShieldCheck, Upload } from "lucide-react";
import { getHealth, predictImage } from "./api.js";
import HealthBadge from "./components/HealthBadge.jsx";

const CLASS_RISK={class_0:15,class_1:55,class_2:90};

export default function App(){
 const [health,setHealth]=useState(null),[healthLoading,setHealthLoading]=useState(true),[file,setFile]=useState(null),[remoteUrl,setRemoteUrl]=useState(""),[remoteLoading,setRemoteLoading]=useState(false),[error,setError]=useState("");
 const videoUrl=useMemo(()=>file?URL.createObjectURL(file):"",[file]);
 useEffect(()=>{getHealth().then(setHealth).catch(err=>setHealth({status:"error",message:err.message})).finally(()=>setHealthLoading(false));},[]);
 useEffect(()=>()=>{if(videoUrl)URL.revokeObjectURL(videoUrl);},[videoUrl]);
 function chooseFile(next){if(!next)return;setError("");setFile(next);}
 async function loadUrl(event){event.preventDefault();const value=remoteUrl.trim();if(!value)return;setRemoteLoading(true);setError("");try{const response=await fetch(value);if(!response.ok)throw new Error(`Video request failed (${response.status}).`);const type=response.headers.get("content-type")||"";if(!type.startsWith("video/"))throw new Error("This URL is not a direct video file. Use a CORS-enabled MP4, WebM, MOV, or OGG link.");const blob=await response.blob();setFile(new File([blob],fileNameFromUrl(value),{type:blob.type||type}));}catch(err){setError(err.message.includes("Failed to fetch")?"The video host blocked browser access. Use a direct media URL with CORS enabled or download and upload the file.":err.message);}finally{setRemoteLoading(false);}}
 return <main className="app-shell"><div className="app-wrap">
  <header className="topbar"><div><p className="kicker">Video safety analysis</p><h1>Live incident detection</h1><p>Analyze motion, sound intensity, and visual model output while footage plays.</p></div><HealthBadge health={health} loading={healthLoading}/></header>
  <div className="research-notice"><AlertTriangle/><p><strong>Prototype limitation:</strong> the original model labels are unavailable. Risk interpretation must be validated before operational use.</p></div>
  {error&&<div className="error-notice"><AlertTriangle/><p>{error}</p></div>}
  <section className="source-panel">
   <div className="section-heading"><span>1</span><div><h2>Add footage</h2><p>Upload a file or provide a direct video URL.</p></div></div>
   <div className="source-grid">
    <label className="file-control"><Upload/><span><strong>{file?.name||"Choose a video file"}</strong><small>MP4, WebM, MOV or OGG</small></span><input type="file" accept="video/*" onChange={e=>chooseFile(e.target.files?.[0])}/></label>
    <form className="url-control" onSubmit={loadUrl}><Link/><label><span>Direct video URL</span><input type="url" value={remoteUrl} onChange={e=>setRemoteUrl(e.target.value)} placeholder="https://example.com/footage.mp4"/></label><button disabled={remoteLoading||!remoteUrl.trim()}>{remoteLoading?<Loader2 className="spin"/>:"Load"}</button></form>
   </div>
   <p className="url-help">URL detection works only with direct media links whose server permits cross-origin access. YouTube, Netflix, news pages, and embedded players are not supported.</p>
  </section>
  <section className="workflow"><article><span>01</span><div><b>Capture</b><p>The browser samples the current video frame while playback continues.</p></div></article><article><span>02</span><div><b>Analyze</b><p>Visual inference, movement change, and audio intensity run as separate signals.</p></div></article><article><span>03</span><div><b>Assess</b><p>Signals combine into a rolling risk level that fades when activity subsides.</p></div></article></section>
  <LiveMonitor videoUrl={videoUrl} fileName={file?.name}/>
  <section className="method-panel"><div className="section-heading"><span>3</span><div><h2>How detection works</h2><p>Every signal remains visible so users can understand a warning.</p></div></div><div className="method-grid"><SignalInfo title="Visual model" text="Sends approximately one frame per second to the existing image classifier."/><SignalInfo title="Motion" text="Measures pixel changes between consecutive frames inside the browser."/><SignalInfo title="Audio activity" text="Measures sound intensity. It does not identify speech or recognize a scream."/><SignalInfo title="Rolling risk" text="Uses the strongest recent signal and gradual decay to avoid rapidly flashing states."/></div></section>
 </div></main>;
}

function LiveMonitor({videoUrl,fileName}){
 const videoRef=useRef(null),captureRef=useRef(null),motionRef=useRef(null),lastPixelsRef=useRef(null),modelBusyRef=useRef(false),lastModelRef=useRef(-2),rafRef=useRef(null),lastMotionRef=useRef(0),audioRef=useRef(null);
 const [playing,setPlaying]=useState(false),[prediction,setPrediction]=useState(null),[motion,setMotion]=useState(0),[audio,setAudio]=useState(0),[risk,setRisk]=useState(0),[frames,setFrames]=useState(0),[latency,setLatency]=useState(null),[scanError,setScanError]=useState("");
 useEffect(()=>{setPrediction(null);setMotion(0);setAudio(0);setRisk(0);setFrames(0);setLatency(null);setScanError("");lastPixelsRef.current=null;lastModelRef.current=-2;},[videoUrl]);
 useEffect(()=>{const visual=prediction?(CLASS_RISK[prediction.predicted_class]??Math.round(prediction.confidence*100)):0;const combined=Math.min(100,Math.max(visual,motion*.82,audio*.72,motion>55&&audio>45?68:0));setRisk(previous=>Math.round(Math.max(combined,previous*.88)));},[prediction,motion,audio]);
 useEffect(()=>()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);},[]);
 function setupAudio(){if(audioRef.current||!videoRef.current)return;try{const context=new AudioContext();const source=context.createMediaElementSource(videoRef.current);const analyser=context.createAnalyser();analyser.fftSize=256;source.connect(analyser);analyser.connect(context.destination);audioRef.current={context,analyser,data:new Uint8Array(analyser.frequencyBinCount)};}catch{return;}}
 function start(){setPlaying(true);setupAudio();tick();}
 function stop(){setPlaying(false);if(rafRef.current)cancelAnimationFrame(rafRef.current);rafRef.current=null;}
 function tick(){const video=videoRef.current;if(!video||video.paused||video.ended)return;const now=performance.now();if(now-lastMotionRef.current>250){measureMotion(video);measureAudio();lastMotionRef.current=now;}if(video.currentTime-lastModelRef.current>=1&&!modelBusyRef.current)scanModel(video);rafRef.current=requestAnimationFrame(tick);}
 function measureMotion(video){if(!video.videoWidth)return;const canvas=motionRef.current,ctx=canvas.getContext("2d",{willReadFrequently:true});canvas.width=160;canvas.height=90;ctx.drawImage(video,0,0,160,90);const pixels=ctx.getImageData(0,0,160,90).data;const previous=lastPixelsRef.current;if(previous){let difference=0;for(let i=0;i<pixels.length;i+=16)difference+=Math.abs(pixels[i]-previous[i])+Math.abs(pixels[i+1]-previous[i+1])+Math.abs(pixels[i+2]-previous[i+2]);const samples=pixels.length/16;setMotion(Math.min(100,Math.round(difference/(samples*255*3)*520)));}lastPixelsRef.current=new Uint8ClampedArray(pixels);}
 function measureAudio(){const state=audioRef.current;if(!state)return;state.analyser.getByteFrequencyData(state.data);const average=state.data.reduce((sum,value)=>sum+value,0)/state.data.length;setAudio(Math.min(100,Math.round(average/128*100)));}
 async function scanModel(video){modelBusyRef.current=true;lastModelRef.current=video.currentTime;const started=performance.now();try{const canvas=captureRef.current;canvas.width=video.videoWidth;canvas.height=video.videoHeight;canvas.getContext("2d").drawImage(video,0,0);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.82));if(!blob)throw new Error("Frame capture failed.");const result=await predictImage(new File([blob],`live-${Date.now()}.jpg`,{type:"image/jpeg"}));setPrediction(result);setFrames(value=>value+1);setLatency(Math.round(performance.now()-started));setScanError("");}catch(err){setScanError(err.message);}finally{modelBusyRef.current=false;}}
 const level=risk>=75?"danger":risk>=40?"warning":"clear";
 return <section className={`monitor-panel ${level}`}><div className="section-heading"><span>2</span><div><h2>Monitor footage</h2><p>{videoUrl?`${fileName} · Press play to begin analysis.`:"Add footage above to start."}</p></div></div>{videoUrl?<div className="monitor-layout"><div><video ref={videoRef} src={videoUrl} controls playsInline onPlay={start} onPause={stop} onEnded={stop}/><canvas ref={captureRef} hidden/><canvas ref={motionRef} hidden/></div><aside><div className={`risk-status ${level}`}><div><small>{playing?"Live analysis":"Analysis paused"}</small><strong>{level==="danger"?"Alert":level==="warning"?"Review":"Low risk"}</strong></div><b>{risk}%</b></div><div className="risk-meter"><i style={{width:`${risk}%`}}/></div><div className="signal-list"><Signal label="Visual model" value={prediction?CLASS_RISK[prediction.predicted_class]??0:0} detail={prediction?`${prediction.predicted_class} · ${Math.round(prediction.confidence*100)}% confidence`:"Waiting"}/><Signal label="Motion" value={motion} detail={`${motion}% change`}/><Signal label="Audio activity" value={audio} detail={`${audio}% intensity`}/></div><div className="telemetry"><span><small>Frames analyzed</small>{frames}</span><span><small>Last response</small>{latency?`${latency} ms`:"—"}</span></div>{scanError&&<p className="inline-error">{scanError}</p>}</aside></div>:<div className="empty-monitor"><FileVideo/><p>No video selected</p><span>Upload a file or load a direct URL.</span></div>}</section>;
}
function Signal({label,value,detail}){return <div className="signal-row"><div><b>{label}</b><small>{detail}</small></div><span><i style={{width:`${value}%`}}/></span></div>}
function SignalInfo({title,text}){return <article><ShieldCheck/><div><b>{title}</b><p>{text}</p></div></article>}
function fileNameFromUrl(value){try{return decodeURIComponent(new URL(value).pathname.split("/").pop())||"remote-video";}catch{return"remote-video";}}
