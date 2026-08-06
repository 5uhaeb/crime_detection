import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export default function HealthBadge({ health, loading }) {
  if (loading) {
    return (
      <span className="status-badge">
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
          ? "status-badge"
          : "status-badge degraded"
      }
      title={health?.message || "Backend status unavailable"}
    >
      {healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {healthy ? "API ready" : "API degraded"}
    </span>
  );
}
