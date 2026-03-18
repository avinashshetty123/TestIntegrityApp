// components/tutor/TutorControls.tsx
import { Button } from "@/components/ui/button";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Users,
  UserPlus,
  Bell,
  Lock,
  Unlock,
  MessageSquare,
  PhoneOff,
} from "lucide-react";

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isMeetingLocked: boolean;
  participantCount: number;
  joinRequestCount: number;
  unreadAlertCount: number;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onToggleParticipants: () => void;
  onToggleJoinRequests: () => void;
  onToggleAlerts: () => void;
  onToggleLock: () => void;
  onToggleQuiz: () => void;
  onDisconnect: () => void;
  showParticipants: boolean;
  showJoinRequests: boolean;
  showAlerts: boolean;
  showQuiz: boolean;
}

export function TutorControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isMeetingLocked,
  participantCount,
  joinRequestCount,
  unreadAlertCount,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleParticipants,
  onToggleJoinRequests,
  onToggleAlerts,
  onToggleLock,
  onToggleQuiz,
  onDisconnect,
  showParticipants,
  showJoinRequests,
  showAlerts,
  showQuiz,
}: ControlsProps) {
  const buttonClass = (active: boolean, special?: string) =>
    `rounded-full w-14 h-14 p-0 transition-all ${active ? special || "bg-blue-500 text-white" : "bg-white/20 hover:bg-white/30 text-white border-white/30"}`;

  return (
    <div className="p-6 bg-black/20 backdrop-blur-3xl border-t border-white/10 shadow-lg flex justify-center items-center gap-4">
      <Button
        onClick={onToggleAudio}
        size="lg"
        className={buttonClass(
          isAudioEnabled,
          isAudioEnabled ? "" : "bg-red-500 hover:bg-red-600",
        )}
      >
        {isAudioEnabled ? <Mic /> : <MicOff />}
      </Button>
      <Button
        onClick={onToggleVideo}
        size="lg"
        className={buttonClass(
          isVideoEnabled,
          isVideoEnabled ? "" : "bg-red-500 hover:bg-red-600",
        )}
      >
        {isVideoEnabled ? <Video /> : <VideoOff />}
      </Button>
      <Button
        onClick={onToggleScreenShare}
        size="lg"
        className={buttonClass(
          isScreenSharing,
          isScreenSharing ? "bg-blue-500" : "",
        )}
      >
        <Monitor />
      </Button>

      <Button
        onClick={onToggleParticipants}
        size="lg"
        className={buttonClass(showParticipants)}
      >
        <Users />
        {participantCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {participantCount}
          </span>
        )}
      </Button>

      <Button
        onClick={onToggleJoinRequests}
        size="lg"
        className={buttonClass(
          showJoinRequests,
          joinRequestCount > 0 ? "bg-yellow-500" : "",
        )}
      >
        <UserPlus />
        {joinRequestCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {joinRequestCount}
          </span>
        )}
      </Button>

      <Button
        onClick={onToggleAlerts}
        size="lg"
        className={buttonClass(
          showAlerts,
          unreadAlertCount > 0 ? "bg-red-500" : "",
        )}
      >
        <Bell />
        {unreadAlertCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadAlertCount}
          </span>
        )}
      </Button>

      <Button
        onClick={onToggleLock}
        size="lg"
        className={`rounded-full w-14 h-14 p-0 transition-all ${isMeetingLocked ? "bg-red-500" : "bg-green-500"}`}
      >
        {isMeetingLocked ? <Lock /> : <Unlock />}
      </Button>

      <Button
        onClick={onToggleQuiz}
        size="lg"
        className={buttonClass(showQuiz)}
      >
        <MessageSquare />
      </Button>

      <Button
        onClick={onDisconnect}
        size="lg"
        className="rounded-full w-14 h-14 p-0 bg-gradient-to-r from-red-500 to-red-600 text-white hover:scale-105"
      >
        <PhoneOff />
      </Button>
    </div>
  );
}
