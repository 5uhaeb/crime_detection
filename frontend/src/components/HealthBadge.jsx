import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function HealthBadge({ health, loading }) {
  if (loading) {
    return (
      <span className="status-badge border-slate-200 bg-white text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking API
      </span>
    );
  }

  const healthy = health?.status === "ok";

  return (
    <span
      className={
        healthy
          ? "status-badge border-emerald-200 bg-emerald-50 text-emerald-700"
          : "status-badge border-amber-200 bg-amber-50 text-amber-800"
      }
      title={health?.message || "Backend status unavailable"}
    >
      {healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {healthy ? "API ready" : "API degraded"}
    </span>
  );
}
