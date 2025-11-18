"use client";

import { useEffect, useRef, useState } from "react";
import { Room, RoomEvent, RemoteParticipant, DataPacket_Kind } from "livekit-client";
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, MessageSquare,
  AlertTriangle, CheckCircle, XCircle, Bell, Eye, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import StudentQuizPanel from "@/components/StudentQuizPanel";

// Extend Window interface for Electron API
declare global {
  interface Window {
    electronAPI?: {
      sendVideoFrame: (frameData: any) => Promise<boolean>;
       loadReferenceFace: (imageUrl:string, userId:any) =>Promise<boolean>;
      startProctoring: () => Promise<boolean>;
      stopProctoring: () => Promise<boolean>;
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
  detectedAt: string;
  participantId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  studentName?: string;
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
  const [quizInProgress, setQuizInProgress] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [deepfakeCheckCount, setDeepfakeCheckCount] = useState(0);
  const [lastDeepfakeCheck, setLastDeepfakeCheck] = useState<Date | null>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const tutorVideoRef = useRef<HTMLVideoElement>(null);
  const videoFrameCanvasRef = useRef<HTMLCanvasElement>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deepfakeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const { toast } = useToast();

  // Check if running in Electron
  useEffect(() => {
    const electronAvailable = !!window.electronAPI;
    setIsElectron(electronAvailable);
    console.log('Electron API available:', electronAvailable);
    if (electronAvailable && window.electronAPI) {
      console.log('Electron API methods:', Object.keys(window.electronAPI));
    }
  }, []);

  // Setup Electron event listeners
  useEffect(() => {
    if (window.electronAPI) {
      console.log('Setting up Electron proctoring listeners');
      window.electronAPI.onProctoringAnalysis((analysis) => {
        console.log('Received proctoring analysis from Electron:', analysis);
        handleProctoringAnalysis(analysis);
      });

      return () => {
        console.log('Cleaning up Electron listeners');
        window.electronAPI?.removeAllListeners('proctoring-analysis');
      };
    }
  }, []);

  // WebSocket connection for non-Electron environment
  useEffect(() => {
    if (!isElectron && isConnected) {
      const ws = new WebSocket('ws://localhost:3002');
      
      ws.onopen = () => {
        console.log('Connected to proctoring WebSocket');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'PROCTORING_ANALYSIS') {
            handleProctoringAnalysis(data.data);
          }
        } catch (error: unknown) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current = ws;

      return () => {
        ws.close();
      };
    }
  }, [isElectron, isConnected]);
  console.log((userInfo?.id));

  const captureAndSendFrame = async () => {
    if (!localVideoRef.current || !videoFrameCanvasRef.current) return;

    const video = localVideoRef.current;
    const canvas = videoFrameCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to base64 with lower quality to reduce size
    const base64Image = canvas.toDataURL('image/jpeg', 0.3);

    const frameData = {
      imageData: base64Image,
      meetingId,
      userId: userInfo?.id,
      participantId: userInfo?.id,
      timestamp: Date.now()
    };

    // Send frame to analysis
    if (isElectron && window.electronAPI) {
      try {
        console.log('Sending frame to Electron API');
        const result = await window.electronAPI.sendVideoFrame(frameData);
        console.log('Electron frame analysis result:', result);
      } catch (error) {
        console.error('Failed to send frame to Electron:', error);
      }
    } else if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('Sending frame via WebSocket');
      wsRef.current.send(JSON.stringify({
        type: 'VIDEO_FRAME',
        data: frameData
      }));
    } else {
      console.log('No proctoring connection available (Electron or WebSocket)');
    }

    // Send to proctoring service for basic analysis
    await sendFrameForAnalysis(frameData);
  };

  const sendFrameForAnalysis = async (frameData: any) => {
    try {
      // Use enhanced analysis every 5th frame (includes deepfake check)
      const shouldIncludeDeepfake = deepfakeCheckCount % 5 === 0;
      
      const response = await fetch('http://localhost:4000/proctoring/enhanced-frame-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          userId: userInfo?.id,
          participantId: userInfo?.id,
          frameData: frameData.imageData,
          includeDeepfakeCheck: shouldIncludeDeepfake
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.alerts && result.alerts.length > 0) {
          result.alerts.forEach((alert: any) => {
            handleProctoringAnalysis({ alerts: [alert] });
          });
        }
        
        if (result.deepfakeCheckPerformed) {
          setDeepfakeCheckCount(prev => prev + 1);
          setLastDeepfakeCheck(new Date());
        }
      }
    } catch (error) {
      console.error('Failed to send frame for analysis:', error);
    }
  };

  const performDeepfakeCheck = async () => {
    if (!localVideoRef.current || !videoFrameCanvasRef.current) return;

    const video = localVideoRef.current;
    const canvas = videoFrameCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;

    try {
      // Capture frame
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const formData = new FormData();
        formData.append('file', blob, 'frame.jpg');
        formData.append('userId', userInfo?.id || '');
        formData.append('meetingId', meetingId);
        formData.append('participantId', userInfo?.id || '');

        try {
          const response = await fetch('http://localhost:4000/deepfake/check', {
            method: 'POST',
            credentials: 'include',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            setDeepfakeCheckCount(prev => prev + 1);
            setLastDeepfakeCheck(new Date());
            
            // Update status based on result
            if (result.result?.label === 'fake') {
              setFaceDetectionStatus(`⚠️ Deepfake detected (${Math.round(result.result.confidence * 100)}%)`);
              toast({
                title: "⚠️ Identity Verification Alert",
                description: "Potential synthetic face detected",
                variant: "destructive",
                duration: 5000,
              });
            } else {
              setFaceDetectionStatus(`✅ Face verified (${Math.round(result.result.confidence * 100)}%)`);
            }
          }
        } catch (error) {
          console.error('Deepfake check failed:', error);
        }
      }, 'image/jpeg', 0.4);
    } catch (error) {
      console.error('Failed to perform deepfake check:', error);
    }
  };

  const startProctoring = async () => {
    if (!isVideoEnabled || !localVideoRef.current) return;

    try {
      if (isElectron && window.electronAPI) {
        await window.electronAPI.startProctoring();
      }

      setIsProctoringActive(true);
      
      // Start periodic frame analysis (every 5 seconds for regular checks)
      proctoringIntervalRef.current = setInterval(captureAndSendFrame, 5000);
      
      // Start deepfake detection (every 45 seconds via direct API)
      deepfakeIntervalRef.current = setInterval(performDeepfakeCheck, 45000);
      
      // Perform initial checks
      setTimeout(captureAndSendFrame, 2000);
      setTimeout(performDeepfakeCheck, 5000);

      toast({
        title: "Proctoring Started",
        description: "AI proctoring with deepfake detection is now active",
      });
    } catch (error) {
      console.error('Failed to start proctoring:', error);
    }
  };

  const stopProctoring = async () => {
    if (proctoringIntervalRef.current) {
      clearInterval(proctoringIntervalRef.current);
      proctoringIntervalRef.current = null;
    }
    
    if (deepfakeIntervalRef.current) {
      clearInterval(deepfakeIntervalRef.current);
      deepfakeIntervalRef.current = null;
    }

    try {
      if (isElectron && window.electronAPI) {
        await window.electronAPI.stopProctoring();
      }

      setIsProctoringActive(false);
      setFaceDetectionStatus('Proctoring stopped');
    } catch (error) {
      console.error('Failed to stop proctoring:', error);
    }
  };

 // Add this function to load reference face
const loadReferenceFace = async () => {
  try {
    // Fetch user profile to get image URL
    const response = await fetch('http://localhost:4000/user/profile', {
      credentials: 'include'
    });
    
    if (response.ok) {
      const profile = await response.json();
      if (profile.profilePic) {
        // Load reference face for identity verification
        if (window.electronAPI) {
          await window.electronAPI.loadReferenceFace(profile.profilePic, profile?.id);
          toast({
            title: "Face Recognition Enabled",
            description: "Your face is being used for identity verification",
          });
        }
      }
    }
  } catch (error) {
    console.error('Failed to load reference face:', error);
  }
};

// Call this when component mounts or when user connects
useEffect(() => {
  if (isConnected && userInfo?.id) {
    loadReferenceFace();
  }
}, [isConnected, userInfo]);

// Update the proctoring analysis handler
const handleProctoringAnalysis = (analysis: any) => {
  if (analysis.alerts && analysis.alerts.length > 0) {
    analysis.alerts.forEach((alert: any) => {
      const newAlert: ProctoringAlert = {
        id: `alert-${Date.now()}-${Math.random()}`,
        alertType: alert.alertType,
        description: alert.description,
        confidence: alert.confidence,
        detectedAt: new Date().toISOString(),
        participantId: userInfo?.id || '',
        severity: alert.severity || 'MEDIUM',
        studentName: userInfo?.fullname,
        timestamp: new Date().toISOString()
      };

      setProctoringAlerts(prev => [newAlert, ...prev.slice(0, 4)]);

      // Show toast for important alerts
      if (alert.severity === 'HIGH' || alert.severity === 'CRITICAL') {
        toast({
          title: "🚨 Proctoring Alert",
          description: alert.description,
          variant: "destructive",
          duration: 3000,
        });
      }

      // Send alert to backend
      reportProctoringAlert(newAlert);
    });
  }

  // Update face detection status with identity verification
  if (analysis.faceDetected !== undefined) {
    let status = analysis.faceDetected ? 
      `Face detected ✅ (${analysis.faceCount || 0})` : 'No face detected ⚠️';
    
    if (analysis.identityVerified) {
      status += ' 👤 Verified';
    }
    
    if (analysis.objectsDetected && analysis.objectsDetected.length > 0) {
      console.log('Objects detected:', analysis.objectsDetected);
    }
    setFaceDetectionStatus(status);
  }
};

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

  // Browser activity monitoring (same as before)
  const setupBrowserMonitoring = () => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        reportBrowserActivity('TAB_SWITCH', { hidden: true });
      }
    };

    const handleWindowFocus = () => {
      reportBrowserActivity('WINDOW_FOCUS', { focused: true });
    };

    const handleWindowBlur = () => {
      reportBrowserActivity('WINDOW_BLUR', { focused: false });
    };

    const handleCopyPaste = (event: ClipboardEvent) => {
      if (quizInProgress) {
        reportBrowserActivity('COPY_PASTE', { 
          type: event.type,
          timestamp: new Date().toISOString()
        });
      }
    };

    const preventContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      reportBrowserActivity('CONTEXT_MENU_ATTEMPT', { blocked: true });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    
    if (quizInProgress) {
      document.addEventListener('contextmenu', preventContextMenu);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  };
  console.log(userInfo);

  const reportBrowserActivity = async (activityType: string, metadata?: any) => {
    if (!userInfo?.id || !meetingId) {
      console.warn('Missing user info or meeting ID for browser activity');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:4000/proctoring/browser-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          meetingId,
          userId: userInfo.id,
          participantId: userInfo.id,
          activityType,
          metadata
        })
      });
      
      if (!response.ok) {
        console.warn(`Browser activity report failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to report browser activity:', error);
    }
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
        console.log("✅ Student connected to room");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Check for existing remote participants
        const remoteParticipants = Array.from(newRoom.remoteParticipants.values());
        console.log("Existing remote participants:", remoteParticipants.length);
        
        if (remoteParticipants.length > 0) {
          const firstParticipant = remoteParticipants[0];
          setTutorParticipant(firstParticipant);
          console.log("Set existing participant as tutor:", firstParticipant.identity);
          
          // Try to attach existing video tracks
          setTimeout(() => {
            firstParticipant.videoTrackPublications.forEach((publication) => {
              if (publication.track && tutorVideoRef.current) {
                console.log("Attaching existing video track");
                publication.track.attach(tutorVideoRef.current);
              }
            });
          }, 1000);
        }
        
        // Enable camera and microphone
        try {
          if (isVideoEnabled) {
            await newRoom.localParticipant.setCameraEnabled(true);
            // Start proctoring after camera is enabled
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
        console.log("Participant connected:", participant.identity, participant.name);
        // Set any remote participant as tutor (since student should only see tutor)
        setTutorParticipant(participant);
        console.log("Tutor participant set:", participant.identity);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log("Participant disconnected:", participant.identity);
        if (tutorParticipant?.identity === participant.identity) {
          setTutorParticipant(null);
        }
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", track.kind, "from:", participant.identity);
        if (track.kind === "video") {
          // Attach any remote video track to tutor video element
          setTimeout(() => {
            const videoElement = tutorVideoRef.current;
            if (videoElement && track.attach) {
              console.log("Attaching video track to tutor video element");
              track.attach(videoElement);
            }
          }, 500);
          
          // Update tutor participant if not set
          if (!tutorParticipant) {
            setTutorParticipant(participant);
          }
        }
      });

      // Handle data messages for quizzes and alerts
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const jsonString = decoder.decode(payload);
          const data = JSON.parse(jsonString);
          console.log('📨 Data received from LiveKit:', data);
          
          if (data.type === 'QUIZ_START') {
            setQuizInProgress(true);
            setShowQuizPanel(true);
            toast({
              title: "Quiz Started",
              description: "A quiz has been started by the tutor",
            });
          } else if (data.type === 'QUIZ_END') {
            setQuizInProgress(false);
            toast({
              title: "Quiz Ended",
              description: "The quiz has been ended by the tutor",
            });
          } else if (data.type === 'KICK_NOTIFICATION') {
            if (data.participantId === userInfo?.id) {
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
          } else if (data.type === 'PROCTORING_ALERT') {
            // Handle proctoring alerts from tutor
            console.log('🚨 Proctoring alert received:', data.data);
            const alert = data.data;
            setProctoringAlerts(prev => [{
              id: `tutor-alert-${Date.now()}`,
              ...alert,
              timestamp: new Date().toISOString()
            }, ...prev.slice(0, 4)]);
          }
        } catch (error) {
          console.error('❌ Error parsing data message:', error);
        }
      });

      // Fix server URL connection
      let actualServerUrl = serverUrl;
      
      // Handle different server URL formats
      if (actualServerUrl.startsWith('http://')) {
        actualServerUrl = actualServerUrl.replace('http://', 'ws://');
      } else if (actualServerUrl.startsWith('https://')) {
        actualServerUrl = actualServerUrl.replace('https://', 'wss://');
      } else if (!actualServerUrl.startsWith('ws://') && !actualServerUrl.startsWith('wss://')) {
        actualServerUrl = `ws://${actualServerUrl}`;
      }
      
      // Default to localhost if needed
      if (actualServerUrl.includes('localhost') && !actualServerUrl.includes(':')) {
        actualServerUrl = 'ws://localhost:7880';
      }
      
      // Fallback URLs to try
      const urlsToTry = [
        actualServerUrl,
        'ws://localhost:7880',
        'ws://127.0.0.1:7880',
        'wss://localhost:7880'
      ];

      console.log('🔄 Student connecting to LiveKit server. URLs to try:', urlsToTry);
      
      let connected = false;
      let lastError = null;
      
      for (const url of urlsToTry) {
        try {
          console.log(`Trying to connect to: ${url}`);
          await newRoom.connect(url, token, {
            autoSubscribe: true,
            maxRetries: 2,
            peerConnectionTimeout: 10000,
          });
          connected = true;
          console.log(`✅ Successfully connected to: ${url}`);
          break;
        } catch (error: any) {
          console.log(`❌ Failed to connect to ${url}:`, error.message);
          lastError = error;
          continue;
        }
      }
      
      if (!connected) {
        throw lastError || new Error('Failed to connect to any LiveKit server');
      }
    } catch (error: any) {
      console.error("❌ Failed to connect to LiveKit:", error);
      setIsConnecting(false);
      
      let errorMessage = 'Failed to connect to meeting.';
      if (error.message?.includes('WebSocket')) {
        errorMessage = 'WebSocket connection failed. Check if LiveKit server is running on port 7880.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your network connection.';
      } else if (error.message?.includes('token')) {
        errorMessage = 'Invalid token. Please refresh and try again.';
      }
      
      setConnectionError(errorMessage);
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
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
          // Start proctoring when video is enabled
          setTimeout(() => startProctoring(), 1000);
        } else {
          // Stop proctoring when video is disabled
          stopProctoring();
          setFaceDetectionStatus('Video disabled');
        }
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
    };
    return colors[alertType] || 'bg-gray-500';
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

  useEffect(() => {
    connectToRoom();
    const cleanupBrowserMonitoring = setupBrowserMonitoring();
    
    return () => {
      if (room) {
        room.disconnect();
      }
      stopProctoring();
      cleanupBrowserMonitoring();
    };
  }, [token, serverUrl]);

  useEffect(() => {
    // Start/stop proctoring based on video state
    if (isConnected && isVideoEnabled) {
      startProctoring();
    } else {
      stopProctoring();
    }
  }, [isConnected, isVideoEnabled]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center font-['Inter']">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_15px_35px_rgba(251,146,60,0.3)]">
            <Video className="w-10 h-10 text-white" />
          </div>
          {connectionError ? (
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/30">
              <h1 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">Connection Failed</h1>
              <p className="text-gray-700 mb-6 font-medium">{connectionError}</p>
              <div className="space-y-2 mb-6 text-sm text-gray-600 bg-orange-50 p-4 rounded-2xl">
                <p className="font-semibold text-orange-800">Debug Info:</p>
                <p>Server URL: {serverUrl}</p>
                <p>Token: {token ? 'Present' : 'Missing'}</p>
                <p>Electron: {isElectron ? 'Yes' : 'No'}</p>
              </div>
              <button onClick={() => connectToRoom()} className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-2xl shadow-[0_15px_35px_rgba(251,146,60,0.3)] hover:shadow-[0_20px_45px_rgba(251,146,60,0.4)] transform hover:scale-[1.02] transition-all duration-300">
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/30">
              <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">Connecting to Class...</h1>
              <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-600 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-gray-700 font-medium">Joining the classroom session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex font-['Inter']">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="p-6 bg-white/60 backdrop-blur-3xl border-b border-orange-200/30 flex justify-between items-center shadow-[0_8px_25px_rgba(251,146,60,0.1)]">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">Classroom Session</h2>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
              isProctoringActive 
                ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30" 
                : "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-gray-500/30"
            }`}>
              <Shield className="w-4 h-4" />
              AI Proctoring {isProctoringActive ? 'Active' : 'Inactive'}
            </div>
            <div className={`px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
              quizInProgress 
                ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30" 
                : "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-blue-500/30"
            }`}>
              {quizInProgress ? "Quiz in Progress" : "Active"}
            </div>
          </div>
          <div className="flex gap-3">
            {proctoringAlerts.length > 0 && (
              <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-red-500/30 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {proctoringAlerts.length} Alerts
              </div>
            )}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-orange-500/30 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {faceDetectionStatus}
            </div>
            {isElectron && (
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-purple-500/30 flex items-center gap-2">
                💻 Electron Mode
              </div>
            )}
            {tutorParticipant && (
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-green-500/30 flex items-center gap-2">
                👥 Tutor Connected
              </div>
            )}
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Tutor Video (Main) */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/40 hover:shadow-[0_25px_60px_rgba(251,146,60,0.2)] transition-all duration-300">
              {tutorParticipant ? (
                <video
                  ref={tutorVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200">
                  <div className="text-center">
                    <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-3xl shadow-lg shadow-orange-500/30 mb-6 inline-block">
                      <VideoOff className="w-16 h-16 text-white" />
                    </div>
                    <p className="text-gray-700 font-semibold text-lg">Tutor video will appear here</p>
                  </div>
                </div>
              )}
              
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xl text-gray-800 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-[0_10px_25px_rgba(251,146,60,0.2)]">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-sm font-bold text-white">T</span>
                </div>
                <span className="font-bold">Tutor</span>
              </div>
            </div>

            {/* Local Student Video */}
            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/40 hover:shadow-[0_25px_60px_rgba(251,146,60,0.2)] transition-all duration-300">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-xl text-gray-800 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-[0_10px_25px_rgba(251,146,60,0.2)]">
                <img 
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${userInfo?.fullname || 'You'}`}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border-2 border-orange-300"
                />
                <span className="font-bold">{userInfo?.fullname || 'You'} (You)</span>
                {!isVideoEnabled && <VideoOff className="w-5 h-5 text-red-500" />}
              </div>

              {/* Proctoring Status Overlay */}
              <div className="absolute top-4 right-4 flex flex-col gap-3 items-end">
                <div className={`px-3 py-2 rounded-xl font-semibold text-xs text-white shadow-lg flex items-center gap-2 ${
                  isProctoringActive ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-green-500/30' : 'bg-gradient-to-r from-gray-500 to-gray-600 shadow-gray-500/30'
                }`}>
                  <Shield className="w-3 h-3" />
                  {isProctoringActive ? 'Proctoring' : 'Inactive'}
                </div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-2 rounded-xl font-semibold text-xs shadow-lg shadow-blue-500/30">
                  {faceDetectionStatus}
                </div>
                {deepfakeCheckCount > 0 && (
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-2 rounded-xl font-semibold text-xs shadow-lg shadow-purple-500/30">
                    Deepfake checks: {deepfakeCheckCount}
                  </div>
                )}
                {lastDeepfakeCheck && (
                  <div className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-3 py-2 rounded-xl font-semibold text-xs shadow-lg shadow-gray-500/30">
                    Last check: {lastDeepfakeCheck.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-white/60 backdrop-blur-3xl border-t border-orange-200/30 flex justify-center items-center gap-6 shadow-[0_-8px_25px_rgba(251,146,60,0.1)]">
          <button
            onClick={toggleAudio}
            className={`rounded-full w-16 h-16 p-0 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transform hover:scale-110 ${
              isAudioEnabled 
                ? 'bg-white/80 backdrop-blur-xl border-2 border-orange-200/50 text-gray-700 hover:bg-white/90' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30'
            }`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`rounded-full w-16 h-16 p-0 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transform hover:scale-110 ${
              isVideoEnabled 
                ? 'bg-white/80 backdrop-blur-xl border-2 border-orange-200/50 text-gray-700 hover:bg-white/90' 
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-red-500/30'
            }`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`rounded-full w-16 h-16 p-0 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transform hover:scale-110 ${
              isScreenSharing 
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/30' 
                : 'bg-white/80 backdrop-blur-xl border-2 border-orange-200/50 text-gray-700 hover:bg-white/90'
            }`}
          >
            <Monitor className="w-6 h-6" />
          </button>

          <button
            onClick={() => setShowQuizPanel(!showQuizPanel)}
            className={`rounded-full w-16 h-16 p-0 transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.15)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transform hover:scale-110 ${
              quizInProgress 
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-yellow-500/30' 
                : 'bg-white/80 backdrop-blur-xl border-2 border-orange-200/50 text-gray-700 hover:bg-white/90'
            }`}
          >
            <MessageSquare className="w-6 h-6" />
          </button>

          <button
            onClick={() => {
              if (room) {
                room.disconnect();
              }
              onDisconnect?.();
            }}
            className="rounded-full w-16 h-16 p-0 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 shadow-[0_10px_25px_rgba(239,68,68,0.3)] hover:shadow-[0_15px_35px_rgba(239,68,68,0.4)] transform hover:scale-110"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Side Panels */}
      {/* Proctoring Alerts Panel */}
      {proctoringAlerts.length > 0 && (
        <div className="w-80 bg-white/60 backdrop-blur-3xl border-l border-orange-200/30 flex flex-col shadow-[0_0_50px_rgba(251,146,60,0.1)]">
          <div className="p-6 border-b border-orange-200/30">
            <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                <Bell className="w-5 h-5 text-white" />
              </div>
              Proctoring Alerts ({proctoringAlerts.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
            {proctoringAlerts.map((alert, index) => (
              <div 
                key={`${alert.id}-${index}`} 
                className={`p-4 backdrop-blur-xl rounded-2xl border shadow-[0_10px_25px_rgba(0,0,0,0.1)] ${
                  alert.severity === 'CRITICAL' ? 'bg-red-100/80 border-red-300' :
                  alert.severity === 'HIGH' ? 'bg-orange-100/80 border-orange-300' :
                  alert.severity === 'MEDIUM' ? 'bg-yellow-100/80 border-yellow-300' :
                  'bg-white/80 border-orange-200/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`px-3 py-1 rounded-lg text-white font-semibold text-xs shadow-lg ${getAlertTypeColor(alert.alertType)}`}>
                        {alert.alertType.replace(/_/g, ' ')}
                      </div>
                      <div className={`px-3 py-1 rounded-lg text-white font-semibold text-xs shadow-lg ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 font-medium">{alert.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="font-semibold">{Math.round(alert.confidence * 100)}% confidence</span>
                      <span className="font-medium">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Panel */}
      {showQuizPanel && (
        <StudentQuizPanel
        meetingId={meetingId}
    isConnected={isConnected}
    userInfo={userInfo}
        />
      )}

      {/* Hidden canvas for frame capture */}
      <canvas 
        ref={videoFrameCanvasRef} 
        style={{ display: 'none' }} 
      />
    </div>
  );
}