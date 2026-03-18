// components/meeting/MeetingControls.tsx
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MessageSquare,
  PhoneOff,
} from "lucide-react";

interface MeetingControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleQuiz: () => void;
  onDisconnect: () => void;
  showQuizPanel: boolean;
}

export function MeetingControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleQuiz,
  onDisconnect,
  showQuizPanel,
}: MeetingControlsProps) {
  const buttonClass = (
    active?: boolean,
    variant: "audio" | "video" | "screen" | "quiz" = "audio",
  ) => {
    let base = "rounded-full w-14 h-14 p-0 transition-all ";
    if (variant === "audio" || variant === "video") {
      base += active
        ? "bg-white/20 hover:bg-white/30 text-white border-white/30"
        : "bg-red-500 hover:bg-red-600 text-white";
    } else if (variant === "screen") {
      base += active
        ? "bg-blue-500 hover:bg-blue-600 text-white"
        : "bg-white/20 hover:bg-white/30 text-white border-white/30";
    } else if (variant === "quiz") {
      base += active
        ? "bg-green-500 text-white"
        : "bg-white/20 hover:bg-white/30 text-white border-white/30";
    }
    return base;
  };

  return (
    <div className="p-6 bg-black/20 backdrop-blur-3xl border-t border-white/10 shadow-lg flex justify-center items-center gap-4">
      <Button
        onClick={onToggleAudio}
        variant="outline"
        size="lg"
        className={buttonClass(isAudioEnabled, "audio")}
        title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
      >
        {isAudioEnabled ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </Button>

      <Button
        onClick={onToggleVideo}
        variant="outline"
        size="lg"
        className={buttonClass(isVideoEnabled, "video")}
        title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
      >
        {isVideoEnabled ? (
          <Video className="w-6 h-6" />
        ) : (
          <VideoOff className="w-6 h-6" />
        )}
      </Button>

      <Button
        onClick={onToggleScreenShare}
        variant="outline"
        size="lg"
        className={buttonClass(isScreenSharing, "screen")}
        title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
      >
        <Monitor className="w-6 h-6" />
      </Button>

      <Button
        onClick={onToggleQuiz}
        variant="outline"
        size="lg"
        className={buttonClass(showQuizPanel, "quiz")}
        title="Toggle quiz panel"
      >
        <MessageSquare className="w-6 h-6" />
      </Button>

      <Button
        onClick={onDisconnect}
        variant="destructive"
        size="lg"
        className="rounded-full w-14 h-14 p-0 bg-gradient-to-r from-red-500 to-red-600 text-white hover:scale-105 transition-all shadow-xl"
        title="Leave meeting"
      >
        <PhoneOff className="w-6 h-6" />
      </Button>
    </div>
  );
}
