// hooks/useMediaControls.ts
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';

export function useMediaControls(room: Room | null) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (!room) return;

    // Sync initial state from already-published tracks
    room.localParticipant.trackPublications.forEach((pub) => {
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) setIsVideoEnabled(!pub.isMuted);
      if (pub.kind === Track.Kind.Audio) setIsAudioEnabled(!pub.isMuted);
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) setIsScreenSharing(true);
    });

    const handlePublished = (pub: any) => {
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) setIsVideoEnabled(true);
      if (pub.kind === Track.Kind.Audio) setIsAudioEnabled(true);
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) setIsScreenSharing(true);
    };
    const handleUnpublished = (pub: any) => {
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) setIsVideoEnabled(false);
      if (pub.kind === Track.Kind.Audio) setIsAudioEnabled(false);
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) setIsScreenSharing(false);
    };
    // setMicrophoneEnabled(false) mutes without unpublishing — sync from mute events
    const handleMuted = (pub: any) => {
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) setIsVideoEnabled(false);
      if (pub.kind === Track.Kind.Audio) setIsAudioEnabled(false);
    };
    const handleUnmuted = (pub: any) => {
      if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) setIsVideoEnabled(true);
      if (pub.kind === Track.Kind.Audio) setIsAudioEnabled(true);
    };

    room.on(RoomEvent.LocalTrackPublished, handlePublished);
    room.on(RoomEvent.LocalTrackUnpublished, handleUnpublished);
    room.on(RoomEvent.LocalTrackMuted, handleMuted);
    room.on(RoomEvent.LocalTrackUnmuted, handleUnmuted);

    return () => {
      room.off(RoomEvent.LocalTrackPublished, handlePublished);
      room.off(RoomEvent.LocalTrackUnpublished, handleUnpublished);
      room.off(RoomEvent.LocalTrackMuted, handleMuted);
      room.off(RoomEvent.LocalTrackUnmuted, handleUnmuted);
    };
  }, [room]);

  const toggleVideo = useCallback(async () => {
    if (!room?.localParticipant) return;
    const newState = !isVideoEnabled;
    await room.localParticipant.setCameraEnabled(newState);
    setIsVideoEnabled(newState);
  }, [room, isVideoEnabled]);

  const toggleAudio = useCallback(async () => {
    if (!room?.localParticipant) return;
    const newState = !isAudioEnabled;
    await room.localParticipant.setMicrophoneEnabled(newState);
    setIsAudioEnabled(newState);
  }, [room, isAudioEnabled]);

  const toggleScreenShare = useCallback(async () => {
    if (!room?.localParticipant) return;
    const newState = !isScreenSharing;
    await room.localParticipant.setScreenShareEnabled(newState);
    setIsScreenSharing(newState);
  }, [room, isScreenSharing]);

  return {
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
  };
}
