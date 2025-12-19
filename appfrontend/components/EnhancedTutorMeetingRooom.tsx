"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant, DataPacket_Kind } from "livekit-client";
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users, Flag, 
  Volume2, VolumeX, UserPlus, UserMinus, Lock, Unlock, MessageSquare,
  AlertTriangle, CheckCircle, XCircle, BarChart3, Bell, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import QuizPanel from "./QuizPanel";

interface ParticipantData {
  participant: RemoteParticipant;
  flagCount: number;
  isSpeaking: boolean;
  lastActivity: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  alerts: any[];
  displayName: string;
  riskScore: number;
  identity: string;
  name?: string;
}

interface JoinRequest {
  id: string;
  studentId: string;
  studentName: string;
  requestedAt: string;
  meetingId: string;
}

interface ProctoringAlert {
  id: string;
  alertType: string;
  description: string;
  confidence: number;
  detectedAt: string;
  participantId?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  participant?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  studentName?: string;
  timestamp: string;
}

interface VideoCallProps {
  token: string;
  serverUrl: string;
  onDisconnect?: () => void;
  userInfo?: {
    fullname?: string;
    profilePic?: string;
    role?: 'tutor' | 'student';
    id?: string;
  };
  meetingId: string;
}

export default function EnhancedTutorMeetingRoom({ token, serverUrl, onDisconnect, userInfo, meetingId }: VideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showJoinRequests, setShowJoinRequests] = useState(false);
  const [showQuizPanel, setShowQuizPanel] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [focusedParticipant, setFocusedParticipant] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [proctoringAlerts, setProctoringAlerts] = useState<ProctoringAlert[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<ProctoringAlert[]>([]);
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [meetingFlags, setMeetingFlags] = useState<ProctoringAlert[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const joinRequestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTutor = userInfo?.role === 'tutor';

  const { toast } = useToast();

  // Enhanced join request polling (keep this since it's separate from alerts)
  useEffect(() => {
    if (isTutor && isConnected && showJoinRequests) {
      fetchJoinRequests();
      joinRequestIntervalRef.current = setInterval(fetchJoinRequests, 2000);
      
      return () => {
        if (joinRequestIntervalRef.current) {
          clearInterval(joinRequestIntervalRef.current);
          joinRequestIntervalRef.current = null;
        }
      };
    } else {
      if (joinRequestIntervalRef.current) {
        clearInterval(joinRequestIntervalRef.current);
        joinRequestIntervalRef.current = null;
      }
    }
  }, [isTutor, isConnected, showJoinRequests]);

  // Fetch meeting flags for tutor visibility
  useEffect(() => {
    if (isTutor && isConnected) {
      fetchMeetingFlags();
      const flagsInterval = setInterval(fetchMeetingFlags, 5000);
      return () => clearInterval(flagsInterval);
    }
  }, [isTutor, isConnected, meetingId]);

  // REMOVED: Real-time alert polling - now using LiveKit data channels

  const fetchJoinRequests = async () => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/join-requests`, {
        credentials: 'include'
      });
      if (response.ok) {
        const requests = await response.json();
        setJoinRequests(requests);
        
        if (requests.length > 0 && !showJoinRequests) {
          toast({
            title: "New Join Requests",
            description: `${requests.length} student(s) waiting to join`,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const fetchMeetingFlags = async () => {
    try {
      const response = await fetch(`http://localhost:4000/proctoring/meeting/${meetingId}/flags`, {
        credentials: 'include'
      });
      if (response.ok) {
        const flags = await response.json();
        setMeetingFlags(flags);
      }
    } catch (error) {
      console.error('Failed to fetch meeting flags:', error);
    }
  };

  // Handle real-time proctoring alerts from LiveKit data channel
  const handleLiveProctoringAlert = (data: any, participant?: RemoteParticipant) => {
    const alert: ProctoringAlert = {
      id: `live-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      alertType: data.alertType,
      description: data.description,
      confidence: data.confidence || 0.5,
      detectedAt: new Date().toISOString(),
      participantId: data.participantId,
      severity: data.severity || 'MEDIUM',
      participant: data.participant || {
        id: data.participantId,
        name: data.studentName || participant?.name || data.participantId,
        email: data.studentEmail || 'Unknown',
        role: 'student',
        status: 'ACTIVE'
      },
      studentName: data.studentName || participant?.name || data.participantId,
      timestamp: new Date().toISOString()
    };

    // Update alerts state
    setProctoringAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep latest 50
    setLiveAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep latest 20
    setUnreadAlerts(prev => prev + 1);

    // Show immediate toast for high severity alerts
    if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
      const participantName = alert.participant?.name || alert.studentName || 'Unknown Participant';
      toast({
        title: `🚨 ${alert.severity} Alert`,
        description: `${participantName}: ${alert.description}`,
        variant: "destructive",
        duration: 6000,
      });
    } else if (alert.severity === 'MEDIUM') {
      // Show less intrusive notification for medium alerts
      const participantName = alert.participant?.name || alert.studentName || 'Unknown Participant';
      toast({
        title: `⚠️ Monitoring Alert`,
        description: `${participantName}: ${alert.description}`,
        duration: 3000,
      });
    }

    // Update participant risk level
    if (alert.participantId) {
      updateParticipantAfterAlert(alert.participantId, alert);
    }

    // Log for debugging
    console.log('🚨 Live proctoring alert processed:', {
      alertType: alert.alertType,
      severity: alert.severity,
      participant: alert.studentName,
      confidence: alert.confidence
    });
  };

  const updateParticipantAfterAlert = (participantId: string, alert: ProctoringAlert) => {
    setParticipants(prev => prev.map(p => {
      if (p.identity === participantId) {
        const newFlagCount = p.flagCount + 1;
        const newAlerts = [alert, ...p.alerts];
        const highSeverityCount = newAlerts.filter(a => 
          a.severity === 'HIGH' || a.severity === 'CRITICAL'
        ).length;

        let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
        let riskScore = 0;

        if (newFlagCount === 0) {
          riskLevel = 'LOW';
          riskScore = 0;
        } else if (newFlagCount <= 2 && highSeverityCount === 0) {
          riskLevel = 'LOW';
          riskScore = 0.3;
        } else if (newFlagCount <= 5 || highSeverityCount === 1) {
          riskLevel = 'MEDIUM';
          riskScore = 0.6;
        } else if (newFlagCount <= 10 || highSeverityCount <= 3) {
          riskLevel = 'HIGH';
          riskScore = 0.8;
        } else {
          riskLevel = 'CRITICAL';
          riskScore = 1.0;
        }

        return {
          ...p,
          flagCount: newFlagCount,
          riskLevel,
          riskScore,
          alerts: newAlerts
        };
      }
      return p;
    }));
  };

  const connectToRoom = async () => {
    if (isConnecting) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    
    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      });
      setRoom(newRoom);

      newRoom.on(RoomEvent.Connected, async () => {
        console.log("✅ Connected to room");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Initialize participants from remote participants
        const initialParticipants: ParticipantData[] = Array.from(newRoom.remoteParticipants.values()).map(p => ({
          participant: p,
          flagCount: 0,
          isSpeaking: false,
          lastActivity: Date.now(),
          riskLevel: 'LOW' as const,
          riskScore: 0,
          alerts: [],
          displayName: p.name || p.identity,
          identity: p.identity,
          name: p.name
        }));
        setParticipants(initialParticipants);
        
        // Enable camera and microphone
        try {
          if (isVideoEnabled) {
            await newRoom.localParticipant.setCameraEnabled(true);
          }
          if (isAudioEnabled) {
            await newRoom.localParticipant.setMicrophoneEnabled(true);
          }
          
          // Attach local video after a brief delay
          setTimeout(() => {
            if (localVideoRef.current) {
              const videoTrack = Array.from(newRoom.localParticipant.videoTrackPublications.values())[0]?.track;
              if (videoTrack) {
                videoTrack.attach(localVideoRef.current);
              }
            }
          }, 1000);
        } catch (error) {
          console.error("Failed to enable camera/microphone:", error);
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("❌ Disconnected from room");
        setIsConnected(false);
        setIsConnecting(false);
        // Clean up intervals
        if (joinRequestIntervalRef.current) {
          clearInterval(joinRequestIntervalRef.current);
        }
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("Participant connected:", participant.identity);
        const newParticipant: ParticipantData = {
          participant: participant,
          flagCount: 0,
          isSpeaking: false,
          lastActivity: Date.now(),
          riskLevel: 'LOW',
          riskScore: 0,
          alerts: [],
          displayName: participant.name || participant.identity,
          identity: participant.identity,
          name: participant.name
        };
        setParticipants(prev => [...prev, newParticipant]);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log("Participant disconnected:", participant.identity);
        setParticipants(prev => prev.filter(p => p.identity !== participant.identity));
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
          console.log("Video track subscribed for:", participant.identity);
          setTimeout(() => {
            const videoElement = remoteVideoRefs.current[participant.identity];
            if (videoElement && track.attach) {
              track.attach(videoElement);
            }
          }, 500);
        }
      });

      newRoom.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: speakers.some(s => s.identity === p.identity),
          lastActivity: speakers.some(s => s.identity === p.identity) ? Date.now() : p.lastActivity
        })));
      });

      // Handle data messages for quizzes and alerts
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const jsonString = decoder.decode(payload);
          const data = JSON.parse(jsonString);
          console.log('📨 Data received from LiveKit:', data);
          
          if (data.type === 'QUIZ_RESPONSE') {
            if (participant) {
              handleQuizResponse(data, participant);
            }
          } else if (data.type === 'PROCTORING_ALERT') {
            // Handle real-time proctoring alerts from LiveKit
            console.log('🚨 Proctoring alert received via LiveKit:', data.data);
            handleLiveProctoringAlert(data.data, participant);
          } else if (data.type === 'DASHBOARD_UPDATE') {
            // Handle dashboard updates if needed
            console.log('📊 Dashboard update received:', data.data);
          } else if (data.type === 'BROWSER_ACTIVITY') {
            // Handle browser activity alerts
            console.log('🌐 Browser activity received:', data.data);
            if (data.data.suspicious) {
              handleLiveProctoringAlert({
                alertType: 'BROWSER_ACTIVITY',
                description: `Suspicious browser activity: ${data.data.activity}`,
                confidence: 0.7,
                severity: 'MEDIUM',
                participantId: participant?.identity,
                studentName: participant?.name
              }, participant);
            }
          }
        } catch (error) {
          console.error('❌ Error parsing data message:', error);
        }
      });

      // Fix server URL connection
      let actualServerUrl = serverUrl;
      
      if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
        actualServerUrl = `ws://${serverUrl}`;
      }
      
      if (actualServerUrl.includes('localhost') && !actualServerUrl.includes('7880')) {
        actualServerUrl = 'ws://localhost:7880';
      }

      console.log('🔄 Connecting to LiveKit server:', actualServerUrl);
      
      await newRoom.connect(actualServerUrl, token, {
        autoSubscribe: true,
        maxRetries: 5,
        peerConnectionTimeout: 15000,
      });
    } catch (error: any) {
      console.error("❌ Failed to connect to LiveKit:", error);
      setIsConnecting(false);
      setConnectionError(
        error.message || 'Failed to connect to meeting. Please check your connection and try again.'
      );
      
      toast({
        title: "Connection Failed",
        description: "Could not connect to the meeting room. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = async () => {
    if (room?.localParticipant) {
      try {
        await room.localParticipant.setCameraEnabled(!isVideoEnabled);
        setIsVideoEnabled(!isVideoEnabled);
      } catch (error) {
        console.error("Failed to toggle video:", error);
        toast({
          title: "Error",
          description: "Failed to toggle video",
          variant: "destructive",
        });
      }
    }
  };

  const toggleAudio = async () => {
    if (room?.localParticipant) {
      try {
        await room.localParticipant.setMicrophoneEnabled(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      } catch (error) {
        console.error("Failed to toggle audio:", error);
        toast({
          title: "Error",
          description: "Failed to toggle audio",
          variant: "destructive",
        });
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;
    
    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("Screen share failed:", error);
      toast({
        title: "Screen Share Error",
        description: "Failed to start screen sharing",
        variant: "destructive",
      });
    }
  };

  const flagParticipant = async (participantId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/proctoring/analyze-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          userId: participantId,
          participantId,
          detections: { suspiciousBehavior: true },
          browserData: { manualFlag: true }
        })
      });

      if (response.ok) {
        const manualAlert: ProctoringAlert = {
          id: `manual-${Date.now()}`,
          alertType: 'MANUAL_FLAG',
          description: 'Manual flag by tutor',
          confidence: 1.0,
          detectedAt: new Date().toISOString(),
          participantId,
          severity: 'MEDIUM',
          studentName: participants.find(p => p.identity === participantId)?.displayName,
          timestamp: new Date().toISOString()
        };

        setProctoringAlerts(prev => [manualAlert, ...prev]);
        setLiveAlerts(prev => [manualAlert, ...prev.slice(0, 9)]);
        updateParticipantAfterAlert(participantId, manualAlert);
        
        toast({
          title: "Participant Flagged",
          description: "Manual flag added to participant",
        });
      }
    } catch (error) {
      console.error('Failed to flag participant:', error);
    }
  };

  const kickParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to kick this participant?')) return;

    try {
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/kick-participant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId: participantId })
      });

      if (response.ok) {
        if (room) {
          // Send kick notification via LiveKit data channel
          const kickData = {
            type: 'KICK_NOTIFICATION',
            participantId,
            reason: 'Removed by tutor'
          };
          
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify(kickData));
          
          await room.localParticipant.publishData(
            data,
            { reliable: true }
          );
        }

        setParticipants(prev => prev.filter(p => p.identity !== participantId));
        toast({
          title: "Participant Kicked",
          description: "Participant has been removed from the meeting",
        });
      }
    } catch (error) {
      console.error('Failed to kick participant:', error);
      toast({
        title: "Error",
        description: "Failed to kick participant",
        variant: "destructive",
      });
    }
  };

  const respondToJoinRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/join-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        toast({
          title: "Success",
          description: `Join request ${status.toLowerCase()}`,
        });
        
        fetchJoinRequests();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to join request",
        variant: "destructive",
      });
    }
  };

  const toggleMeetingLock = async () => {
    try {
      const endpoint = isMeetingLocked ? 'unlock' : 'lock';
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/${endpoint}`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        setIsMeetingLocked(!isMeetingLocked);
        toast({
          title: "Success",
          description: `Meeting ${isMeetingLocked ? 'unlocked' : 'locked'}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${isMeetingLocked ? 'unlock' : 'lock'} meeting`,
        variant: "destructive",
      });
    }
  };

  const handleQuizResponse = (data: any, participant: RemoteParticipant) => {
    console.log('Quiz response received:', data, 'from:', participant.identity);
    // Handle quiz response logic here
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW': return 'bg-green-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'HIGH': return 'bg-orange-500';
      case 'CRITICAL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getAlertTypeColor = (alertType: string) => {
    const colors: Record<string, string> = {
      'FACE_NOT_DETECTED': 'bg-orange-500',
      'MULTIPLE_FACES': 'bg-red-500',
      'PHONE_DETECTED': 'bg-purple-500',
      'TAB_SWITCH': 'bg-blue-500',
      'SUSPICIOUS_BEHAVIOR': 'bg-yellow-500',
      'COPY_PASTE': 'bg-pink-500',
      'WINDOW_SWITCH': 'bg-indigo-500',
      'NO_FACE': 'bg-orange-400',
      'VOICE_DETECTED': 'bg-green-400',
      'BACKGROUND_NOISE': 'bg-gray-400',
      'EYE_GAZE_DEVIATION': 'bg-amber-500',
      'FACE_VERIFIED': 'bg-green-300',
      'MANUAL_FLAG': 'bg-red-600',
    };
    return colors[alertType] || 'bg-gray-500';
  };

  const getSortedParticipants = () => {
    return [...participants].sort((a, b) => {
      if (a.riskScore !== b.riskScore) return b.riskScore - a.riskScore;
      if (a.flagCount !== b.flagCount) return b.flagCount - a.flagCount;
      if (a.isSpeaking !== b.isSpeaking) return a.isSpeaking ? -1 : 1;
      return b.lastActivity - a.lastActivity;
    });
  };

  const renderParticipantVideo = (participantData: ParticipantData, isMain = false) => (
    <div 
      key={participantData.identity}
      className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border cursor-pointer transition-all ${
        isMain ? 'col-span-2 row-span-2' : ''
      } ${
        participantData.riskLevel === 'CRITICAL' ? 'ring-4 ring-red-500 border-red-400' :
        participantData.riskLevel === 'HIGH' ? 'ring-3 ring-orange-500 border-orange-400' :
        participantData.riskLevel === 'MEDIUM' ? 'ring-2 ring-yellow-500 border-yellow-400' :
        participantData.flagCount > 0 ? 'ring-1 ring-red-500 border-red-400' : 
        'border-white/20 hover:border-blue-400'
      }`}
      onClick={() => isTutor && setFocusedParticipant(participantData.identity)}
    >
      <video
        ref={(el) => {
          if (el) remoteVideoRefs.current[participantData.identity] = el;
        }}
        className="w-full h-full object-cover"
        autoPlay
        playsInline
      />
      
      <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
        <img 
          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participantData.displayName}`}
          alt="Profile"
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm font-medium">{participantData.displayName}</span>
        {participantData.isSpeaking && <Volume2 className="w-4 h-4 text-green-400" />}
      </div>

      {participantData.flagCount > 0 && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
            <Flag className="w-3 h-3" />
            {participantData.flagCount}
          </div>
          <Badge className={`${getRiskColor(participantData.riskLevel)} text-white text-xs`}>
            {participantData.riskLevel}
          </Badge>
        </div>
      )}

      {isTutor && (
        <div className="absolute top-3 left-3 flex gap-1">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              flagParticipant(participantData.identity);
            }}
            className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
          >
            <Flag className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              kickParticipant(participantData.identity);
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full w-8 h-8 p-0"
          >
            <UserMinus className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );

  useEffect(() => {
    connectToRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
      if (joinRequestIntervalRef.current) {
        clearInterval(joinRequestIntervalRef.current);
      }
    };
  }, [token, serverUrl]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center font-['Inter']">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-200/50">
            <Video className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
          {connectionError ? (
            <>
              <h1 className="text-xl font-bold mb-4 text-red-600">Connection Failed</h1>
              <p className="text-gray-600 mb-4 font-medium">{connectionError}</p>
              <button 
                onClick={() => connectToRoom()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300 shadow-xl shadow-orange-200/50"
              >
                Retry Connection
              </button>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold mb-4 text-gray-800">Connecting to Meeting...</h1>
              <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Establishing connection to LiveKit server...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex font-['Inter']">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="p-4 bg-white/60 backdrop-blur-3xl border-b border-orange-200/50 shadow-lg shadow-orange-100/50 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 drop-shadow-sm">Meeting Room</h2>
            <Badge variant={isMeetingLocked ? "destructive" : "secondary"}>
              {isMeetingLocked ? "Locked" : "Unlocked"}
            </Badge>
            <Badge variant="secondary">
              {participants.length} Participants
            </Badge>
          </div>
          <div className="flex gap-2">
            {proctoringAlerts.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {proctoringAlerts.length} Total
              </Badge>
            )}
            {liveAlerts.length > 0 && (
              <Badge className="bg-orange-500 text-white flex items-center gap-1">
                <Bell className="w-3 h-3" />
                {liveAlerts.length} Live
              </Badge>
            )}
            {meetingFlags.length > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1 bg-purple-500 text-white">
                <Flag className="w-3 h-3" />
                {meetingFlags.length} Flags
              </Badge>
            )}
            {joinRequests.length > 0 && (
              <Badge variant="default" className="bg-yellow-500 flex items-center gap-1">
                <UserPlus className="w-3 h-3" />
                {joinRequests.length} Requests
              </Badge>
            )}
            {unreadAlerts > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 bg-red-600">
                <Bell className="w-3 h-3" />
                {unreadAlerts} New
              </Badge>
            )}
          </div>
        </div>

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
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${userInfo?.fullname || 'You'}`}
                  alt="Profile"
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-sm font-medium">{userInfo?.fullname || 'You'} (You)</span>
              </div>
            </div>

            {/* Remote Videos */}
            {isTutor && mainParticipant ? (
              <>
                {renderParticipantVideo(mainParticipant, true)}
                {sortedParticipants.slice(1, 7).map(participantData => 
                  renderParticipantVideo(participantData)
                )}
              </>
            ) : (
              sortedParticipants.slice(0, 8).map(participantData => 
                renderParticipantVideo(participantData)
              )
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/60 backdrop-blur-3xl border-t border-orange-200/50 shadow-lg shadow-orange-100/50 flex justify-center items-center gap-4">
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
            <>
              <Button
                onClick={() => setShowParticipants(!showParticipants)}
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm transition-all"
              >
                <Users className="w-6 h-6" />
              </Button>

              <Button
                onClick={() => {
                  setShowJoinRequests(!showJoinRequests);
                  if (showAlerts) setShowAlerts(false);
                }}
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 p-0 transition-all ${
                  joinRequests.length > 0 ? 'bg-yellow-500 hover:bg-yellow-600 text-white' : 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm'
                }`}
              >
                <UserPlus className="w-6 h-6" />
              </Button>

              <Button
                onClick={() => {
                  setShowAlerts(!showAlerts);
                  if (showJoinRequests) setShowJoinRequests(false);
                  setUnreadAlerts(0); // Mark as read when opening
                }}
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 p-0 transition-all ${
                  unreadAlerts > 0 ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm'
                }`}
              >
                <Bell className="w-6 h-6" />
              </Button>

              <Button
                onClick={toggleMeetingLock}
                variant="outline"
                size="lg"
                className={`rounded-full w-14 h-14 p-0 transition-all ${
                  isMeetingLocked ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm'
                }`}
              >
                {isMeetingLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
              </Button>

              <Button
                onClick={() => setShowQuizPanel(!showQuizPanel)}
                variant="outline"
                size="lg"
                className="rounded-full w-14 h-14 p-0 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm transition-all"
              >
                <MessageSquare className="w-6 h-6" />
              </Button>
            </>
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
            className="rounded-full w-14 h-14 p-0 bg-gradient-to-r from-red-500 to-red-600 text-white hover:scale-105 transition-all shadow-xl shadow-red-200/50"
          >
            <PhoneOff className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Side Panels */}
      {isTutor && (
        <>
          {/* Participants Panel */}
          {showParticipants && (
            <div className="w-80 bg-black/70 backdrop-blur-sm border-l border-white/20 flex flex-col">
              <div className="p-4 border-b border-white/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  Participants ({participants.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {sortedParticipants.map((participantData) => (
                  <Card 
                    key={participantData.identity}
                    className={`p-3 bg-white/10 backdrop-blur-sm border cursor-pointer hover:bg-white/20 transition-colors ${
                      participantData.riskLevel === 'CRITICAL' ? 'border-red-400 bg-red-500/20' :
                      participantData.riskLevel === 'HIGH' ? 'border-orange-400 bg-orange-500/20' :
                      participantData.riskLevel === 'MEDIUM' ? 'border-yellow-400 bg-yellow-500/20' :
                      'border-white/20'
                    }`}
                    onClick={() => setFocusedParticipant(participantData.identity)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${participantData.displayName}`}
                          alt="Profile"
                          className="w-8 h-8 rounded-full"
                        />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {participantData.displayName}
                          </p>
                          {participantData.isSpeaking && (
                            <p className="text-xs text-green-400 flex items-center gap-1">
                              <Volume2 className="w-3 h-3" />
                              Speaking
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {participantData.flagCount > 0 && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                              <Flag className="w-3 h-3" />
                              {participantData.flagCount}
                            </div>
                            <Badge className={`${getRiskColor(participantData.riskLevel)} text-white text-xs`}>
                              {participantData.riskLevel}
                            </Badge>
                          </div>
                        )}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              flagParticipant(participantData.identity);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
                          >
                            <Flag className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              kickParticipant(participantData.identity);
                            }}
                            className="bg-orange-500 hover:bg-orange-600 text-white border-none rounded-full w-8 h-8 p-0"
                          >
                            <UserMinus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Join Requests Panel */}
          {showJoinRequests && (
            <div className="w-80 bg-black/70 backdrop-blur-sm border-l border-white/20 flex flex-col">
              <div className="p-4 border-b border-white/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <UserPlus className="w-5 h-5" />
                  Join Requests ({joinRequests.length})
                </h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {joinRequests.map((request) => (
                  <Card key={request.id} className="p-3 bg-white/10 backdrop-blur-sm border border-white/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{request.studentName}</p>
                        <p className="text-xs text-gray-400">ID: {request.studentId}</p>
                        <p className="text-xs text-gray-500">
                          Requested: {new Date(request.requestedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => respondToJoinRequest(request.id, 'APPROVED')}
                          className="bg-green-500 hover:bg-green-600 text-white border-none rounded-full w-8 h-8 p-0"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respondToJoinRequest(request.id, 'REJECTED')}
                          className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
                {joinRequests.length === 0 && (
                  <p className="text-center text-gray-400 py-4">No pending join requests</p>
                )}
              </div>
            </div>
          )}

          {/* Real-time Alerts Panel */}
          {showAlerts && (
            <div className="w-80 bg-black/70 backdrop-blur-sm border-l border-white/20 flex flex-col">
              <div className="p-4 border-b border-white/20">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Bell className="w-5 h-5" />
                  Live Alerts ({liveAlerts.length})
                </h3>
                <p className="text-xs text-green-400 mt-1">
                  📡 Real-time via LiveKit + AI Analysis
                </p>
                {unreadAlerts > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    {unreadAlerts} new alerts since last check
                  </p>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {liveAlerts.map((alert, index) => {
                  const isRecent = Date.now() - new Date(alert.timestamp).getTime() < 30000; // 30 seconds
                  return (
                    <Card 
                      key={`${alert.id}-${index}`} 
                      className={`p-3 backdrop-blur-sm border transition-all ${
                        isRecent ? 'ring-2 ring-blue-400 ' : ''
                      }${
                        alert.severity === 'CRITICAL' ? 'bg-red-500/20 border-red-400' :
                        alert.severity === 'HIGH' ? 'bg-orange-500/20 border-orange-400' :
                        alert.severity === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-400' :
                        'bg-white/10 border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getAlertTypeColor(alert.alertType)} text-white text-xs`}>
                              {alert.alertType.replace(/_/g, ' ')}
                            </Badge>
                            <Badge className={`${getSeverityColor(alert.severity)} text-white text-xs`}>
                              {alert.severity}
                            </Badge>
                            {isRecent && (
                              <Badge className="bg-blue-500 text-white text-xs animate-pulse">
                                NEW
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium text-white mb-1">
                            {alert.participant?.name || alert.studentName || alert.participantId || 'Unknown Participant'}
                          </p>
                          {alert.participant?.email && (
                            <p className="text-xs text-gray-400 mb-1">
                              {alert.participant.email}
                            </p>
                          )}
                          <p className="text-xs text-gray-300 mb-2">{alert.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{Math.round(alert.confidence * 100)}% confidence</span>
                            <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
                {liveAlerts.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Eye className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No alerts detected yet</p>
                    <p className="text-xs mt-1">AI monitoring is active</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quiz Panel */}
          {showQuizPanel && (
            <QuizPanel
              meetingId={meetingId}
              isConnected={isConnected}
              onSendQuiz={() => {}}
              onEndQuiz={() => {}}
              userInfo={userInfo}
            />
          )}
        </>
      )}
    </div>
  );
}