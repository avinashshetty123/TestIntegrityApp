import { useEffect, useState, useCallback, useRef } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  LocalTrack,
  Track,
} from "livekit-client";

export function useLiveKitRoom(
  token: string,
  serverUrl: string,
  userInfo?: any,
) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [tutorParticipant, setTutorParticipant] =
    useState<RemoteParticipant | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalTrack | null>(
    null,
  );
  const roomRef = useRef<Room | null>(null);
  const connectedRef = useRef(false);

  const syncTutorParticipant = useCallback((activeRoom: Room) => {
    const participants = Array.from(activeRoom.remoteParticipants.values());
    setTutorParticipant(participants[0] ?? null);
  }, []);

  const syncLocalTracks = useCallback((activeRoom: Room) => {
    let cameraTrack: LocalTrack | null = null;
    activeRoom.localParticipant.trackPublications.forEach((publication) => {
      if (
        publication.kind === Track.Kind.Video &&
        publication.source === Track.Source.Camera
      ) {
        cameraTrack = (publication.track as LocalTrack) ?? null;
      }
    });
    setLocalVideoTrack(cameraTrack);
  }, []);

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
      syncTutorParticipant(newRoom);
      syncLocalTracks(newRoom);

      try {
        await newRoom.localParticipant.setCameraEnabled(true);
      } catch (error) {
        console.warn("Camera enable failed:", error);
      }

      try {
        await newRoom.localParticipant.setMicrophoneEnabled(true);
      } catch (error) {
        console.warn("Mic enable failed:", error);
      }
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setIsConnected(false);
      setTutorParticipant(null);
      setLocalVideoTrack(null);
      connectedRef.current = false;
    });

    const refreshParticipantState = () => {
      syncTutorParticipant(newRoom);
      syncLocalTracks(newRoom);
    };

    newRoom.on(RoomEvent.ParticipantConnected, refreshParticipantState);
    newRoom.on(RoomEvent.ParticipantDisconnected, refreshParticipantState);
    newRoom.on(RoomEvent.TrackSubscribed, refreshParticipantState);
    newRoom.on(RoomEvent.TrackUnsubscribed, refreshParticipantState);
    newRoom.on(RoomEvent.TrackMuted, refreshParticipantState);
    newRoom.on(RoomEvent.TrackUnmuted, refreshParticipantState);

    newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (
        publication.kind === Track.Kind.Video &&
        publication.source === Track.Source.Camera
      ) {
        setLocalVideoTrack(publication.track as LocalTrack);
      }
    });

    newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (
        publication.kind === Track.Kind.Video &&
        publication.source === Track.Source.Camera
      ) {
        setLocalVideoTrack(null);
      }
    });

    newRoom.on(RoomEvent.DataReceived, (payload) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (
          data.type === "KICK_NOTIFICATION" &&
          data.participantId === userInfo?.id
        ) {
          newRoom.disconnect();
        }
      } catch {}
    });

    try {
      const urls = Array.from(
        new Set([
          serverUrl,
          serverUrl.startsWith("ws") ? serverUrl : `ws://${serverUrl}`,
          "ws://localhost:7880",
        ]),
      );

      let connected = false;
      let lastError: Error | null = null;

      for (const url of urls) {
        try {
          await newRoom.connect(url, token, { autoSubscribe: true });
          roomRef.current = newRoom;
          setRoom(newRoom);
          connected = true;
          break;
        } catch (error: any) {
          lastError = error;
        }
      }

      if (!connected) {
        throw lastError ?? new Error("Could not connect to any LiveKit server");
      }
    } catch (error: any) {
      setConnectionError(error.message);
      setIsConnecting(false);
      connectedRef.current = false;
    }
  }, [serverUrl, syncLocalTracks, syncTutorParticipant, token, userInfo]);

  const disconnect = useCallback(() => {
    roomRef.current?.disconnect();
    roomRef.current = null;
  }, []);

  useEffect(() => {
    void connect();
    return () => {
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, [connect]);

  return {
    room,
    isConnected,
    isConnecting,
    connectionError,
    tutorParticipant,
    localVideoTrack,
    disconnect,
  };
}
