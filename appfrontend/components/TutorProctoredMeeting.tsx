'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Users, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProctoringPanel } from './ProctoringPanel';

interface Participant {
  id: string;
  name: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  isFlagged: boolean;
  alertCount: number;
}

interface TutorProctoredMeetingProps {
  meetingId: string;
  meetingTitle: string;
  onLeave: () => void;
}

export const TutorProctoredMeeting: React.FC<TutorProctoredMeetingProps> = ({
  meetingId,
  meetingTitle,
  onLeave,
}) => {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    initializeCamera();
    fetchParticipants();
    
    const interval = setInterval(fetchParticipants, 5000);
    
    return () => {
      stopCamera();
      clearInterval(interval);
    };
  }, []);

  const fetchParticipants = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const sessions = await response.json();
        const participantData = sessions
          .filter((s: any) => s.participantType === 'student')
          .map((s: any) => ({
            id: s.participantId,
            name: s.participantName,
            isMuted: false,
            isVideoEnabled: true,
            isFlagged: s.flagged,
            alertCount: s.totalAlerts
          }));
        setParticipants(participantData);
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
    }
  };

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  const flaggedParticipants = participants.filter(p => p.isFlagged);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white">
      {/* Header */}
      <div className="bg-black/50 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{meetingTitle}</h1>
            <p className="text-sm text-gray-300">Tutor View - Proctoring Active</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-sm">AI Monitoring</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="text-sm">{participants.length} Students</span>
            </div>
            {flaggedParticipants.length > 0 && (
              <Badge className="bg-red-500">
                {flaggedParticipants.length} Flagged
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-3 gap-4 h-full">
            {/* Tutor Video */}
            <Card className="bg-white/5 border-white/10 p-4 relative">
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-purple-500">Tutor (You)</Badge>
              </div>
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-4 bg-gray-800 rounded-lg flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </Card>

            {/* Student Videos */}
            {participants.map((participant) => (
              <Card
                key={participant.id}
                className={`bg-white/5 border-white/10 p-4 relative cursor-pointer transition-all ${
                  participant.isFlagged ? 'border-red-500 border-2' : ''
                } ${
                  selectedParticipant === participant.id ? 'ring-2 ring-blue-500' : ''
                }`}
                onClick={() => setSelectedParticipant(participant.id)}
              >
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <Badge className={participant.isFlagged ? 'bg-red-500' : 'bg-blue-500'}>
                    {participant.name}
                  </Badge>
                  {participant.isFlagged && (
                    <Badge className="bg-red-600 text-xs">
                      {participant.alertCount} alerts
                    </Badge>
                  )}
                </div>
                
                <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <div className={`w-20 h-20 ${participant.isFlagged ? 'bg-red-600' : 'bg-blue-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
                      <span className="text-2xl font-bold">{participant.name.charAt(0)}</span>
                    </div>
                    <p className="text-gray-300">{participant.name}</p>
                    {participant.isFlagged && (
                      <p className="text-red-400 text-sm mt-1">⚠️ Flagged</p>
                    )}
                  </div>
                </div>

                {/* Participant Controls */}
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    participant.isVideoEnabled ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {participant.isVideoEnabled ? (
                      <Video className="w-3 h-3" />
                    ) : (
                      <VideoOff className="w-3 h-3" />
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    !participant.isMuted ? 'bg-green-500' : 'bg-red-500'
                  }`}>
                    {!participant.isMuted ? (
                      <Mic className="w-3 h-3" />
                    ) : (
                      <MicOff className="w-3 h-3" />
                    )}
                  </div>
                </div>
              </Card>
            ))}

            {/* Empty slots for more students */}
            {Array.from({ length: Math.max(0, 6 - participants.length) }).map((_, index) => (
              <Card key={`empty-${index}`} className="bg-white/5 border-white/10 border-dashed p-4">
                <div className="w-full h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Waiting for student...</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Proctoring Panel */}
        <div className="w-96">
          <ProctoringPanel meetingId={meetingId} isProctor={true} />
        </div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center gap-4 bg-black/70 p-4 rounded-full">
          <Button
            onClick={toggleAudio}
            size="sm"
            className={`rounded-full p-3 ${isAudioEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
          >
            {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            size="sm"
            className={`rounded-full p-3 ${isVideoEnabled ? 'bg-gray-700' : 'bg-red-600'}`}
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </Button>
          
          <Button
            size="sm"
            className="rounded-full p-3 bg-gray-700 hover:bg-gray-600"
          >
            <Settings className="w-5 h-5" />
          </Button>
          
          <Button
            onClick={onLeave}
            size="sm"
            className="rounded-full p-3 bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};