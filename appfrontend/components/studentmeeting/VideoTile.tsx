import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";

interface VideoTileProps {
  participantName?: string;
  isLocal?: boolean;
  videoTrack?: any;
  videoEnabled?: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  proctoringStatus?: string;
  isProctoringActive?: boolean;
  showRecordingIndicator?: boolean;
  identityStatus?: "unknown" | "verified" | "mismatch" | "no_ref";
  identitySimilarity?: number | null;
}

export function VideoTile({
  participantName = "You",
  isLocal = false,
  videoTrack,
  videoEnabled = true,
  localVideoRef,
  proctoringStatus,
  isProctoringActive,
  showRecordingIndicator,
  identityStatus,
  identitySimilarity,
}: VideoTileProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = isLocal && localVideoRef ? localVideoRef : internalRef;

  useEffect(() => {
    const element = videoRef.current;
    if (videoTrack && element) {
      videoTrack.attach(element);
      return () => {
        try { videoTrack.detach(element); } catch {}
      };
    }
  // videoRef is a stable ref object — depend on videoTrack only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoTrack]);

  return (
    <div className="relative min-h-[200px] overflow-hidden rounded-xl border border-white/20 bg-gray-900 shadow-2xl">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        playsInline
        muted={isLocal}
      />

      {(!videoTrack || !videoEnabled) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <img
              src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participantName}`}
              alt={participantName}
              className="mx-auto mb-2 h-16 w-16 rounded-full opacity-60"
            />
            <p className="text-sm text-gray-400">{participantName}</p>
            <p className="mt-1 text-xs text-gray-500">
              {videoEnabled ? "Connecting video" : "Camera off"}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-white backdrop-blur-sm">
        <img
          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participantName}`}
          alt={participantName}
          className="h-5 w-5 rounded-full"
        />
        <span className="text-sm font-medium">{participantName}</span>
      </div>

      {isLocal && (
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <Badge className={isProctoringActive ? "bg-green-500" : "bg-red-500"}>
            {isProctoringActive ? "Monitoring" : "Inactive"}
          </Badge>
          {proctoringStatus && (
            <Badge className="bg-blue-500 text-xs text-white">
              {proctoringStatus}
            </Badge>
          )}
          {/* Identity verification badge */}
          {identityStatus && identityStatus !== "no_ref" && (
            <Badge
              className={`text-xs text-white font-semibold ${
                identityStatus === "verified"
                  ? "bg-green-600"
                  : identityStatus === "mismatch"
                  ? "bg-red-600 animate-pulse"
                  : "bg-yellow-500"
              }`}
            >
              {identityStatus === "verified"
                ? "✓ Identity Verified"
                : identityStatus === "mismatch"
                ? "⚠ Identity Mismatch"
                : "Verifying identity..."}
            </Badge>
          )}
        </div>
      )}

      {showRecordingIndicator && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs text-white animate-pulse">
          <div className="h-2 w-2 rounded-full bg-white" />
          Recording
        </div>
      )}
    </div>
  );
}
