// components/tutor/VideoTile.tsx
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, UserMinus, Volume2 } from "lucide-react";

interface VideoTileProps {
  participantName: string;
  videoTrack?: any;
  isLocal?: boolean;
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  flagCount?: number;
  riskLevel?: string;
  isSpeaking?: boolean;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  screenSharing?: boolean;
  showActions?: boolean;
  onFlag?: () => void;
  onKick?: () => void;
  onClick?: () => void;
}

export function VideoTile({
  participantName,
  videoTrack,
  isLocal,
  localVideoRef,
  flagCount = 0,
  riskLevel = "LOW",
  isSpeaking,
  videoEnabled,
  audioEnabled,
  screenSharing,
  showActions,
  onFlag,
  onKick,
  onClick,
}: VideoTileProps) {
  const internalRef = useRef<HTMLVideoElement>(null);
  const videoRef = (isLocal && localVideoRef) ? localVideoRef : internalRef;

  useEffect(() => {
    const el = videoRef.current;
    if (videoTrack && el) {
      videoTrack.attach(el);
      return () => { videoTrack.detach(el); };
    }
  }, [videoTrack, videoRef]);

  const riskColor =
    {
      LOW: "ring-1 border-green-400",
      MEDIUM: "ring-2 ring-yellow-500 border-yellow-400",
      HIGH: "ring-3 ring-orange-500 border-orange-400",
      CRITICAL: "ring-4 ring-red-500 border-red-400",
    }[riskLevel] || "border-white/20";

  return (
    <div
      className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border cursor-pointer transition-all hover:border-blue-400 ${riskColor}`}
      onClick={onClick}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted={isLocal}
      />

      {/* Bottom overlay */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
        <img
          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participantName}`}
          alt=""
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm font-medium">{participantName}</span>
        {isSpeaking && <Volume2 className="w-4 h-4 text-green-400" />}
      </div>

      {/* Media status badges */}
      {!isLocal && (
        <div className="absolute top-3 left-3 flex gap-1">
          {!videoEnabled && (
            <Badge className="bg-red-500 text-white">Video Off</Badge>
          )}
          {!audioEnabled && (
            <Badge className="bg-red-500 text-white">Muted</Badge>
          )}
          {screenSharing && (
            <Badge className="bg-blue-400 text-black">Screen Share</Badge>
          )}
        </div>
      )}

      {/* Flag count and risk level */}
      {flagCount > 0 && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <Badge className="bg-red-500 text-white flex items-center gap-1">
            <Flag className="w-3 h-3" /> {flagCount}
          </Badge>
          <Badge className={`${riskColor.split(" ")[0]} text-white`}>
            {riskLevel}
          </Badge>
        </div>
      )}

      {/* Tutor action buttons */}
      {showActions && (
        <div className="absolute top-3 right-3 flex gap-1">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onFlag?.();
            }}
            className="bg-red-500 hover:bg-red-600 rounded-full w-8 h-8 p-0"
          >
            <Flag className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onKick?.();
            }}
            className="bg-orange-500 hover:bg-orange-600 rounded-full w-8 h-8 p-0"
          >
            <UserMinus className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
