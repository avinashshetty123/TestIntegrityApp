"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Flag } from "lucide-react";
import { useLiveKitTutorRoom } from "../hooks/useLivekitRoomtutor";
import { useParticipantManagement } from "../hooks/useParticipantManagment";
import { useProctoringAlerts } from "../hooks/useProcotoringAlerts";
import { useJoinRequests } from "../hooks/useJoinRequest";
import { useMeetingControls } from "../hooks/useMeetingControls";
import { useToast } from "../ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { TutorMeetingLayout } from "./TutorMeetingLayout";
import { VideoGrid } from "./VideoGrid";
import { TutorControls } from "./TutorControls";
import { ParticipantsPanel } from "./ParticipantPanel";
import { JoinRequestsPanel } from "./JoinRequest";
import { AlertsPanel } from "./AlertsPanel";
import QuizPanel from "@/components/QuizPanel";
import { ConnectionStatus } from "../studentmeeting/ConnectionStatus";

interface VideoCallProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
  userInfo?: {
    fullname?: string;
    id?: string;
  };
  meetingId: string;
}

export default function EnhancedTutorMeetingRoom({
  token,
  serverUrl,
  onDisconnect,
  userInfo,
  meetingId,
}: VideoCallProps) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(
    null,
  );
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  const {
    room,
    isConnected,
    isConnecting,
    connectionError,
    remoteParticipants,
    localVideoTrack,
    disconnect,
    sendData,
  } = useLiveKitTutorRoom(token, serverUrl, meetingId, userInfo);

  const {
    participants,
    updateParticipantAfterAlert,
    updateParticipantState,
    setSpeaking,
    flagParticipantLocally,
    removeParticipant,
  } = useParticipantManagement(remoteParticipants);

  const { liveAlerts, unreadCount, meetingFlags, addAlert, markAsRead } =
    useProctoringAlerts(meetingId, true, sendData, (alert) => {
      if (alert.participantId) {
        updateParticipantAfterAlert(alert.participantId, alert);
      }
    });

  const { requests: joinRequests, respondToRequest } = useJoinRequests(
    meetingId,
    true,
    showJoinRequests,
  );

  const {
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isMeetingLocked,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMeetingLock,
  } = useMeetingControls(room, meetingId);

  useEffect(() => {
    if (!room) return;

    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "PROCTORING_ALERT") {
          addAlert(data.data);
          updateParticipantAfterAlert(data.data.participantId, data.data);
        } else if (data.type === "PARTICIPANT_STATE_UPDATE") {
          updateParticipantState(data.data);
        }
      } catch {}
    };

    room.on("dataReceived", handleData);
    return () => {
      room.off("dataReceived", handleData);
    };
  }, [addAlert, room, updateParticipantAfterAlert, updateParticipantState]);

  useEffect(() => {
    if (!room) return;

    const handleLeft = (participant: any) => {
      addAlert({
        id: `left-${participant.identity}-${Date.now()}`,
        alertType: "PARTICIPANT_LEFT",
        description: `${participant.name || participant.identity} left the meeting`,
        confidence: 1,
        severity: "HIGH",
        participantId: participant.identity,
        studentName: participant.name || participant.identity,
        timestamp: new Date().toISOString(),
      });
    };

    room.on("participantDisconnected", handleLeft);
    return () => {
      room.off("participantDisconnected", handleLeft);
    };
  }, [addAlert, room]);

  useEffect(() => {
    if (!room) return;

    const handleSpeakers = (speakers: any[]) => setSpeaking(speakers);
    room.on("activeSpeakersChanged", handleSpeakers);
    return () => room.off("activeSpeakersChanged", handleSpeakers);
  }, [room, setSpeaking]);

  const handleFlag = async (participantId: string) => {
    flagParticipantLocally(participantId);
    try {
      await fetch(`http://localhost:4000/proctoring/analyze-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId,
          participantId,
          userId: participantId,
          detections: { suspiciousBehavior: true },
          browserData: { manualFlag: true },
        }),
      });
      toast({ title: "Participant flagged" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to flag participant",
        variant: "destructive",
      });
    }
  };

  const handleKick = async (participantId: string) => {
    if (!confirm("Are you sure you want to kick this participant?")) return;

    try {
      const res = await fetch(
        `http://localhost:4000/meetings/${meetingId}/kick-participant`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: participantId }),
        },
      );

      if (res.ok) {
        sendData({
          type: "KICK_NOTIFICATION",
          participantId,
          reason: "Removed by tutor",
        });
        removeParticipant(participantId);
        toast({ title: "Participant kicked" });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to kick participant",
        variant: "destructive",
      });
    }
  };

  if (!isConnected) {
    return (
      <ConnectionStatus
        isConnecting={isConnecting}
        error={connectionError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const sortedParticipants = [...participants].sort(
    (a, b) => b.riskScore - a.riskScore || b.flagCount - a.flagCount,
  );
  const mainParticipant = focusedParticipant
    ? participants.find((participant) => participant.identity === focusedParticipant)
    : sortedParticipants[0];

  let sidePanel = null;
  if (showParticipants) {
    sidePanel = (
      <ParticipantsPanel
        participants={sortedParticipants}
        onFlag={handleFlag}
        onKick={handleKick}
        onFocus={setFocusedParticipant}
      />
    );
  } else if (showJoinRequests) {
    sidePanel = (
      <JoinRequestsPanel requests={joinRequests} onRespond={respondToRequest} />
    );
  } else if (showAlerts) {
    sidePanel = null; // rendered as Sheet below
  } else if (showQuiz) {
    sidePanel = (
      <QuizPanel
        meetingId={meetingId}
        isConnected={isConnected}
        userInfo={userInfo}
      />
    );
  }

  return (
    <>
    <TutorMeetingLayout
      header={
        <div className="flex items-center justify-between border-b border-white/10 bg-black/20 p-4 shadow-lg backdrop-blur-3xl">
          <h2 className="text-xl font-bold text-white">Tutor Meeting Room</h2>
          <div className="flex gap-2">
            <Badge className={isMeetingLocked ? "bg-red-400" : "bg-green-400"}>
              {isMeetingLocked ? "Locked" : "Unlocked"}
            </Badge>
            <Badge className="bg-blue-400">
              {participants.length} Participants
            </Badge>
            {liveAlerts.length > 0 && (
              <Badge className="flex items-center gap-1 bg-red-400">
                <Bell className="h-3 w-3" /> {liveAlerts.length}
              </Badge>
            )}
            {meetingFlags.length > 0 && (
              <Badge className="flex items-center gap-1 bg-purple-400">
                <Flag className="h-3 w-3" /> {meetingFlags.length}
              </Badge>
            )}
          </div>
        </div>
      }
      videoArea={
        <VideoGrid
          localVideoRef={localVideoRef}
          localVideoTrack={localVideoTrack}
          localName={userInfo?.fullname}
          participants={participants}
          mainParticipant={mainParticipant}
          onFocus={setFocusedParticipant}
          onFlag={handleFlag}
          onKick={handleKick}
          showActions
        />
      }
      controls={
        <TutorControls
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          isScreenSharing={isScreenSharing}
          isMeetingLocked={isMeetingLocked}
          participantCount={participants.length}
          joinRequestCount={joinRequests.length}
          unreadAlertCount={unreadCount}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onToggleScreenShare={toggleScreenShare}
          onToggleParticipants={() => {
            setShowParticipants(!showParticipants);
            setShowJoinRequests(false);
            setShowAlerts(false);
            setShowQuiz(false);
          }}
          onToggleJoinRequests={() => {
            setShowJoinRequests(!showJoinRequests);
            setShowParticipants(false);
            setShowAlerts(false);
            setShowQuiz(false);
          }}
          onToggleAlerts={() => {
            setShowAlerts(!showAlerts);
            markAsRead();
            setShowParticipants(false);
            setShowJoinRequests(false);
            setShowQuiz(false);
          }}
          onToggleLock={toggleMeetingLock}
          onToggleQuiz={() => {
            setShowQuiz(!showQuiz);
            setShowParticipants(false);
            setShowJoinRequests(false);
            setShowAlerts(false);
          }}
          onDisconnect={() => {
            disconnect();
            onDisconnect?.();
          }}
          showParticipants={showParticipants}
          showJoinRequests={showJoinRequests}
          showAlerts={showAlerts}
          showQuiz={showQuiz}
        />
      }
      sidePanel={sidePanel}
    />
    <AlertsPanel
      alerts={liveAlerts}
      open={showAlerts}
      onClose={() => setShowAlerts(false)}
    />
    </>
  );
}
