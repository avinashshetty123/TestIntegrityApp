// components/tutor/VideoGrid.tsx
import { useState, useEffect, useRef } from "react";
import { VideoTile } from "./VideoTile";
import { ParticipantData } from "../hooks/useParticipantManagment";
import { Track, TrackEvent } from "livekit-client";

interface VideoGridProps {
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoTrack?: any;
  localName?: string;
  participants: ParticipantData[];
  mainParticipant?: ParticipantData;
  onFocus: (id: string) => void;
  onFlag: (id: string) => void;
  onKick: (id: string) => void;
  showActions?: boolean;
}

function ParticipantVideoTile({ p, onFlag, onKick, onFocus, showActions }: {
  p: ParticipantData;
  onFlag: () => void;
  onKick: () => void;
  onFocus: () => void;
  showActions: boolean;
}) {
  const [videoTrack, setVideoTrack] = useState<any>(null);
  const [audioTrack, setAudioTrack] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!p.participant) return;

    const refreshTrack = () => {
      let track: any = null;
      let remoteAudioTrack: any = null;
      p.participant.videoTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed && typeof pub.setSubscribed === "function") {
          void pub.setSubscribed(true);
        }
        if (pub.track && pub.source !== Track.Source.ScreenShare) {
          track = pub.track;
        }
      });
      p.participant.audioTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed && typeof pub.setSubscribed === "function") {
          void pub.setSubscribed(true);
        }
        if (!remoteAudioTrack && pub.track) {
          remoteAudioTrack = pub.track;
        }
      });
      setVideoTrack(track);
      setAudioTrack(remoteAudioTrack);
    };

    refreshTrack();
    p.participant.on(TrackEvent.TrackSubscribed, refreshTrack);
    p.participant.on(TrackEvent.TrackUnsubscribed, refreshTrack);
    p.participant.on(TrackEvent.TrackPublished, refreshTrack);
    p.participant.on(TrackEvent.TrackUnpublished, refreshTrack);
    p.participant.on(TrackEvent.TrackMuted, refreshTrack);
    p.participant.on(TrackEvent.TrackUnmuted, refreshTrack);

    return () => {
      p.participant.off(TrackEvent.TrackSubscribed, refreshTrack);
      p.participant.off(TrackEvent.TrackUnsubscribed, refreshTrack);
      p.participant.off(TrackEvent.TrackPublished, refreshTrack);
      p.participant.off(TrackEvent.TrackUnpublished, refreshTrack);
      p.participant.off(TrackEvent.TrackMuted, refreshTrack);
      p.participant.off(TrackEvent.TrackUnmuted, refreshTrack);
    };
  }, [p.participant]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioTrack && audioElement) {
      audioTrack.attach(audioElement);
      return () => {
        audioTrack.detach(audioElement);
      };
    }
  }, [audioTrack]);

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />
      <VideoTile
        participantName={p.displayName}
        videoTrack={videoTrack}
        flagCount={p.flagCount}
        riskLevel={p.riskLevel}
        isSpeaking={p.isSpeaking}
        videoEnabled={p.videoEnabled}
        audioEnabled={p.audioEnabled}
        screenSharing={p.screenSharing}
        showActions={showActions}
        onFlag={onFlag}
        onKick={onKick}
        onClick={onFocus}
      />
    </>
  );
}

export function VideoGrid({
  localVideoRef,
  localVideoTrack,
  localName = "You",
  participants,
  mainParticipant,
  onFocus,
  onFlag,
  onKick,
  showActions = true,
}: VideoGridProps) {
  const totalVideos = participants.length + 1;
  const gridCols =
    totalVideos === 1 ? "grid-cols-1"
    : totalVideos <= 2 ? "grid-cols-2"
    : totalVideos <= 4 ? "grid-cols-2"
    : "grid-cols-3";

  return (
    <div className={`grid gap-3 h-full ${gridCols}`}>
      <VideoTile
        participantName={localName}
        videoTrack={localVideoTrack}
        localVideoRef={localVideoRef}
        isLocal
        showActions={false}
      />
      {participants.map((p) => (
        <ParticipantVideoTile
          key={p.identity}
          p={p}
          onFlag={() => onFlag(p.identity)}
          onKick={() => onKick(p.identity)}
          onFocus={() => onFocus(p.identity)}
          showActions={showActions}
        />
      ))}
    </div>
  );
}
