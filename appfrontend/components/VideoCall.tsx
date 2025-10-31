"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  VideoTrack,
  AudioTrack,
  Participant,
  LocalParticipant,
  createLocalVideoTrack,
  createLocalAudioTrack,
} from "livekit-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Settings,
  MoreVertical,
} from "lucide-react";

interface VideoCallProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
}

interface ParticipantTileProps {
  participant: Participant;
  isLocal?: boolean;
  isMainView?: boolean;
}

/* -------------------- ParticipantTile -------------------- */
const ParticipantTile = ({
  participant,
  isLocal = false,
  isMainView = false,
}: ParticipantTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoTrack, setVideoTrack] = useState<VideoTrack | null>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  useEffect(() => {
    if (!participant) return;

    const updateTracks = () => {
      let foundVideoTrack: VideoTrack | null = null;
      let videoEnabled = false;
      let audioEnabled = false;

      // Prefer participant.tracks if available, else fallback to videoTracks/audioTracks maps
      try {
        // participant.tracks is an iterable of publications in many livekit versions
        // We'll try both patterns to be safe across versions
        // Pattern A: participant.tracks (Map/Iterable of publications)
        if ((participant as any).tracks) {
          const pubs = Array.from((participant as any).tracks.values?.() ?? (participant as any).tracks ?? []);
          pubs.forEach((publication: any) => {
            if (
              publication.kind === "video" &&
              publication.track &&
              !publication.isMuted
            ) {
              foundVideoTrack = publication.track as VideoTrack;
              videoEnabled = true;
            }
            if (publication.kind === "audio" && !publication.isMuted) {
              audioEnabled = true;
            }
          });
        }

        // Pattern B fallback: videoTracks / audioTracks maps (older examples)
        if (!videoEnabled && (participant as any).videoTracks) {
          const videoPub = Array.from((participant as any).videoTracks.values())[0];
          if (videoPub && videoPub.track && !videoPub.isMuted) {
            foundVideoTrack = videoPub.track as VideoTrack;
            videoEnabled = true;
          }
        }

        if (!audioEnabled && (participant as any).audioTracks) {
          const audioPub = Array.from((participant as any).audioTracks.values())[0];
          if (audioPub && !audioPub.isMuted) {
            audioEnabled = true;
          }
        }
      } catch (e) {
        console.warn("track parsing fallback hit", e);
      }

      // Attach / detach logic
      if (foundVideoTrack && videoRef.current) {
        if (videoTrack && videoTrack !== foundVideoTrack) {
          try {
            videoTrack.detach();
          } catch (er) {}
        }
        setVideoTrack(foundVideoTrack);
        try {
          foundVideoTrack.attach(videoRef.current);
        } catch (er) {
          console.warn("attach failed", er);
        }
      } else if (!foundVideoTrack && videoTrack) {
        try {
          videoTrack.detach();
        } catch (er) {}
        setVideoTrack(null);
      }

      setHasVideo(videoEnabled);
      setHasAudio(audioEnabled);

      // debug
      // console.log(`[${participant.identity}] video:${videoEnabled} audio:${audioEnabled}`);
    };

    // initial update (small timeout helps with race conditions)
    setTimeout(updateTracks, 50);

    // register events that indicate tracks changed
    participant.on("trackPublished", updateTracks);
    participant.on("trackUnpublished", updateTracks);
    participant.on("trackSubscribed", updateTracks);
    participant.on("trackUnsubscribed", updateTracks);
    participant.on("trackMuted", updateTracks);
    participant.on("trackUnmuted", updateTracks);

    return () => {
      participant.off("trackPublished", updateTracks);
      participant.off("trackUnpublished", updateTracks);
      participant.off("trackSubscribed", updateTracks);
      participant.off("trackUnsubscribed", updateTracks);
      participant.off("trackMuted", updateTracks);
      participant.off("trackUnmuted", updateTracks);

      if (videoTrack) {
        try {
          videoTrack.detach();
        } catch (er) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participant]);

  const tileClass = isMainView
    ? "relative w-full h-full bg-gray-900 rounded-lg overflow-hidden"
    : "relative aspect-video bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700 hover:border-blue-500 transition-colors";

  return (
    <div className={tileClass}>
      {videoTrack && hasVideo ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted={isLocal}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mb-2 mx-auto">
              {participant.name?.charAt(0).toUpperCase() ||
                participant.identity.charAt(0).toUpperCase()}
            </div>
            <p className="text-white text-sm">
              {isLocal ? "You" : participant.name || participant.identity}
            </p>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-2">
        <div className="bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
          <span>{isLocal ? "You" : participant.name || participant.identity}</span>
          {!hasAudio && <MicOff className="w-3 h-3 text-red-400" />}
        </div>
      </div>

      {!hasVideo && (
        <div className="absolute top-2 right-2">
          <VideoOff className="w-5 h-5 text-red-400" />
        </div>
      )}
    </div>
  );
};

/* -------------------- Main Component -------------------- */
export default function VideoCall({
  token,
  serverUrl,
  onDisconnect,
}: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localParticipant, setLocalParticipant] =
    useState<LocalParticipant | null>(null);
  const [connectionStatus, setConnectionStatus] = useState("Ready to connect");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // safely replace the hostname 'livekit-server' -> 'localhost' if present
  const computeActualServerUrl = (urlCandidate: string) => {
    if (!urlCandidate) return urlCandidate;
    try {
      const u = new URL(urlCandidate);
      if (u.hostname === "livekit-server") {
        u.hostname = "localhost";
        return u.toString();
      }
      return urlCandidate;
    } catch (e) {
      // if URL constructor fails, fallback to simple replace
      return urlCandidate.replace("livekit-server", "localhost");
    }
  };

  const requestPermissions = async () => {
    setIsRequestingPermission(true);
    try {
      await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPermissionGranted(true);
    } catch (err) {
      console.error("Permission denied:", err);
      alert("Camera and microphone access is required for video calls.");
    } finally {
      setIsRequestingPermission(false);
    }
  };

  const connectToRoom = async () => {
    if (!token || !serverUrl || isConnected || !permissionGranted) return;

    setConnectionStatus("Connecting...");
    const newRoom = new Room();
    setRoom(newRoom);

    const updateParticipants = () => {
      // convert remoteParticipants map to array
      const all = Array.from(newRoom.remoteParticipants.values());
      setParticipants(all);
    };

    newRoom.on(RoomEvent.Connected, async () => {
      console.log("Connected to room:", newRoom.name);
      setConnectionStatus("Connected");
      setIsConnected(true);
      setLocalParticipant(newRoom.localParticipant);
      updateParticipants();

      // publish local tracks after connected
      try {
        const videoTrack = await createLocalVideoTrack({ facingMode: "user" });
        const audioTrack = await createLocalAudioTrack();

        await newRoom.localParticipant.publishTrack(videoTrack);
        await newRoom.localParticipant.publishTrack(audioTrack);

        setIsVideoEnabled(true);
        setIsAudioEnabled(true);
        // update UI after a short delay to let events propagate
        setTimeout(updateParticipants, 100);
        console.log("Local tracks published");
      } catch (err) {
        console.error("Error publishing local tracks:", err);
      }
    });

    // ensure local track publish triggers an update
    newRoom.on(RoomEvent.LocalTrackPublished, () => {
      setTimeout(() => {
        const all = Array.from(newRoom.remoteParticipants.values());
        setParticipants(all);
      }, 100);
    });

    newRoom.on(RoomEvent.ParticipantConnected, (p: Participant) => {
      console.log("Participant Connected:", (p as any).identity);
      updateParticipants();
    });

    newRoom.on(RoomEvent.ParticipantDisconnected, (p: Participant) => {
      console.log("Participant Disconnected:", (p as any).identity);
      updateParticipants();
    });

    newRoom.on(RoomEvent.TrackSubscribed, () => updateParticipants());
    newRoom.on(RoomEvent.TrackUnsubscribed, () => updateParticipants());

    newRoom.on(RoomEvent.Disconnected, () => {
      setConnectionStatus("Disconnected");
      setIsConnected(false);
      setParticipants([]);
      setLocalParticipant(null);
    });

    const actualServerUrl = computeActualServerUrl(serverUrl);

    try {
      console.log("Connecting to", actualServerUrl);
      await newRoom.connect(actualServerUrl, token, {
        autoSubscribe: true,
      });
    } catch (err: any) {
      console.error("Connection error:", err);
      setConnectionStatus(`Failed: ${err?.message ?? err}`);
    }
  };

  const toggleVideo = async () => {
    if (!localParticipant) return;
    const enabled = !isVideoEnabled;
    if (enabled) {
      try {
        const videoTrack = await createLocalVideoTrack({ facingMode: "user" });
        await localParticipant.publishTrack(videoTrack);
      } catch (err) {
        console.error("enable video err", err);
      }
    } else {
      localParticipant.videoTracks.forEach((publication: any) => {
        try {
          publication.track?.stop();
          localParticipant.unpublishTrack(publication.track!);
        } catch (err) {}
      });
    }
    setIsVideoEnabled(enabled);
  };

  const toggleAudio = async () => {
    if (!localParticipant) return;
    const enabled = !isAudioEnabled;
    if (enabled) {
      try {
        const audioTrack = await createLocalAudioTrack();
        await localParticipant.publishTrack(audioTrack);
      } catch (err) {
        console.error("enable audio err", err);
      }
    } else {
      localParticipant.audioTracks.forEach((publication: any) => {
        try {
          publication.track?.stop();
          localParticipant.unpublishTrack(publication.track!);
        } catch (err) {}
      });
    }
    setIsAudioEnabled(enabled);
  };

  const disconnect = () => {
    if (room) {
      try {
        room.disconnect();
      } catch (e) {}
    }
    onDisconnect?.();
  };

  useEffect(() => {
    return () => {
      if (room) {
        try {
          room.disconnect();
        } catch (e) {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const mainParticipant = participants.length > 0 ? participants[0] : localParticipant;
  const sideParticipants = participants.length > 0
    ? [localParticipant, ...participants.slice(1)].filter(Boolean)
    : [];

  if (!permissionGranted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Join Video Call</h1>
          <p className="text-gray-300 mb-6">This meeting app needs access to your camera and microphone.</p>
          <button
            onClick={requestPermissions}
            disabled={isRequestingPermission}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-8 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto"
          >
            <Video className="w-5 h-5" />
            {isRequestingPermission ? "Requesting Access..." : "Allow Camera & Microphone"}
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold mb-4">Ready to Join</h1>
          <p className="text-gray-300 mb-6">Camera and microphone access granted</p>
          <button onClick={connectToRoom} className="bg-blue-600 hover:bg-blue-700 px-8 py-3 rounded-lg font-semibold">
            Join Meeting
          </button>
          <p className="text-gray-400 text-sm mt-4">Status: <span className="text-yellow-400">{connectionStatus}</span></p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex justify-between items-center p-4 bg-gray-900">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">TestIntegrity Meeting</h1>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{participants.length + 1} participants</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-700 rounded"><Settings className="w-5 h-5" /></button>
          <button className="p-2 hover:bg-gray-700 rounded"><MoreVertical className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex-1 flex">
        <div className="flex-1 p-4">
          {mainParticipant ? (
            <ParticipantTile participant={mainParticipant} isLocal={mainParticipant === localParticipant} isMainView={true} />
          ) : (
            <div className="w-full h-full bg-gray-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Waiting for participants to join...</p>
              </div>
            </div>
          )}
        </div>

        {sideParticipants.length > 0 && (
          <div className="w-80 p-4 bg-gray-900">
            <h3 className="text-sm font-semibold mb-4 text-gray-300">Participants ({sideParticipants.length})</h3>
            <div className="space-y-3">
              {sideParticipants.map((participant) => (
                <div key={participant?.identity} className="h-32">
                  {participant && <ParticipantTile participant={participant} isLocal={participant === localParticipant} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-900">
        <div className="flex justify-center items-center gap-4">
          <button onClick={toggleAudio} className={`p-4 rounded-full transition-colors ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button onClick={toggleVideo} className={`p-4 rounded-full transition-colors ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button onClick={disconnect} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors">
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-gray-400">Room: {room?.name} • {connectionStatus}</p>
        </div>
      </div>
    </div>
  );
}
