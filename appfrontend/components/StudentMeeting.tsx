"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare, Monitor,
  AlertTriangle, Bell, Eye, Shield, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import StudentQuizPanel from "@/components/StudentQuizPanel";

declare global {
  interface Window {
    electronAPI?: {
      sendVideoFrame: (frameData: any) => Promise<boolean>;
      loadReferenceFace: (imageUrl: string, userId: string) => Promise<boolean>;
      startProctoring: (sessionData: any) => Promise<boolean>;
      stopProctoring: () => Promise<boolean>;
      setWindowMode: (mode: string) => Promise<boolean>;
      onProctoringAnalysis: (callback: (analysis: any) => void) => void;
      removeAllListeners: (channel: string) => void;
    };
  }
}

interface StudentVideoCallProps {
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

interface ProctoringAlert {
  id: string;
  alertType: string;
  description: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
}

export default function EnhancedStudentMeetingRoom({ 
  token, 
  serverUrl, 
  onDisconnect, 
  userInfo, 
  meetingId 
}: StudentVideoCallProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showQuizPanel, setShowQuizPanel] = useState(false);
  const [tutorParticipant, setTutorParticipant] = useState<RemoteParticipant | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [proctoringAlerts, setProctoringAlerts] = useState<ProctoringAlert[]>([]);
  const [isProctoringActive, setIsProctoringActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Initializing...');
  const [isElectron, setIsElectron] = useState(false);
  const [deepfakeCheckCount, setDeepfakeCheckCount] = useState(0);
  const [lastDeepfakeCheck, setLastDeepfakeCheck] = useState<Date | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const tutorVideoRef = useRef<HTMLVideoElement>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deepfakeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Check if running in Electron
  useEffect(() => {
    const electronAvailable = !!window.electronAPI;
    setIsElectron(electronAvailable);
    console.log('Electron API available:', electronAvailable);
  }, []);

  // Setup Electron event listeners
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onProctoringAnalysis((analysis) => {
        handleProctoringAnalysis(analysis);
      });

      return () => {
        window.electronAPI?.removeAllListeners('proctoring-analysis');
      };
    }
  }, []);

  const handleProctoringAnalysis = useCallback((analysis: any) => {
    if (analysis.alerts && analysis.alerts.length > 0) {
      analysis.alerts.forEach((alert: any) => {
        const newAlert: ProctoringAlert = {
          id: `alert-${Date.now()}-${Math.random()}`,
          alertType: alert.alertType,
          description: alert.description,
          confidence: alert.confidence,
          severity: alert.severity || 'MEDIUM',
          timestamp: new Date().toISOString()
        };

        setProctoringAlerts(prev => [newAlert, ...prev.slice(0, 4)]);

        if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
          toast({
            title: "🚨 Proctoring Alert",
            description: alert.description,
            variant: "destructive",
            duration: 3000,
          });
        }

        // Send alert to tutor via LiveKit data channel
        if (room) {
          const encoder = new TextEncoder();
          const data = encoder.encode(JSON.stringify({
            type: 'PROCTORING_ALERT',
            data: {
              alertType: alert.alertType,
              description: alert.description,
              confidence: alert.confidence,
              severity: alert.severity,
              participantId: userInfo?.id,
              studentName: userInfo?.fullname,
              timestamp: new Date().toISOString()
            }
          }));
          
          room.localParticipant.publishData(data, { reliable: true });
        }

        // Report to backend
        reportProctoringAlert(newAlert);
      });
    }

    if (analysis.faceDetected !== undefined) {
      const status = analysis.faceDetected ? 
        `Face detected ✅` : 'No face detected ⚠️';
      setFaceDetectionStatus(status);
    }
  }, [room, userInfo, toast]);

  const reportProctoringAlert = async (alert: ProctoringAlert) => {
    try {
      const response = await fetch('http://localhost:4000/proctoring/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          userId: userInfo?.id,
          participantId: userInfo?.id,
          detections: {
            [alert.alertType.toLowerCase()]: true,
            suspiciousBehavior: alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
          },
          browserData: { 
            automatedDetection: true,
            alertType: alert.alertType,
            confidence: alert.confidence,
            severity: alert.severity,
            timestamp: alert.timestamp
          }
        })
      });
      
      if (response.ok) {
        console.log('✅ Alert reported to backend:', alert.alertType);
      }
    } catch (error) {
      console.error('❌ Failed to report proctoring alert:', error);
    }
  };

  const performDeepfakeCheck = async () => {
    if (!localVideoRef.current) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = localVideoRef.current;
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      console.log('🛡️ Performing deepfake check...');
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('userId', userInfo?.id || '');
        formData.append('meetingId', meetingId);
        formData.append('participantId', userInfo?.id || '');

        try {
          const deepfakeResponse = await fetch('http://localhost:8000/deepfake/predict', {
            method: 'POST',
            body: formData
          });

          if (deepfakeResponse.ok) {
            const result = await deepfakeResponse.json();
            setDeepfakeCheckCount(prev => prev + 1);
            setLastDeepfakeCheck(new Date());
            
            console.log('✅ Deepfake check result:', result);
            
            if (result.is_deepfake) {
              const deepfakeAlert: ProctoringAlert = {
                id: `deepfake-${Date.now()}`,
                alertType: 'DEEPFAKE_DETECTED',
                description: `Deepfake detected with ${Math.round(result.confidence * 100)}% confidence`,
                confidence: result.confidence,
                severity: 'CRITICAL',
                timestamp: new Date().toISOString()
              };
              
              handleProctoringAnalysis({ alerts: [deepfakeAlert] });
            }
          }
        } catch (error) {
          console.error('❌ Deepfake check failed:', error);
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      console.error('❌ Deepfake frame capture failed:', error);
    }
  };

  const createProctoringSession = async () => {
    try {
      const response = await fetch('http://localhost:4000/proctoring/session/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          participantId: userInfo?.id,
          userId: userInfo?.id,
          studentName: userInfo?.fullname,
          startedAt: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        console.log('✅ Proctoring session created');
      }
    } catch (error) {
      console.error('❌ Failed to create proctoring session:', error);
    }
  };

  const startProctoring = useCallback(async () => {
    // Create proctoring session first
    await createProctoringSession();
    
    if (!isElectron || !window.electronAPI) {
      console.log('Not in Electron environment, starting browser proctoring');
      setIsProctoringActive(true);
      setFaceDetectionStatus('Browser monitoring active');
      
      // Start browser-based frame capture
      const captureFrame = async () => {
        if (!localVideoRef.current) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = localVideoRef.current;
        
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        
        console.log('📸 Capturing frame for analysis');
        
        // Send to backend for analysis
        try {
          const response = await fetch('http://localhost:4000/proctoring/analyze-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              meetingId,
              userId: userInfo?.id,
              participantId: userInfo?.id,
              detections: { 
                frameAnalysis: true,
                faceCount: 1, // Will be updated by AI
                phoneDetected: false,
                suspiciousBehavior: false
              },
              browserData: { 
                imageData, 
                timestamp: Date.now(),
                browserProctoring: true
              }
            })
          });
          
          if (response.ok) {
            const result = await response.json();
            console.log('✅ Frame analysis result:', result);
            
            // Handle any alerts returned
            if (result.alerts && result.alerts.length > 0) {
              result.alerts.forEach((alert: any) => {
                handleProctoringAnalysis({ alerts: [alert] });
              });
            }
          }
        } catch (error) {
          console.error('❌ Frame analysis failed:', error);
        }
      };
      
      proctoringIntervalRef.current = setInterval(captureFrame, 3000);
      
      // Start deepfake checking every 15 seconds
      deepfakeIntervalRef.current = setInterval(() => {
        performDeepfakeCheck();
      }, 15000);
      return;
    }

    try {
      setIsProctoringActive(true);
      
      // Set window to proctoring mode (prevents minimization) - only if function exists
      if (window.electronAPI.setWindowMode) {
        await window.electronAPI.setWindowMode('proctoring');
      }
      
      // Load reference face if available
      if (userInfo?.profilePic && userInfo?.id) {
        await window.electronAPI.loadReferenceFace(userInfo.profilePic, userInfo.id);
      }
      
      // Start proctoring with session data
      const sessionData = {
        meetingId: meetingId || 'unknown',
        participantId: userInfo?.id || 'unknown',
        participantName: userInfo?.fullname || 'Unknown',
        startTime: new Date().toISOString()
      };
      
      await window.electronAPI.startProctoring(sessionData);
      
      // Start video frame capture
      const captureFrame = async () => {
        if (!localVideoRef.current) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = localVideoRef.current;
        
        if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        
        console.log('📸 Sending frame to Electron worker');
        
        try {
          const result = await window.electronAPI?.sendVideoFrame({
            imageData,
            timestamp: Date.now(),
            participantId: userInfo?.id,
            meetingId: meetingId,
            sessionData: {
              userId: userInfo?.id,
              studentName: userInfo?.fullname
            }
          });
          
          console.log('✅ Electron worker response:', result);
          
          // Also send to backend for session tracking
          await fetch('http://localhost:4000/proctoring/analyze-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              meetingId,
              userId: userInfo?.id,
              participantId: userInfo?.id,
              detections: { 
                electronProctoring: true,
                frameAnalysis: true
              },
              browserData: { 
                electronMode: true,
                timestamp: Date.now()
              }
            })
          });
        } catch (error) {
          console.error('❌ Electron worker failed:', error);
        }
      };
      
      proctoringIntervalRef.current = setInterval(captureFrame, 3000);
      
      // Start deepfake checking every 15 seconds
      deepfakeIntervalRef.current = setInterval(() => {
        performDeepfakeCheck();
      }, 15000);
      
      setFaceDetectionStatus('Proctoring active - Window locked');
      
      toast({
        title: "Proctoring Started",
        description: "AI monitoring is now active. Window cannot be minimized.",
      });
      
    } catch (error) {
      console.error('Failed to start proctoring:', error);
      setIsProctoringActive(false);
      setFaceDetectionStatus('Proctoring failed to start');
    }
  }, [isElectron, userInfo, isProctoringActive, meetingId, toast]);

  const stopProctoring = useCallback(async () => {
    setIsProctoringActive(false);
    
    if (proctoringIntervalRef.current) {
      clearInterval(proctoringIntervalRef.current);
      proctoringIntervalRef.current = null;
    }
    
    if (deepfakeIntervalRef.current) {
      clearInterval(deepfakeIntervalRef.current);
      deepfakeIntervalRef.current = null;
    }
    
    if (isElectron && window.electronAPI) {
      try {
        if (window.electronAPI.setWindowMode) {
          await window.electronAPI.setWindowMode('normal');
        }
        await window.electronAPI.stopProctoring();
        setFaceDetectionStatus('Proctoring stopped - Window unlocked');
      } catch (error) {
        console.error('Failed to stop proctoring:', error);
      }
    } else {
      setFaceDetectionStatus('Browser monitoring stopped');
    }
  }, [isElectron]);

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
          facingMode: 'user'
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setRoom(newRoom);

      newRoom.on(RoomEvent.Connected, async () => {
        console.log("✅ Student connected to room");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Enable camera and microphone
        try {
          if (isVideoEnabled) {
            await newRoom.localParticipant.setCameraEnabled(true);
            setTimeout(() => startProctoring(), 1000);
          }
          if (isAudioEnabled) {
            await newRoom.localParticipant.setMicrophoneEnabled(true);
          }
          
          // Attach local video
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

      // Track publication events to sync state
      newRoom.on(RoomEvent.LocalTrackPublished, (publication) => {
        if (publication.kind === 'video') {
          setIsVideoEnabled(true);
        } else if (publication.kind === 'audio') {
          setIsAudioEnabled(true);
        }
      });

      newRoom.on(RoomEvent.LocalTrackUnpublished, (publication) => {
        if (publication.kind === 'video') {
          setIsVideoEnabled(false);
        } else if (publication.kind === 'audio') {
          setIsAudioEnabled(false);
        }
      });

      newRoom.on(RoomEvent.Disconnected, () => {
        console.log("❌ Student disconnected from room");
        setIsConnected(false);
        setIsConnecting(false);
        stopProctoring();
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("Participant connected:", participant.identity);
        setTutorParticipant(participant);
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === "video") {
          setTimeout(() => {
            if (tutorVideoRef.current && track.attach) {
              track.attach(tutorVideoRef.current);
            }
          }, 500);
        }
      });

      // Handle data messages
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          
          if (data.type === 'KICK_NOTIFICATION' && data.participantId === userInfo?.id) {
            toast({
              title: "Removed from Meeting",
              description: "You have been removed from the meeting by the tutor",
              variant: "destructive",
            });
            if (room) {
              room.disconnect();
            }
            onDisconnect?.();
          }
        } catch (error) {
          console.error('Error parsing data message:', error);
        }
      });

      // Connect to server
      let actualServerUrl = serverUrl;
      if (!actualServerUrl.startsWith('ws://') && !actualServerUrl.startsWith('wss://')) {
        actualServerUrl = `ws://${actualServerUrl}`;
      }
      if (actualServerUrl.includes('localhost') && !actualServerUrl.includes('7880')) {
        actualServerUrl = 'ws://localhost:7880';
      }

      await newRoom.connect(actualServerUrl, token, {
        autoSubscribe: true,
        maxRetries: 3,
        peerConnectionTimeout: 15000,
        websocketTimeout: 10000,
        rtcConfig: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ],
          iceCandidatePoolSize: 10
        }
      });
      
    } catch (error: any) {
      console.error("❌ Failed to connect to LiveKit:", error);
      setIsConnecting(false);
      setConnectionError('Failed to connect to meeting. Please check your connection.');
      
      toast({
        title: "Connection Failed",
        description: "Could not connect to the meeting room.",
        variant: "destructive",
      });
    }
  };

  const toggleVideo = async () => {
    if (room?.localParticipant) {
      try {
        const newVideoState = !isVideoEnabled;
        await room.localParticipant.setCameraEnabled(newVideoState);
        
        // Send state update to tutor
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
          type: 'PARTICIPANT_STATE_UPDATE',
          data: {
            participantId: userInfo?.id,
            studentName: userInfo?.fullname,
            videoEnabled: newVideoState,
            audioEnabled: isAudioEnabled,
            timestamp: new Date().toISOString()
          }
        }));
        room.localParticipant.publishData(data, { reliable: true });
        
        if (newVideoState) {
          setTimeout(() => startProctoring(), 1000);
        } else {
          stopProctoring();
          setFaceDetectionStatus('Video disabled');
        }
      } catch (error) {
        console.error("Failed to toggle video:", error);
      }
    }
  };

  const toggleAudio = async () => {
    if (room?.localParticipant) {
      try {
        const newAudioState = !isAudioEnabled;
        await room.localParticipant.setMicrophoneEnabled(newAudioState);
        
        // Send state update to tutor
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify({
          type: 'PARTICIPANT_STATE_UPDATE',
          data: {
            participantId: userInfo?.id,
            studentName: userInfo?.fullname,
            videoEnabled: isVideoEnabled,
            audioEnabled: newAudioState,
            timestamp: new Date().toISOString()
          }
        }));
        room.localParticipant.publishData(data, { reliable: true });
      } catch (error) {
        console.error("Failed to toggle audio:", error);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;
    
    try {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
        toast({
          title: "Screen Share Stopped",
          description: "You stopped sharing your screen",
        });
      } else {
        await room.localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
        toast({
          title: "Screen Share Started",
          description: "You are now sharing your screen",
        });
      }
      
      // Send state update to tutor
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({
        type: 'PARTICIPANT_STATE_UPDATE',
        data: {
          participantId: userInfo?.id,
          studentName: userInfo?.fullname,
          screenSharing: !isScreenSharing,
          timestamp: new Date().toISOString()
        }
      }));
      room.localParticipant.publishData(data, { reliable: true });
    } catch (error) {
      console.error("Screen share failed:", error);
      toast({
        title: "Screen Share Error",
        description: "Failed to toggle screen sharing",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    connectToRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
      stopProctoring();
    };
  }, [token, serverUrl]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <Video className="w-10 h-10 text-white" />
          </div>
          {connectionError ? (
            <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-2xl font-bold mb-4 text-red-400">Connection Failed</h1>
              <p className="text-gray-300 mb-6">{connectionError}</p>
              <button 
                onClick={() => connectToRoom()}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-6 rounded-2xl hover:scale-105 transition-transform shadow-xl"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-2xl font-bold mb-6 text-blue-300">Connecting to Class...</h1>
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-300">Joining the classroom session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-black/20 backdrop-blur-3xl border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Student Session</h2>
          <Badge className={`${
            isProctoringActive 
              ? "bg-green-400 text-black" 
              : "bg-gray-600 text-white"
          }`}>
            <Shield className="w-4 h-4 mr-1" />
            AI Proctoring {isProctoringActive ? 'Active' : 'Inactive'}
          </Badge>
          {isElectron && (
            <Badge className="bg-purple-400 text-black">
              💻 Electron Mode
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          {proctoringAlerts.length > 0 && (
            <Badge className="bg-red-400 text-black flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {proctoringAlerts.length} Alerts
            </Badge>
          )}
          <Badge className="bg-blue-400 text-black flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {faceDetectionStatus}
          </Badge>
          {deepfakeCheckCount > 0 && (
            <Badge className="bg-purple-500 text-white flex items-center gap-1">
              🛡️ {deepfakeCheckCount} Deepfake Checks
            </Badge>
          )}
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Tutor Video */}
          <div className="relative bg-black/40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            {tutorParticipant ? (
              <video
                ref={tutorVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/60">
                <div className="text-center">
                  <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-300">Waiting for tutor...</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="font-semibold">Tutor</span>
            </div>
          </div>

          {/* Student Video */}
          <div className="relative bg-black/40 rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-full backdrop-blur-sm">
              <span className="font-semibold">{userInfo?.fullname || 'You'} (You)</span>
            </div>
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <Badge className={`${
                isProctoringActive ? 'bg-green-400 text-black' : 'bg-gray-600 text-white'
              }`}>
                {isProctoringActive ? 'Monitoring' : 'Inactive'}
              </Badge>
              {isScreenSharing && (
                <Badge className="bg-blue-400 text-black">
                  Sharing Screen
                </Badge>
              )}
              <div className="flex gap-1">
                {!isVideoEnabled && (
                  <Badge className="bg-red-500 text-white text-xs">
                    Video Off
                  </Badge>
                )}
                {!isAudioEnabled && (
                  <Badge className="bg-red-500 text-white text-xs">
                    Muted
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-black/20 backdrop-blur-3xl border-t border-white/10 flex justify-center gap-4">
        <Button
          onClick={toggleAudio}
          size="lg"
          className={`rounded-full w-14 h-14 p-0 transition-all ${
            isAudioEnabled 
              ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </Button>
        
        <Button
          onClick={toggleVideo}
          size="lg"
          className={`rounded-full w-14 h-14 p-0 transition-all ${
            isVideoEnabled 
              ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' 
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
        </Button>

        <Button
          onClick={toggleScreenShare}
          size="lg"
          className={`rounded-full w-14 h-14 p-0 transition-all ${
            isScreenSharing 
              ? 'bg-blue-500 hover:bg-blue-600 text-white' 
              : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
          }`}
        >
          <Monitor className="w-6 h-6" />
        </Button>

        <Button
          onClick={() => setShowQuizPanel(!showQuizPanel)}
          size="lg"
          className={`rounded-full w-14 h-14 p-0 transition-all ${
            showQuizPanel 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-white/20 hover:bg-white/30 text-white border-white/30'
          }`}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>

        <Button
          onClick={() => {
            if (room) {
              room.disconnect();
            }
            onDisconnect?.();
          }}
          size="lg"
          className="rounded-full w-14 h-14 p-0 bg-red-500 hover:bg-red-600 text-white transition-all hover:scale-105"
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>

      {/* Quiz Panel */}
      {showQuizPanel && (
        <div className="fixed right-4 top-20 w-96 bg-white/95 backdrop-blur-xl rounded-2xl border border-blue-200/50 shadow-2xl">
          <div className="p-4 border-b border-blue-200/50 flex justify-between items-center">
            <h3 className="font-bold text-blue-600">Quiz Panel</h3>
            <Button
              onClick={() => setShowQuizPanel(false)}
              variant="ghost"
              size="sm"
              className="rounded-full w-8 h-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-4">
            <StudentQuizPanel
              meetingId={meetingId}
              isConnected={isConnected}
              userInfo={userInfo}
            />
          </div>
        </div>
      )}

      {/* Alerts Panel */}
      {proctoringAlerts.length > 0 && (
        <div className="fixed left-4 top-20 w-80 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/20 p-4 max-h-96 overflow-y-auto shadow-2xl">
          <h3 className="font-bold text-white mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Recent Alerts ({proctoringAlerts.length})
          </h3>
          <div className="space-y-2">
            {proctoringAlerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border backdrop-blur-sm ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500/20 border-red-400' :
                  alert.severity === 'HIGH' ? 'bg-orange-500/20 border-orange-400' :
                  alert.severity === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-400' :
                  'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-gray-200">
                    {alert.alertType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-100">{alert.description}</p>
                <div className="text-xs text-gray-300 mt-1">
                  Confidence: {Math.round(alert.confidence * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}