// hooks/useMeetingControls.ts
import { useState, useCallback, useEffect } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { useToast } from '@/components/ui/use-toast';

export function useMeetingControls(room: Room | null, meetingId: string) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const { toast } = useToast();

  // Sync media state from track publish/unpublish events
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
    try {
      const newState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newState);
      setIsVideoEnabled(newState);
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle camera', variant: 'destructive' });
    }
  }, [room, isVideoEnabled, toast]);

  const toggleAudio = useCallback(async () => {
    if (!room?.localParticipant) return;
    try {
      const newState = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(newState);
      setIsAudioEnabled(newState);
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle microphone', variant: 'destructive' });
    }
  }, [room, isAudioEnabled, toast]);

  const toggleScreenShare = useCallback(async () => {
    if (!room?.localParticipant) return;
    try {
      const newState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(newState);
      setIsScreenSharing(newState);
    } catch {
      toast({ title: 'Error', description: 'Failed to toggle screen share', variant: 'destructive' });
    }
  }, [room, isScreenSharing, toast]);

  const toggleMeetingLock = useCallback(async () => {
    try {
      const endpoint = isMeetingLocked ? 'unlock' : 'lock';
      const res = await fetch(`http://localhost:4000/meetings/${meetingId}/${endpoint}`, {
        method: 'PUT',
        credentials: 'include',
      });
      if (res.ok) {
        setIsMeetingLocked(!isMeetingLocked);
        toast({ title: 'Success', description: `Meeting ${!isMeetingLocked ? 'locked' : 'unlocked'}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to update meeting lock', variant: 'destructive' });
    }
  }, [meetingId, isMeetingLocked, toast]);

  return {
    isVideoEnabled,
    isAudioEnabled,
    isScreenSharing,
    isMeetingLocked,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    toggleMeetingLock,
  };
}
