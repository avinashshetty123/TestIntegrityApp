"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Room, RoomEvent, RemoteParticipant } from "livekit-client";
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, MessageSquare,
  AlertTriangle, Bell, Eye, Shield
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

declare global {
  interface Window {
    electronAPI?: {
      sendVideoFrame: (frameData: any) => Promise<boolean>;
      loadReferenceFace: (imageUrl: string, userId: string) => Promise<boolean>;
      startProctoring: (sessionData: any) => Promise<boolean>;
      stopProctoring: () => Promise<boolean>;
      getProctoringStatus: () => Promise<boolean>;
      setWindowMode: (mode: string) => Promise<boolean>;
      onProctoringAnalysis: (callback: (analysis: any) => void) => void;
      removeAllListeners: (channel: string) => void;
      isElectron: boolean;
    };
    isElectron?: boolean;
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

export default function StreamlinedStudentMeeting({ 
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
  const [tutorParticipant, setTutorParticipant] = useState<RemoteParticipant | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [proctoringAlerts, setProctoringAlerts] = useState<ProctoringAlert[]>([]);
  const [isProctoringActive, setIsProctoringActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Initializing...');
  const [isElectron, setIsElectron] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const tutorVideoRef = useRef<HTMLVideoElement>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Check if running in Electron
  useEffect(() => {
    const electronAvailable = !!(window.electronAPI || window.isElectron);
    setIsElectron(electronAvailable);
    console.log('Electron available:', electronAvailable);
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
      await fetch('http://localhost:4000/proctoring/analyze-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          userId: userInfo?.id,
          participantId: userInfo?.id,
          detections: {
            alertType: alert.alertType,
            confidence: alert.confidence
          },
          browserData: { automatedDetection: true }
        })
      });
    } catch (error) {
      console.error('Failed to report proctoring alert:', error);
    }
  };

  const startProctoring = useCallback(async () => {
    if (!isElectron || !window.electronAPI) {
      console.log('Not in Electron environment, starting browser proctoring');
      setIsProctoringActive(true);
      setFaceDetectionStatus('Browser monitoring active');
      
      // Start browser-based frame capture
      const captureFrame = () => {
        if (!localVideoRef.current || !isProctoringActive) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = localVideoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          // Send to backend for analysis
          fetch('http://localhost:4000/proctoring/analyze-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              meetingId,
              userId: userInfo?.id,
              participantId: userInfo?.id,
              detections: { frameAnalysis: true },
              browserData: { imageData, timestamp: Date.now() }
            })
          }).catch(error => console.error('Frame analysis failed:', error));
        }
      };
      
      // Capture frames every 3 seconds
      proctoringIntervalRef.current = setInterval(captureFrame, 3000);
      return;
    }

    try {
      setIsProctoringActive(true);
      
      // Set window to proctoring mode (prevents minimization)
      await window.electronAPI.setWindowMode('proctoring');
      
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
      const captureFrame = () => {
        if (!localVideoRef.current || !isProctoringActive) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = localVideoRef.current;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        if (ctx && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          window.electronAPI?.sendVideoFrame({
            imageData,
            timestamp: Date.now(),
            participantId: userInfo?.id,
            meetingId: meetingId
          });
        }
      };
      
      // Capture frames every 3 seconds
      proctoringIntervalRef.current = setInterval(captureFrame, 3000);
      
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
    
    if (isElectron && window.electronAPI) {
      try {
        // Reset window mode
        await window.electronAPI.setWindowMode('normal');
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
        },
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
        peerConnectionTimeout: 10000,
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
        setIsVideoEnabled(newVideoState);
        
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
        await room.localParticipant.setMicrophoneEnabled(!isAudioEnabled);
        setIsAudioEnabled(!isAudioEnabled);
      } catch (error) {
        console.error("Failed to toggle audio:", error);
      }
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-white" />
          </div>
          {connectionError ? (
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 border border-blue-200/30">
              <h1 className="text-2xl font-bold mb-4 text-red-600">Connection Failed</h1>
              <p className="text-gray-700 mb-6">{connectionError}</p>
              <button 
                onClick={() => connectToRoom()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-6 rounded-2xl"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 border border-blue-200/30">
              <h1 className="text-2xl font-bold mb-6 text-blue-600">Connecting to Class...</h1>
              <div className="w-12 h-12 border-4 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-700">Joining the classroom session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-white flex flex-col">
      {/* Header */}
      <div className="p-4 bg-white/60 backdrop-blur-3xl border-b border-blue-200/30 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-blue-600">Student Session</h2>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
            isProctoringActive 
              ? "bg-green-500 text-white" 
              : "bg-gray-500 text-white"
          }`}>
            <Shield className="w-4 h-4" />
            AI Proctoring {isProctoringActive ? 'Active' : 'Inactive'}
          </div>
          {isElectron && (
            <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
              💻 Electron Mode
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {proctoringAlerts.length > 0 && (
            <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              {proctoringAlerts.length} Alerts
            </div>
          )}
          <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
            <Eye className="w-4 h-4" />
            {faceDetectionStatus}
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4 h-full">
          {/* Tutor Video */}
          <div className="relative bg-white/80 rounded-2xl overflow-hidden border border-blue-200/40">
            {tutorParticipant ? (
              <video
                ref={tutorVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-blue-100">
                <div className="text-center">
                  <VideoOff className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-600">Waiting for tutor...</p>
                </div>
              </div>
            )}
            <div className="absolute bottom-3 left-3 bg-white/90 text-gray-800 px-3 py-1 rounded-full">
              <span className="font-semibold">Tutor</span>
            </div>
          </div>

          {/* Student Video */}
          <div className="relative bg-white/80 rounded-2xl overflow-hidden border border-blue-200/40">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            <div className="absolute bottom-3 left-3 bg-white/90 text-gray-800 px-3 py-1 rounded-full">
              <span className="font-semibold">{userInfo?.fullname || 'You'} (You)</span>
            </div>
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <div className={`px-2 py-1 rounded-lg text-xs font-semibold text-white ${
                isProctoringActive ? 'bg-green-500' : 'bg-gray-500'
              }`}>
                {isProctoringActive ? 'Monitoring' : 'Inactive'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-4 bg-white/60 backdrop-blur-3xl border-t border-blue-200/30 flex justify-center gap-4">
        <button
          onClick={toggleAudio}
          className={`rounded-full w-12 h-12 flex items-center justify-center transition-all ${
            isAudioEnabled 
              ? 'bg-white/80 text-gray-700 hover:bg-white/90' 
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        
        <button
          onClick={toggleVideo}
          className={`rounded-full w-12 h-12 flex items-center justify-center transition-all ${
            isVideoEnabled 
              ? 'bg-white/80 text-gray-700 hover:bg-white/90' 
              : 'bg-red-500 text-white hover:bg-red-600'
          }`}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={() => {
            if (room) {
              room.disconnect();
            }
            onDisconnect?.();
          }}
          className="rounded-full w-12 h-12 bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-all"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>

      {/* Alerts Panel */}
      {proctoringAlerts.length > 0 && (
        <div className="fixed right-4 top-20 w-80 bg-white/90 backdrop-blur-xl rounded-2xl border border-blue-200/50 p-4 max-h-96 overflow-y-auto">
          <h3 className="font-bold text-blue-600 mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Recent Alerts ({proctoringAlerts.length})
          </h3>
          <div className="space-y-2">
            {proctoringAlerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'CRITICAL' ? 'bg-red-100 border-red-300' :
                  alert.severity === 'HIGH' ? 'bg-orange-100 border-orange-300' :
                  alert.severity === 'MEDIUM' ? 'bg-yellow-100 border-yellow-300' :
                  'bg-gray-100 border-gray-300'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold text-gray-600">
                    {alert.alertType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{alert.description}</p>
                <div className="text-xs text-gray-500 mt-1">
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