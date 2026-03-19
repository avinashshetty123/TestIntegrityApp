// components/EnhancedStudentMeetingRoom.tsx
import { useRef, useState, useEffect } from "react";
import { useLiveKitRoom } from "../hooks/useLivekitRoom";
import { useMediaControls } from "../hooks/useMediaControl";
import { useProctoring } from "../hooks/useProctoring";
import { MeetingRoomLayout } from "./MeetingRoomLayout";
import { VideoGrid } from "./VideoGrid";
import { MeetingControls } from "./MeetingControl";
import { ProctoringAlertsPanel } from "./ProcotoringPanel";
import StudentQuizPanel from "@/components/StudentQuizPanel";
import { ConnectionStatus } from "./ConnectionStatus";

export default function EnhancedStudentMeetingRoom({
  token,
  serverUrl,
  onDisconnect,
  userInfo,
  meetingId,
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [showQuizPanel, setShowQuizPanel] = useState(false);

  const {
    room,
    isConnected,
    isConnecting,
    connectionError,
    tutorParticipant,
    localVideoTrack,
    disconnect,
  } = useLiveKitRoom(token, serverUrl, userInfo);

  const {
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
  } = useMediaControls(room);

  const electronAvailable = typeof window !== "undefined" && !!window.electronAPI;

  const {
    alerts,
    isActive: isProctoringActive,
    faceDetectionStatus,
    identityStatus,
    identitySimilarity,
    stopProctoring,
  } = useProctoring({
    meetingId,
    userId: userInfo?.id,
    isVideoEnabled,
    localVideoRef,
    localVideoTrack,
    room,
    userInfo,
    electronAvailable,
  });

  // Stop proctoring when room disconnects (tutor ends meeting or network drop)
  useEffect(() => {
    if (!isConnected && isProctoringActive) {
      stopProctoring();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  if (!isConnected) {
    return (
      <ConnectionStatus
        isConnecting={isConnecting}
        error={connectionError}
        onRetry={() => {}}
      />
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-gray-900 overflow-hidden flex flex-col">
      <MeetingRoomLayout
        onBack={() => {
          stopProctoring();
          disconnect();
          onDisconnect?.();
        }}
        leftPanel={
          <div className="relative h-full">
            <VideoGrid
              localVideoRef={localVideoRef}
              localVideoTrack={localVideoTrack}
              localParticipantName={userInfo?.fullname}
              tutorParticipant={tutorParticipant}
              isProctoringActive={isProctoringActive}
              faceDetectionStatus={faceDetectionStatus}
              identityStatus={identityStatus}
              identitySimilarity={identitySimilarity}
            />
            <ProctoringAlertsPanel alerts={alerts} />
          </div>
        }
        rightPanel={
          showQuizPanel ? (
            <StudentQuizPanel
              meetingId={meetingId}
              isConnected={isConnected}
              userInfo={userInfo}
            />
          ) : null
        }
        controls={
          <MeetingControls
            isAudioEnabled={isAudioEnabled}
            isVideoEnabled={isVideoEnabled}
            isScreenSharing={isScreenSharing}
            onToggleAudio={toggleAudio}
            onToggleVideo={toggleVideo}
            onToggleScreenShare={toggleScreenShare}
            onToggleQuiz={() => setShowQuizPanel(!showQuizPanel)}
            onDisconnect={() => {
              stopProctoring();
              disconnect();
              onDisconnect?.();
            }}
            showQuizPanel={showQuizPanel}
          />
        }
      />
    </div>
  );
}
