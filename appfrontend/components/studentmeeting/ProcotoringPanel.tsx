import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProctoringAlert } from "../hooks/useProctoring";

interface ProctoringAlertsPanelProps {
  alerts: ProctoringAlert[];
}

const severityStyle = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "border-red-400 bg-red-500/85";
    case "HIGH":
      return "border-orange-400 bg-orange-500/85";
    case "MEDIUM":
      return "border-yellow-400 bg-yellow-500/85 text-slate-950";
    default:
      return "border-slate-200 bg-slate-900/85";
  }
};

export function ProctoringAlertsPanel({
  alerts,
}: ProctoringAlertsPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    if (alerts.length === 0) {
      setDismissedIds([]);
      return;
    }

    const latest = alerts.slice(0, 3);
    const timers = latest.map((alert) =>
      window.setTimeout(() => {
        setDismissedIds((prev) =>
          prev.includes(alert.id) ? prev : [...prev, alert.id],
        );
      }, 6000),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [alerts]);

  const visibleAlerts = useMemo(
    () =>
      alerts
        .filter((alert) => !dismissedIds.includes(alert.id))
        .slice(0, 3),
    [alerts, dismissedIds],
  );

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute right-4 top-4 z-30 flex max-h-[calc(100%-1rem)] w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 overflow-hidden">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className={`pointer-events-auto rounded-xl border px-4 py-3 text-white shadow-2xl backdrop-blur-md transition-all duration-300 ease-out animate-in slide-in-from-right-8 fade-in ${severityStyle(alert.severity)} ${index > 0 ? "scale-[0.98]" : ""}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 gap-3">
              <div className="mt-0.5 shrink-0">
                {alert.severity === "LOW" ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Badge className="bg-black/30 text-[10px] text-white">
                    {alert.alertType.replace(/_/g, " ")}
                  </Badge>
                  <span className="text-[11px] opacity-85">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm font-medium">
                  {alert.description}
                </p>
                <p className="mt-1 text-xs opacity-85">
                  {Math.round(alert.confidence * 100)}% confidence
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setDismissedIds((prev) =>
                  prev.includes(alert.id) ? prev : [...prev, alert.id],
                )
              }
              className="rounded-md p-1 text-white/80 hover:bg-black/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
