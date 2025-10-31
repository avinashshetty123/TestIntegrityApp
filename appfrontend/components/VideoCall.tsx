"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, VideoTrack, AudioTrack, createLocalVideoTrack, createLocalAudioTrack } from "livekit-client";
import { Video, VideoOff, Mic, MicOff, PhoneOff } from "lucide-react";

interface VideoCallProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
}

const VideoContainer = ({ track, isLocal = false }: { track: VideoTrack; isLocal?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) track.attach(videoRef.current);
    return () => track.detach();
  }, [track]);

  return (
    <div className="relative aspect-video bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
        muted={isLocal}
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
        {isLocal ? "You" : "Remote"}
      </div>
    </div>
  );
};

export default function VideoCall({ token, serverUrl, onDisconnect }: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<VideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<AudioTrack | null>(null);
  const [remoteTracks, setRemoteTracks] = useState<VideoTrack[]>([]);
  const [connectionStatus, setConnectionStatus] = useState("Ready to connect");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isConnected, setIsConnected] = useState(false);

  const connectToRoom = async () => {
    if (!token || !serverUrl || isConnected) return;

    setConnectionStatus("Connecting...");
    const newRoom = new Room();
    setRoom(newRoom);

    newRoom.on(RoomEvent.Connected, () => {
      setConnectionStatus("Connected");
      setIsConnected(true);
      console.log("Connected to room:", newRoom.name);
    });

    newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
      console.log("Local track published:", publication.kind);
      if (publication.track) {
        if (publication.kind === 'video') {
          setLocalVideoTrack(publication.track as VideoTrack);
        } else if (publication.kind === 'audio') {
          setLocalAudioTrack(publication.track as AudioTrack);
        }
      }
    });

    newRoom.on(RoomEvent.Disconnected, () => {
      setConnectionStatus("Disconnected");
      setIsConnected(false);
      setRemoteTracks([]);
      setLocalVideoTrack(null);
      setLocalAudioTrack(null);
    });

    newRoom.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log("Connection state:", state);
    });

    newRoom.on(RoomEvent.Reconnecting, () => {
      console.log("Reconnecting...");
    });

    newRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === "video") {
        setRemoteTracks((prev) => [...prev, track as VideoTrack]);
      }
    });

    newRoom.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === "video") {
        setRemoteTracks((prev) => prev.filter((t) => t.sid !== track.sid));
      }
    });

    try {
      await newRoom.connect(serverUrl, token, {
        autoSubscribe: true,
        publishDefaults: {
          videoEnabled: true,
          audioEnabled: true,
        },
      });
    } catch (err) {
      console.error("Connection error:", err);
      setConnectionStatus(`Failed: ${err.message}`);
    }
  };

  useEffect(() => {
    return () => {
      if (room) {
        room.disconnect();
      }
      if (localVideoTrack) localVideoTrack.stop();
      if (localAudioTrack) localAudioTrack.stop();
    };
  }, [room, localVideoTrack, localAudioTrack]);

  const toggleVideo = async () => {
    if (localVideoTrack) {
      if (isVideoEnabled) {
        localVideoTrack.mute();
      } else {
        localVideoTrack.unmute();
      }
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (localAudioTrack) {
      if (isAudioEnabled) {
        localAudioTrack.mute();
      } else {
        localAudioTrack.unmute();
      }
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const disconnect = () => {
    if (room) {
      room.disconnect();
    }
    onDisconnect?.();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Video Call</h1>
          <div className="text-sm">
            Status: <span className={connectionStatus === "Connected" ? "text-green-400" : "text-yellow-400"}>
              {connectionStatus}
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <button
              onClick={connectToRoom}
              className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-lg text-lg font-semibold mb-4"
            >
              Join Video Call
            </button>
            <p className="text-gray-400 text-sm">Click to connect and enable camera/microphone</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {localVideoTrack && (
                <VideoContainer track={localVideoTrack} isLocal={true} />
              )}
              
              {remoteTracks.map((track, index) => (
                <VideoContainer key={track.sid || index} track={track} />
              ))}

              {remoteTracks.length === 0 && connectionStatus === "Connected" && (
                <div className="aspect-video bg-gray-800 rounded-lg flex items-center justify-center text-gray-400">
                  Waiting for participants...
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoEnabled ? 'bg-gray-600' : 'bg-red-600'}`}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              
              <button
                onClick={toggleAudio}
                className={`p-3 rounded-full ${isAudioEnabled ? 'bg-gray-600' : 'bg-red-600'}`}
              >
                {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              <button
                onClick={disconnect}
                className="p-3 rounded-full bg-red-600 hover:bg-red-700"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}