// components/meeting/VideoGrid.tsx
import { VideoTile } from "./VideoTile";
import { RemoteParticipant, Track, TrackEvent } from "livekit-client";
import { useEffect, useRef, useState } from "react";

interface VideoGridProps {
  localVideoRef?: React.RefObject<HTMLVideoElement>;
  localVideoTrack?: any;
  localParticipantName?: string;
  tutorParticipant?: RemoteParticipant | null;
  isProctoringActive?: boolean;
  faceDetectionStatus?: string;
  identityStatus?: "unknown" | "verified" | "mismatch" | "no_ref";
  identitySimilarity?: number | null;
}

export function VideoGrid({
  localVideoRef,
  localVideoTrack,
  localParticipantName = "You",
  tutorParticipant,
  isProctoringActive,
  faceDetectionStatus,
  identityStatus,
  identitySimilarity,
}: VideoGridProps) {
  const [tutorVideoTrack, setTutorVideoTrack] = useState<any>(null);
  const [tutorScreenTrack, setTutorScreenTrack] = useState<any>(null);
  const [isTutorVideoEnabled, setIsTutorVideoEnabled] = useState(false);
  const [tutorAudioTrack, setTutorAudioTrack] = useState<any>(null);
  const tutorAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!tutorParticipant) {
      setTutorVideoTrack(null);
      setTutorScreenTrack(null);
      return;
    }

    const refreshTracks = () => {
      let camTrack: any = null;
      let screenTrack: any = null;
      let audioTrack: any = null;

      tutorParticipant.videoTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed && typeof pub.setSubscribed === "function") {
          void pub.setSubscribed(true);
        }
        if (!pub.track) return;
        if (pub.source === Track.Source.ScreenShare) {
          screenTrack = pub.track;
        } else if (pub.source === Track.Source.Camera) {
          camTrack = pub.track;
        } else if (!camTrack) {
          camTrack = pub.track;
        }
      });

      tutorParticipant.audioTrackPublications.forEach((pub) => {
        if (!pub.isSubscribed && typeof pub.setSubscribed === "function") {
          void pub.setSubscribed(true);
        }
        if (!audioTrack && pub.track) {
          audioTrack = pub.track;
        }
      });

      setTutorVideoTrack(camTrack);
      setTutorScreenTrack(screenTrack);
      setTutorAudioTrack(audioTrack);
      setIsTutorVideoEnabled(
        Array.from(tutorParticipant.videoTrackPublications.values()).some(
          (pub) => pub.source === Track.Source.Camera && !pub.isMuted,
        ),
      );
    };

    refreshTracks();
    // Retry after 1s in case subscription is still in progress
    const retryTimer = setTimeout(refreshTracks, 1000);

    tutorParticipant.on(TrackEvent.TrackSubscribed, refreshTracks);
    tutorParticipant.on(TrackEvent.TrackUnsubscribed, refreshTracks);
    tutorParticipant.on(TrackEvent.TrackPublished, refreshTracks);
    tutorParticipant.on(TrackEvent.TrackUnpublished, refreshTracks);
    tutorParticipant.on(TrackEvent.TrackMuted, refreshTracks);
    tutorParticipant.on(TrackEvent.TrackUnmuted, refreshTracks);

    return () => {
      clearTimeout(retryTimer);
      tutorParticipant.off(TrackEvent.TrackSubscribed, refreshTracks);
      tutorParticipant.off(TrackEvent.TrackUnsubscribed, refreshTracks);
      tutorParticipant.off(TrackEvent.TrackPublished, refreshTracks);
      tutorParticipant.off(TrackEvent.TrackUnpublished, refreshTracks);
      tutorParticipant.off(TrackEvent.TrackMuted, refreshTracks);
      tutorParticipant.off(TrackEvent.TrackUnmuted, refreshTracks);
    };
  }, [tutorParticipant]);

  useEffect(() => {
    const audioElement = tutorAudioRef.current;
    if (tutorAudioTrack && audioElement) {
      tutorAudioTrack.attach(audioElement);
      return () => {
        tutorAudioTrack.detach(audioElement);
      };
    }
  }, [tutorAudioTrack]);

  const cols = tutorScreenTrack ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2";

  return (
    <div className={`grid ${cols} gap-6 h-full`}>
      <audio ref={tutorAudioRef} autoPlay playsInline />
      {/* Local video tile */}
      <VideoTile
        participantName={localParticipantName}
        isLocal
        videoTrack={localVideoTrack}
        videoEnabled={!!localVideoTrack}
        localVideoRef={localVideoRef}
        proctoringStatus={faceDetectionStatus}
        isProctoringActive={isProctoringActive}
        showRecordingIndicator={isProctoringActive}
        identityStatus={identityStatus}
        identitySimilarity={identitySimilarity}
      />

      {/* Tutor camera tile - only render when tutor is present */}
      {tutorParticipant && (
        <VideoTile
          participantName={tutorParticipant?.name || "Tutor"}
          videoTrack={tutorVideoTrack}
          videoEnabled={isTutorVideoEnabled}
        />
      )}

      {/* Tutor screen share tile */}
      {tutorScreenTrack && (
        <VideoTile
          participantName={`${tutorParticipant?.name || "Tutor"} - Screen`}
          videoTrack={tutorScreenTrack}
        />
      )}
    </div>
  );
}
