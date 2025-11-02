"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Participant, RemoteParticipant } from "livekit-client";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MeetingRoomProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
}

export default function MeetingRoom({ token, serverUrl, onDisconnect }: MeetingRoomProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  const connectToRoom = async () => {
    try {
      const newRoom = new Room();
      setRoom(newRoom);

      newRoom.on(RoomEvent.Connected, async () => {
        console.log("Connected to room");
        setConnectionState('connected');
        
        try {
          await newRoom.localParticipant.enableCameraAndMicrophone();
          
          // Attach local video
          setTimeout(() => {
            if (localVideoRef.current) {
              const videoTrack = newRoom.localParticipant.videoTrackPublications.values().next().value?.track;
              if (videoTrack) {
                videoTrack.attach(localVideoRef.current);
              }
            }
          }, 500);
        } catch (error) {
          console.error("Failed to enable camera/microphone:", error);
        }
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("Participant connected:", participant.identity);
        setParticipants(prev => [...prev, participant]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
          const videoElement = remoteVideoRefs.current[participant.identity];
          if (videoElement) {
            track.attach(videoElement);
          }
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("Disconnected from room");
        setConnectionState('failed');
      });

      const actualServerUrl = serverUrl.replace("livekit-server", "localhost");
      await newRoom.connect(actualServerUrl, token);
    } catch (error) {
      console.error("Failed to connect:", error);
      setConnectionState('failed');
    }
  };

  const toggleVideo = async () => {
    if (room?.localParticipant) {
      await room.localParticipant.setCameraEnabled(!isVideoEnabled);
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const toggleAudio = async () => {
    if (room?.localParticipant) {
      await room.localParticipant.setMicrophoneEnabled(!isAudioEnabled);
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const disconnect = () => {
    room?.disconnect();
    onDisconnect?.();
  };

  useEffect(() => {
    connectToRoom();
    return () => room?.disconnect();
  }, []);

  if (connectionState === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-10 h-10 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connecting to Meeting...</h1>
          <p className="text-slate-300">Please wait while we establish the connection</p>
        </div>
      </div>
    );
  }

  if (connectionState === 'failed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <VideoOff className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connection Failed</h1>
          <p className="text-slate-300 mb-6">Unable to connect to the meeting room</p>
          <Button onClick={onDisconnect} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="font-semibold">Meeting Room</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Users className="w-4 h-4" />
          <span>{participants.length + 1} participants</span>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className={`grid gap-4 h-full ${participants.length === 0 ? 'grid-cols-1' : participants.length === 1 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3'}`}>
          {/* Local Video */}
          <div className="relative bg-slate-900 rounded-lg overflow-hidden">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
              You
            </div>
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <VideoOff className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {participants.map((participant) => (
            <div key={participant.identity} className="relative bg-slate-900 rounded-lg overflow-hidden">
              <video
                ref={(el) => {
                  if (el) remoteVideoRefs.current[participant.identity] = el;
                }}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm font-medium">
                {participant.name || participant.identity}
              </div>
            </div>
          ))}

          {/* Empty slots */}
          {participants.length === 0 && (
            <div className="bg-slate-900 rounded-lg flex items-center justify-center">
              <div className="text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-3" />
                <p>Waiting for participants...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-900 p-6">
        <div className="flex justify-center items-center gap-4">
          <Button
            onClick={toggleAudio}
            size="lg"
            className={`rounded-full w-14 h-14 ${isAudioEnabled ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            size="lg"
            className={`rounded-full w-14 h-14 ${isVideoEnabled ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={disconnect}
            size="lg"
            className="rounded-full w-14 h-14 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}