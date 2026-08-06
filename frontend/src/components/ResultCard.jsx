import { AlertTriangle, BarChart3, BrainCircuit } from "lucide-react";

export default function ResultCard({ result }) {
  if (!result) {
    return (
      <section className="panel flex min-h-80 flex-col justify-center">
        <BarChart3 className="mb-4 h-10 w-10 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-950">Prediction result</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upload an image to see the predicted class, confidence, and probability breakdown.
        </p>
      </section>
    );
  }

  const confidence = Math.round(result.confidence * 100);

  return (
    <section className="panel">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Prediction</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-950">{result.predicted_class}</h2>
        </div>
        <span className="risk-pill">
          <BrainCircuit className="h-4 w-4" />
          Model output
        </span>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between text-sm font-medium text-slate-700">
          <span>Confidence</span>
          <span>{confidence}%</span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${confidence}%` }} />
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {Object.entries(result.raw_probabilities || {}).map(([label, value]) => (
          <div key={label}>
            <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
              <span>{label}</span>
              <span>{Math.round(value * 100)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-700" style={{ width: `${value * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {result.labels_are_placeholder && (
        <div className="mt-6 flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>The training label mapping is missing. Treat class numbers as anonymous model outputs—not crime categories or safety findings.</p>
        </div>
      )}
    </section>
  );
}
