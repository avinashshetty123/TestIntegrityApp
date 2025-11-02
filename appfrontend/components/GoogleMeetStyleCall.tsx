"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, Participant, Track } from "livekit-client";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users, Flag, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ParticipantData extends Participant {
  flagCount: number;
  isSpeaking: boolean;
  lastActivity: number;
}

interface VideoCallProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
  userInfo?: {
    name?: string;
    profilePic?: string;
    role?: 'tutor' | 'student';
  };
}

export default function GoogleMeetStyleCall({ token, serverUrl, onDisconnect, userInfo }: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const isTutor = userInfo?.role === 'tutor';

  const connectToRoom = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      });
      setRoom(newRoom);

      newRoom.on(RoomEvent.Connected, async () => {
        console.log("Connected to room");
        setIsConnected(true);
        setIsConnecting(false);
        
        setParticipants(Array.from(newRoom.remoteParticipants.values()).map(p => ({
          ...p,
          flagCount: 0,
          isSpeaking: false,
          lastActivity: Date.now()
        })));
        
        try {
          await newRoom.localParticipant.enableCameraAndMicrophone();
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

      newRoom.on(RoomEvent.ParticipantConnected, (participant: Participant) => {
        setParticipants(prev => [...prev, {
          ...participant,
          flagCount: 0,
          isSpeaking: false,
          lastActivity: Date.now()
        }]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: Participant) => {
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
          setTimeout(() => {
            const videoElement = remoteVideoRefs.current[participant.identity];
            if (videoElement) {
              track.attach(videoElement);
            }
          }, 100);
        }
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: speakers.some(s => s.identity === p.identity),
          lastActivity: speakers.some(s => s.identity === p.identity) ? Date.now() : p.lastActivity
        })));
      });

      const wsUrl = serverUrl.startsWith('ws://') ? serverUrl : `ws://${serverUrl}`;
      const actualServerUrl = wsUrl.replace('livekit-server', 'localhost');
      
      await newRoom.connect(actualServerUrl, token, {
        autoSubscribe: true,
        maxRetries: 1,
        peerConnectionTimeout: 8000,
      });
    } catch (error: any) {
      // Suppress connection errors if we're already connected and video is working
      if (!isConnected) {
        console.error("Failed to connect:", error);
        setIsConnecting(false);
        setConnectionError(error.message || 'Failed to connect to meeting');
      }
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

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;
    
    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error("Screen share failed:", error);
    }
  };

  const flagParticipant = (participantId: string) => {
    setParticipants(prev => prev.map(p => 
      p.identity === participantId 
        ? { ...p, flagCount: p.flagCount + 1 }
        : p
    ));
  };

  const getSortedParticipants = () => {
    return [...participants].sort((a, b) => {
      if (a.flagCount !== b.flagCount) return b.flagCount - a.flagCount;
      if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
      return b.lastActivity - a.lastActivity;
    });
  };

  const renderParticipantVideo = (participant: ParticipantData, isMain = false) => (
    <div 
      key={participant.identity}
      className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border cursor-pointer transition-all ${
        isMain ? 'col-span-2 row-span-2' : ''
      } ${participant.flagCount > 0 ? 'ring-2 ring-red-500 border-red-400' : 'border-white/20 hover:border-blue-400'}`}
      onClick={() => isTutor && setFocusedParticipant(participant.identity)}
    >
      <video
        ref={(el) => {
          if (el) remoteVideoRefs.current[participant.identity] = el;
        }}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
      />
      
      {/* Participant Info */}
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
        <img 
          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participant.name || participant.identity}`}
          alt="Profile"
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm font-medium">{participant.name || participant.identity}</span>
        {participant.isSpeaking && <Volume2 className="w-4 h-4 text-green-400" />}
      </div>

      {/* Flag Count */}
      {participant.flagCount > 0 && (
        <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
          <Flag className="w-3 h-3" />
          {participant.flagCount}
        </div>
      )}

      {/* Tutor Controls */}
      {isTutor && (
        <div className="absolute top-3 left-3 flex gap-1">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              flagParticipant(participant.identity);
            }}
            className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
          >
            <Flag className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    connectToRoom();
    return () => room?.disconnect();
  }, [token, serverUrl]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          {connectionError ? (
            <>
              <h1 className="text-xl font-bold mb-4 text-red-400">Connection Failed</h1>
              <p className="text-gray-300 mb-4">{connectionError}</p>
              <Button onClick={() => connectToRoom()} className="bg-blue-500 hover:bg-blue-600 text-white">Retry Connection</Button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-4">Connecting to Meeting...</h1>
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </>
          )}
        </div>
      </div>
    );
  }

  const sortedParticipants = getSortedParticipants();
  const mainParticipant = focusedParticipant 
    ? sortedParticipants.find(p => p.identity === focusedParticipant)
    : sortedParticipants[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white flex">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Video Grid */}
        <div className="flex-1 p-6">
          <div className={`grid gap-3 h-full ${
            participants.length === 0 ? 'grid-cols-1' :
            participants.length === 1 ? 'grid-cols-2' :
            participants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
            'grid-cols-3 grid-rows-3'
          }`}>
            {/* Local Video */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/20">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
                <img 
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${userInfo?.name || 'You'}`}
                  alt="Profile"
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm font-medium">{userInfo?.name || 'You'}</span>
              </div>
            </div>

            {/* Remote Videos */}
            {isTutor && mainParticipant ? (
              <>
                {renderParticipantVideo(mainParticipant, true)}
                {sortedParticipants.slice(1, 7).map(participant => 
                  renderParticipantVideo(participant)
                )}
              </>
            ) : (
              sortedParticipants.slice(0, 8).map(participant => 
                renderParticipantVideo(participant)
              )
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/50 backdrop-blur-sm border-t border-white/10 flex justify-center items-center gap-4">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isAudioEnabled ? 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "outline" : "destructive"}
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isVideoEnabled ? 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleScreenShare}
            variant="outline"
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm'}`}
          >
            <Monitor className="w-6 h-6" />
          </Button>

          {isTutor && (
            <Button
              onClick={() => setShowParticipants(!showParticipants)}
              variant="outline"
              size="lg"
              className="rounded-full w-14 h-14 p-0 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm transition-all"
            >
              <Users className="w-6 h-6" />
            </Button>
          )}

          <Button
            onClick={() => {
              if (room) {
                room.disconnect();
              }
              onDisconnect?.();
            }}
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600 text-white transition-all"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Participants Panel (Tutor Only) */}
      {isTutor && showParticipants && (
        <div className="w-80 bg-black/50 backdrop-blur-sm border-l border-white/20 flex flex-col">
          <div className="p-4 border-b border-white/20">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Users className="w-5 h-5" />
              Participants ({participants.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {sortedParticipants.map((participant) => (
              <Card 
                key={participant.identity}
                className={`p-3 bg-white/10 backdrop-blur-sm border cursor-pointer hover:bg-white/20 transition-colors ${
                  participant.flagCount > 0 ? 'border-red-400 bg-red-500/20' : 'border-white/20'
                }`}
                onClick={() => setFocusedParticipant(participant.identity)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participant.name || participant.identity}`}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-sm font-medium text-white">
                        {participant.name || participant.identity}
                      </p>
                      {participant.isSpeaking && (
                        <p className="text-xs text-green-400 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" />
                          Speaking
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {participant.flagCount > 0 && (
                      <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        <Flag className="w-3 h-3" />
                        {participant.flagCount}
                      </div>
                    )}
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        flagParticipant(participant.identity);
                      }}
                      className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
                    >
                      <Flag className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}