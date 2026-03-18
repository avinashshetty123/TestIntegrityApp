// hooks/useLiveKitTutorRoom.ts
import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client';

export function useLiveKitTutorRoom(token: string, serverUrl: string, meetingId: string, userInfo?: any) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null);
  const localVideoTrackRef = useRef<any>(null);
  const roomRef = useRef<Room | null>(null);
  const connectedRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectedRef.current) return;
    connectedRef.current = true;
    setIsConnecting(true);
    setConnectionError(null);

    const newRoom = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: { resolution: { width: 1280, height: 720 } },
      audioCaptureDefaults: { echoCancellation: true },
    });

    newRoom.on(RoomEvent.Connected, async () => {
      setIsConnected(true);
      setIsConnecting(false);
      setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
      // Auto-enable camera + mic immediately on connect
      try { await newRoom.localParticipant.setCameraEnabled(true); } catch (e) { console.warn('Camera enable failed:', e); }
      try { await newRoom.localParticipant.setMicrophoneEnabled(true); } catch (e) { console.warn('Mic enable failed:', e); }
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      setRemoteParticipants([]);
      connectedRef.current = false;
    });

    newRoom.on(RoomEvent.ParticipantConnected, () => {
      setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, () => {
      // Snapshot the current live list — this is what drives removal
      setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
    });

    // Re-snapshot on any track mute/unmute so participant media state refreshes
    const refreshParticipants = () => {
      setRemoteParticipants(Array.from(newRoom.remoteParticipants.values()));
    };
    newRoom.on(RoomEvent.TrackMuted, refreshParticipants);
    newRoom.on(RoomEvent.TrackUnmuted, refreshParticipants);
    newRoom.on(RoomEvent.TrackSubscribed, refreshParticipants);
    newRoom.on(RoomEvent.TrackUnsubscribed, refreshParticipants);

    // Track local video track for UI
    newRoom.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.kind === Track.Kind.Video) {
        localVideoTrackRef.current = pub.track;
        setLocalVideoTrack(pub.track);
      }
    });

    newRoom.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.kind === Track.Kind.Video) {
        localVideoTrackRef.current = null;
        setLocalVideoTrack(null);
      }
    });

    try {
      const urls = [
        serverUrl.startsWith('ws') ? serverUrl : `ws://${serverUrl}`,
        'ws://localhost:7880',
      ];
      let connected = false;
      for (const url of urls) {
        try {
          await newRoom.connect(url, token, { autoSubscribe: true });
          connected = true;
          break;
        } catch (e) {
          console.warn(`Failed to connect to ${url}`, e);
        }
      }
      if (!connected) throw new Error('Could not connect to any LiveKit server');
      roomRef.current = newRoom;
      setRoom(newRoom);
    } catch (err: any) {
      setConnectionError(err.message);
      setIsConnecting(false);
      connectedRef.current = false;
    }
  }, [token, serverUrl]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  const sendData = useCallback((data: any) => {
    const r = roomRef.current;
    if (r?.localParticipant) {
      r.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    room,
    isConnected,
    isConnecting,
    connectionError,
    remoteParticipants,
    localVideoTrack,
    localVideoTrackRef,
    disconnect,
    sendData,
  };
}
