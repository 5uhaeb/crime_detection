import { AlertTriangle, BarChart3, BrainCircuit } from "lucide-react";
export default function ResultCard({result}){
 if(!result)return <section className="panel result-empty"><BarChart3/><p className="module-id">Module 02 // Model output</p><h2>Awaiting Signal</h2><p className="muted mt-2 text-sm leading-6">Load an image to reveal the anonymous predicted class, confidence, and probability distribution.</p></section>;
 const confidence=Math.round(result.confidence*100);
 return <section className="panel"><div className="panel-head"><div><p className="module-id">Module 02 // Prediction</p><h2 className="result-title">{result.predicted_class}</h2></div><span className="output-pill"><BrainCircuit className="h-4 w-4"/>Model output</span></div>
 <div><div className="row"><strong>Confidence signal</strong><strong>{confidence}%</strong></div><div className="bar-track"><div className="bar-fill" style={{width:`${confidence}%`}}/></div></div>
 <div className="mt-6">{Object.entries(result.raw_probabilities||{}).map(([label,value])=><div className="probability" key={label}><div className="row"><span>{label}</span><span>{Math.round(value*100)}%</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${value*100}%`}}/></div></div>)}</div>
 {result.labels_are_placeholder&&<div className="warning-strip mt-6"><AlertTriangle className="h-4 w-4 shrink-0"/><p>Training-label mapping is missing. Class numbers are anonymous model outputs—not crime categories or safety findings.</p></div>}</section>;
}
