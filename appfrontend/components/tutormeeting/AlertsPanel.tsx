import { Bell, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProctoringAlert } from "@/components/hooks/useProcotoringAlerts";

interface AlertsPanelProps {
  alerts: ProctoringAlert[];
  onMarkRead?: () => void;
  open?: boolean;
  onClose?: () => void;
}

const severityColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500/20 border-red-400";
    case "HIGH":
      return "bg-orange-500/20 border-orange-400";
    case "MEDIUM":
      return "bg-yellow-500/20 border-yellow-400";
    default:
      return "bg-white/10 border-white/20";
  }
};

const severityBadgeColor = (severity: string) => {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-yellow-500";
    default:
      return "bg-gray-500";
  }
};

const alertTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    FACE_NOT_DETECTED: "bg-orange-500",
    MULTIPLE_FACES: "bg-red-500",
    PHONE_DETECTED: "bg-purple-500",
    TAB_SWITCH: "bg-blue-500",
    SUSPICIOUS_BEHAVIOR: "bg-yellow-500",
    COPY_PASTE: "bg-pink-500",
    WINDOW_SWITCH: "bg-indigo-500",
    NO_FACE: "bg-orange-400",
    VOICE_DETECTED: "bg-green-400",
    VOICE_WITHOUT_FACE: "bg-emerald-500",
    GAZE_DEVIATION: "bg-amber-500",
    SUSTAINED_SPEECH: "bg-teal-500",
    IDENTITY_MISMATCH: "bg-rose-600",
    MANUAL_FLAG: "bg-red-600",
    PARTICIPANT_LEFT: "bg-gray-600",
  };
  return colors[type] || "bg-gray-500";
};

export function AlertsPanel({ alerts, open = true, onClose }: AlertsPanelProps) {
  const totalHighRisk = alerts.filter((alert) =>
    ["HIGH", "CRITICAL"].includes(alert.severity),
  ).length;

  const content = (
    <>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <p className="text-[11px] text-gray-400">Total</p>
          <p className="text-lg font-semibold text-white">{alerts.length}</p>
        </div>
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-2">
          <p className="text-[11px] text-red-200">High risk</p>
          <p className="text-lg font-semibold text-white">{totalHighRisk}</p>
        </div>
      </div>
      <p className="text-xs text-green-400 mb-3">
        Real-time AI analysis from student camera and browser activity
      </p>
      <div className="overflow-y-auto flex-1 space-y-3 pr-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {alerts.map((alert, index) => {
          const isRecent =
            Date.now() - new Date(alert.timestamp).getTime() < 30000;

          return (
            <Card
              key={`${alert.id}-${index}`}
              className={`border p-3 backdrop-blur-sm transition-all ${severityColor(alert.severity)} ${isRecent ? "ring-2 ring-blue-400" : ""}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      className={`${alertTypeColor(alert.alertType)} text-xs text-white`}
                    >
                      {alert.alertType.replace(/_/g, " ")}
                    </Badge>
                    <Badge
                      className={`${severityBadgeColor(alert.severity)} text-xs text-white`}
                    >
                      {alert.severity}
                    </Badge>
                    {isRecent && (
                      <Badge className="animate-pulse bg-blue-500 text-xs text-white">
                        NEW
                      </Badge>
                    )}
                  </div>

                  <p className="mb-1 text-sm font-medium text-white">
                    {alert.participant?.name ||
                      alert.studentName ||
                      alert.participantId ||
                      "Unknown Participant"}
                  </p>

                  {(alert.participant?.userId || alert.userId || alert.participantId) && (
                    <p className="mb-1 text-[11px] text-sky-200">
                      User ID: {alert.participant?.userId || alert.userId || alert.participantId}
                    </p>
                  )}

                  {alert.participant?.email && (
                    <p className="mb-1 text-xs text-gray-400">
                      {alert.participant.email}
                    </p>
                  )}

                  <p className="mb-2 text-xs text-gray-300">{alert.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{Math.round(alert.confidence * 100)}% confidence</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
        {alerts.length === 0 && (
          <div className="py-8 text-center text-gray-400">
            <Eye className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No alerts detected yet</p>
            <p className="mt-1 text-xs">AI monitoring is active</p>
          </div>
        )}
      </div>
    </>
  );

  if (onClose !== undefined) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose?.()}>
        <SheetContent
          side="right"
          className="w-[400px] bg-slate-900/95 border-white/10 text-white p-4"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="flex items-center gap-2 text-white">
              <Bell className="h-5 w-5" />
              Live Alerts ({alerts.length})
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  // Inline mode (legacy — used when sidePanel slot renders it)
  return (
    <>
      <div className="border-b border-white/20 p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Bell className="h-5 w-5" />
          Live Alerts ({alerts.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{content}</div>
    </>
  );
}
