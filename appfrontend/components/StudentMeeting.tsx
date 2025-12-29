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
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showQuizPanel, setShowQuizPanel] = useState(false);
  const [tutorParticipant, setTutorParticipant] = useState<RemoteParticipant | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [proctoringAlerts, setProctoringAlerts] = useState<ProctoringAlert[]>([]);
  const [isProctoringActive, setIsProctoringActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState<string>('Camera disabled - Click to enable');
  const [isElectron, setIsElectron] = useState(false);
  const [deepfakeCheckCount, setDeepfakeCheckCount] = useState(0);
  const [lastDeepfakeCheck, setLastDeepfakeCheck] = useState<Date | null>(null);
  const [proctoringSessionId, setProctoringSessionId] = useState<string | null>(null);
  const [frameAnalysisRate, setFrameAnalysisRate] = useState(3000); // Auto-adjusted based on performance
  const [systemPerformance, setSystemPerformance] = useState<'low' | 'medium' | 'high'>('medium');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const tutorVideoRef = useRef<HTMLVideoElement>(null);
  const proctoringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const deepfakeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const frameAnalysisRef = useRef<NodeJS.Timeout | null>(null);

  const { toast } = useToast();

  // Auto-detect system performance and adjust frame rate
  useEffect(() => {
    const detectPerformance = () => {
      const cores = navigator.hardwareConcurrency || 4;
      const memory = (navigator as any).deviceMemory || 4;
      
      let performance: 'low' | 'medium' | 'high' = 'medium';
      let rate = 3000;
      
      if (cores >= 8 && memory >= 8) {
        performance = 'high';
        rate = 2000; // 2 seconds for high-end systems
      } else if (cores >= 4 && memory >= 4) {
        performance = 'medium';
        rate = 3000; // 3 seconds for medium systems
      } else {
        performance = 'low';
        rate = 5000; // 5 seconds for low-end systems
      }
      
      setSystemPerformance(performance);
      setFrameAnalysisRate(rate);
      
      console.log(`🖥️ System detected: ${performance} (${cores} cores, ${memory}GB RAM) - Analysis rate: ${rate/1000}s`);
    };
    
    detectPerformance();
  }, []);

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
        if (room && room.state === 'connected') {
          try {
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
            
            // Use reliable data channel with error handling
            room.localParticipant.publishData(data, { 
              reliable: true,
              destinationSids: [] // Send to all participants
            }).catch(error => {
              console.warn('Failed to send alert data:', error);
            });
          } catch (error) {
            console.warn('Data channel error:', error);
          }
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
          sessionId: proctoringSessionId,
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
        // Silently report alert success
      }
    } catch (error) {
      // Silently handle alert reporting errors
    }
  };

  const performDeepfakeCheck = async () => {
    if (!localVideoRef.current || !isVideoEnabled) return;
    
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
          // Check if deepfake service is available
          const healthResponse = await fetch('http://localhost:8000/health');
          if (!healthResponse.ok) {
            return;
          }

          const deepfakeResponse = await fetch('http://localhost:8000/deepfake/predict', {
            method: 'POST',
            body: formData
          });

          if (deepfakeResponse.ok) {
            const result = await deepfakeResponse.json();
            setDeepfakeCheckCount(prev => prev + 1);
            setLastDeepfakeCheck(new Date());
            
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
          // Silently fail if deepfake service unavailable
        }
      }, 'image/jpeg', 0.8);
    } catch (error) {
      // Silently handle deepfake frame capture errors
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
        const sessionData = await response.json();
        setProctoringSessionId(sessionData.id);
        return sessionData.id;
      }
    } catch (error) {
      // Silently handle connection errors
    }
    return null;
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
          facingMode: 'user'
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
        // Removed publishDefaults to fix "non-finite double value" error
      });
      setRoom(newRoom);

      newRoom.on(RoomEvent.Connected, async () => {
        console.log("✅ Connected to room");
        setIsConnected(true);
        setIsConnecting(false);
        
        // Create proctoring session
        const sessionId = await createProctoringSession();
        if (sessionId) {
          console.log('✅ Proctoring session created:', sessionId);
        }
        
        // Enable camera and microphone only if user wants them
        try {
          // Start with both disabled - user must manually enable
          await newRoom.localParticipant.setCameraEnabled(false);
          await newRoom.localParticipant.setMicrophoneEnabled(false);
          
          setFaceDetectionStatus('Camera disabled - Click to enable');
        } catch (error) {
          console.error("Failed to set initial media state:", error);
        }
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log("❌ Disconnected from room:", reason);
        setIsConnected(false);
        setIsConnecting(false);
        setTutorParticipant(null);
        stopProctoringAnalysis();
        
        // Properly stop all media tracks
        if (newRoom.localParticipant) {
          newRoom.localParticipant.videoTrackPublications.forEach(pub => {
            if (pub.track) {
              pub.track.stop();
            }
          });
          newRoom.localParticipant.audioTrackPublications.forEach(pub => {
            if (pub.track) {
              pub.track.stop();
            }
          });
        }
        
        // Clear video elements
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
        if (tutorVideoRef.current) {
          tutorVideoRef.current.srcObject = null;
        }
      });

      newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
        console.log("Participant connected:", participant.identity, participant.name);
        setTutorParticipant(participant);
      });

      newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
        console.log("Tutor disconnected:", participant.identity);
        if (tutorParticipant?.identity === participant.identity) {
          setTutorParticipant(null);
        }
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("Track subscribed:", track.kind, "from", participant.identity);
        
        if (track.kind === "video" && participant.identity !== room?.localParticipant?.identity) {
          console.log("Remote video track subscribed for:", participant.identity);
          setTutorParticipant(participant);
          
          setTimeout(() => {
            if (tutorVideoRef.current && track.attach) {
              track.attach(tutorVideoRef.current);
              console.log('✅ Tutor video track attached');
            }
          }, 100);
        }
      });

      // Handle local track published
      newRoom.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
        if (publication.kind === 'video' && localVideoRef.current) {
          setTimeout(() => {
            const track = publication.track;
            if (track && localVideoRef.current) {
              track.attach(localVideoRef.current);
              console.log('✅ Local video track attached');
            }
          }, 500);
        }
      });

      // Add error handling for connection issues
      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        if (quality === 'poor' && participant?.isLocal) {
          console.warn('Poor connection quality detected');
        }
      });

      newRoom.on(RoomEvent.Reconnecting, () => {
        console.log('🔄 Reconnecting to room...');
        setIsConnecting(true);
      });

      newRoom.on(RoomEvent.Reconnected, () => {
        console.log('✅ Reconnected to room');
        setIsConnecting(false);
      });

      // Handle data messages
      newRoom.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          
          if (data.type === 'QUIZ_QUESTION') {
            // Handle quiz questions
            console.log('📝 Quiz question received:', data.data);
          } else if (data.type === 'KICK_NOTIFICATION' && data.participantId === userInfo?.id) {
            toast({
              title: "Removed from Meeting",
              description: data.reason || "You have been removed by the tutor",
              variant: "destructive",
            });
            setTimeout(() => onDisconnect?.(), 2000);
          }
        } catch (error) {
          console.error('❌ Error parsing data message:', error);
        }
      });

      // Connect to LiveKit server
      let actualServerUrl = serverUrl;
      if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
        actualServerUrl = `ws://${serverUrl}`;
      }
      if (actualServerUrl.includes('localhost') && !actualServerUrl.includes('7880')) {
        actualServerUrl = 'ws://localhost:7880';
      }
      
      const fallbackUrls = [
        actualServerUrl,
        'ws://localhost:7880',
        'ws://127.0.0.1:7880'
      ];

      let connected = false;
      let lastError = null;
      
      for (const url of fallbackUrls) {
        try {
          console.log(`Trying connection to: ${url}`);
          
          await newRoom.connect(url, token, {
            autoSubscribe: true,
            maxRetries: 3,
            peerConnectionTimeout: 10000,
            websocketTimeout: 5000
          });
          
          connected = true;
          console.log(`✅ Successfully connected to: ${url}`);
          break;
        } catch (error) {
          console.warn(`❌ Failed to connect to ${url}:`, error.message);
          lastError = error;
          
          try {
            await newRoom.disconnect();
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
      
      if (!connected) {
        throw lastError || new Error('Failed to connect to any LiveKit server');
      }
    } catch (error: any) {
      console.error("❌ Failed to connect to LiveKit:", error);
      setIsConnecting(false);
      
      let errorMessage = 'Failed to connect to meeting. Please check your connection and try again.';
      
      if (error.message?.includes('WebSocket')) {
        errorMessage = 'LiveKit server is not running. Please start the Docker services first.';
      } else if (error.message?.includes('token')) {
        errorMessage = 'Invalid meeting token. Please refresh and try again.';
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
    if (!room?.localParticipant || isConnecting) {
      return;
    }
    
    try {
      const newVideoState = !isVideoEnabled;
      await room.localParticipant.setCameraEnabled(newVideoState);
      setIsVideoEnabled(newVideoState);
      
      if (newVideoState) {
        // Wait for track and attach it with retry logic
        let attempts = 0;
        const attachVideo = () => {
          const videoTrack = Array.from(room.localParticipant.videoTrackPublications.values())[0]?.track;
          if (videoTrack && localVideoRef.current) {
            videoTrack.attach(localVideoRef.current);
            console.log('✅ Video track attached');
            
            // Start proctoring after video is confirmed attached
            setTimeout(() => {
              if (proctoringSessionId && !isProctoringActive) {
                startProctoringAnalysis();
                setFaceDetectionStatus('Camera enabled - Monitoring active');
              }
            }, 1000);
          } else if (attempts < 3) {
            attempts++;
            setTimeout(attachVideo, 1000);
          }
        };
        
        setTimeout(attachVideo, 500);
      } else {
        // Stop proctoring and clear video
        await stopProctoringAnalysis();
        setFaceDetectionStatus('Camera disabled');
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = null;
        }
      }
      
      // Send state update with error handling
      setTimeout(() => sendParticipantStateUpdate(), 500);
      
    } catch (error) {
      console.error("Failed to toggle video:", error);
    }
  };

  const toggleAudio = async () => {
    if (!room?.localParticipant) {
      return;
    }
    
    try {
      const newAudioState = !isAudioEnabled;
      await room.localParticipant.setMicrophoneEnabled(newAudioState);
      setIsAudioEnabled(newAudioState);
      sendParticipantStateUpdate();
      
    } catch (error) {
      console.error("Failed to toggle audio:", error);
    }
  };

  const toggleScreenShare = async () => {
    if (!room?.localParticipant) return;
    
    try {
      const newScreenShareState = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(newScreenShareState);
      setIsScreenSharing(newScreenShareState);
      sendParticipantStateUpdate();
      
      toast({
        title: newScreenShareState ? "Screen Share Started" : "Screen Share Stopped",
        description: newScreenShareState ? "You are now sharing your screen" : "Screen sharing has been stopped",
      });
    } catch (error) {
      console.error("Screen share failed:", error);
      toast({
        title: "Screen Share Error",
        description: "Failed to toggle screen sharing",
        variant: "destructive",
      });
    }
  };

  const sendParticipantStateUpdate = () => {
    if (room && room.state === 'connected') {
      try {
        const stateData = {
          type: 'PARTICIPANT_STATE_UPDATE',
          data: {
            participantId: userInfo?.id,
            videoEnabled: isVideoEnabled,
            audioEnabled: isAudioEnabled,
            screenSharing: isScreenSharing,
            timestamp: new Date().toISOString()
          }
        };
        
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(stateData));
        
        // Use reliable data channel with proper error handling
        room.localParticipant.publishData(data, { 
          reliable: true,
          destinationSids: []
        }).catch(error => {
          console.warn('Failed to send state update:', error);
        });
      } catch (error) {
        console.warn('State update error:', error);
      }
    }
  };

  const startProctoringAnalysis = async () => {
    if (frameAnalysisRef.current) {
      clearInterval(frameAnalysisRef.current);
    }
    
    // Start Electron proctoring if available
    if (window.electronAPI && proctoringSessionId) {
      try {
        await window.electronAPI.startProctoring({
          meetingId,
          userId: userInfo?.id,
          participantId: userInfo?.id,
          sessionId: proctoringSessionId
        });
        console.log('✅ Electron proctoring started');
      } catch (error) {
        console.error('Failed to start Electron proctoring:', error);
      }
    }
    
    // Start frame analysis at auto-detected rate
    frameAnalysisRef.current = setInterval(() => {
      performFrameAnalysis();
    }, frameAnalysisRate);
    
    // Start deepfake checks every 30 seconds
    if (deepfakeIntervalRef.current) {
      clearInterval(deepfakeIntervalRef.current);
    }
    deepfakeIntervalRef.current = setInterval(() => {
      performDeepfakeCheck();
    }, 30000);
    
    setIsProctoringActive(true);
    console.log('🛡️ Proctoring analysis started');
  };

  const stopProctoringAnalysis = async () => {
    if (frameAnalysisRef.current) {
      clearInterval(frameAnalysisRef.current);
      frameAnalysisRef.current = null;
    }
    if (deepfakeIntervalRef.current) {
      clearInterval(deepfakeIntervalRef.current);
      deepfakeIntervalRef.current = null;
    }
    
    // Stop Electron proctoring if available
    if (window.electronAPI) {
      try {
        await window.electronAPI.stopProctoring();
        console.log('✅ Electron proctoring stopped');
      } catch (error) {
        console.error('Failed to stop Electron proctoring:', error);
      }
    }
    
    setIsProctoringActive(false);
    console.log('🛡️ Proctoring analysis stopped');
  };

  const performFrameAnalysis = async () => {
    if (!localVideoRef.current || !isVideoEnabled) return;
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = localVideoRef.current;
      
      if (!ctx || video.videoWidth === 0 || video.videoHeight === 0) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      // Get base64 image data for Electron API
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      
      // Send frame to Electron API for advanced analysis
      if (window.electronAPI) {
        try {
          await window.electronAPI.sendVideoFrame({
            imageData: imageDataUrl,
            timestamp: Date.now(),
            meetingId,
            userId: userInfo?.id,
            participantId: userInfo?.id
          });
        } catch (error) {
          console.error('Failed to send frame to Electron API:', error);
        }
      }
      
      // Simulate face detection and other proctoring checks
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      
      // Simple face detection simulation (check for skin-like colors)
      let facePixels = 0;
      let totalPixels = pixels.length / 4;
      
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Simple skin color detection
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15) {
          facePixels++;
        }
      }
      
      // Disable all fake alerts - rely only on Electron API for real detection
      const alerts = [];
      let phoneDetected = false;
      
      const faceRatio = facePixels / totalPixels;
      const faceDetected = faceRatio > 0.03; // Basic face detection
      const faceCount = faceDetected ? 1 : 0; // Always report single face if detected
      
      // Identity verification (simulate)
      const identityVerified = faceDetected && faceCount === 1;
      
      // Send to backend with proper validation
      if (proctoringSessionId && userInfo?.id) {
        try {
          // Complete payload that matches backend DTO
          const payload = {
            meetingId: meetingId || '',
            userId: userInfo.id,
            participantId: userInfo.id,
            sessionId: proctoringSessionId,
            detections: {
              faceDetected,
              faceCount,
              phoneDetected,
              suspiciousBehavior: alerts.length > 0,
              identityVerified
            },
            browserData: {
              timestamp: new Date().toISOString(),
              frameAnalysis: true,
              automatedDetection: true
            }
          };
          
          console.log('Sending frame analysis:', payload);
          
          const response = await fetch('http://localhost:4000/proctoring/analyze-frame', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
          });

          if (response.ok) {
            const result = await response.json();
            
            // Process backend alerts
            if (result.alerts && result.alerts.length > 0) {
              result.alerts.forEach((alert: any) => {
                handleProctoringAnalysis({ alerts: [alert] });
              });
            }
          } else {
            const errorText = await response.text();
            console.error('Frame analysis failed:', response.status, errorText);
            console.error('Payload that failed:', payload);
          }
        } catch (error) {
          console.error('Frame analysis error:', error);
        }
      }
      
      // Process local alerts
      if (alerts.length > 0) {
        handleProctoringAnalysis({ alerts });
      }
      
      // Update face detection status
      setFaceDetectionStatus(faceDetected ? 
        `Face detected ✅ (${faceCount} face${faceCount > 1 ? 's' : ''})` : 
        'No face detected ⚠️'
      );
      
    } catch (error) {
      console.error('Frame analysis error:', error);
    }
  };



  useEffect(() => {
    connectToRoom();
    
    return () => {
      if (room) {
        room.disconnect();
      }
      stopProctoringAnalysis();
    };
  }, [token, serverUrl]);

  // Auto-restart proctoring after refresh/reconnection
  useEffect(() => {
    if (isConnected && isVideoEnabled && proctoringSessionId && !isProctoringActive) {
      console.log('🔄 Auto-restarting proctoring after refresh');
      setTimeout(() => {
        startProctoringAnalysis();
        setFaceDetectionStatus('Camera enabled - Monitoring active');
      }, 2000);
    }
  }, [isConnected, isVideoEnabled, proctoringSessionId, isProctoringActive]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center font-['Inter']">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Video className="w-8 h-8 text-white drop-shadow-sm" />
          </div>
          {connectionError ? (
            <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-xl font-bold mb-4 text-red-400">Connection Failed</h1>
              <p className="text-gray-300 mb-4 font-medium">{connectionError}</p>
              <button 
                onClick={() => connectToRoom()}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300 shadow-xl"
              >
                Retry Connection
              </button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
              <h1 className="text-xl font-bold mb-4 text-blue-300">Connecting to Meeting...</h1>
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300 font-medium">Establishing connection to LiveKit server...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex font-['Inter']">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header Bar */}
        <div className="p-4 bg-black/20 backdrop-blur-3xl border-b border-white/10 shadow-lg flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-white drop-shadow-sm">Student Meeting Room</h2>
            <Badge className={`${tutorParticipant ? "bg-green-400 text-black" : "bg-red-400 text-white"}`}>
              {tutorParticipant ? "Tutor Joined" : "Waiting for Tutor"}
            </Badge>
            <Badge className={`${isProctoringActive ? "bg-blue-400 text-black" : "bg-gray-400 text-white"}`}>
              {isProctoringActive ? "🛡️ Proctoring Active" : "Proctoring Inactive"}
            </Badge>
          </div>
          <div className="flex gap-2 items-center">
            {proctoringAlerts.length > 0 && (
              <Badge className="bg-red-400 text-black flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {proctoringAlerts.length} Alerts
              </Badge>
            )}
            {deepfakeCheckCount > 0 && (
              <Badge className="bg-purple-400 text-black flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {deepfakeCheckCount} Checks
              </Badge>
            )}
            <Badge className="bg-yellow-400 text-black">
              {systemPerformance.toUpperCase()} ({frameAnalysisRate / 1000}s)
            </Badge>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
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
              
              {/* Proctoring Status */}
              <div className="absolute top-3 left-3 flex flex-col gap-1">
                <Badge className={`${isProctoringActive ? "bg-green-500" : "bg-red-500"} text-white text-xs`}>
                  {isProctoringActive ? "🛡️ Monitoring" : "⚠️ Inactive"}
                </Badge>
                <Badge className="bg-blue-500 text-white text-xs">
                  {faceDetectionStatus}
                </Badge>
              </div>

              {/* Recording Indicator */}
              {isProctoringActive && (
                <div className="absolute top-3 right-3 bg-red-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1 animate-pulse">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                  Recording
                </div>
              )}
            </div>

            {/* Tutor Video */}
            <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/20">
              {tutorParticipant ? (
                <>
                  <video
                    ref={tutorVideoRef}
                    className="w-full h-full object-cover"
                    autoPlay
                    playsInline
                  />
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-3 py-1 rounded-full flex items-center gap-2">
                    <img 
                      src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${tutorParticipant.name || 'Tutor'}`}
                      alt="Tutor"
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-sm font-medium">{tutorParticipant.name || 'Tutor'}</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Eye className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">Waiting for Tutor</p>
                    <p className="text-sm">The tutor will join shortly</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="p-6 bg-black/20 backdrop-blur-3xl border-t border-white/10 shadow-lg flex justify-center items-center gap-4">
          <Button
            onClick={toggleAudio}
            variant={isAudioEnabled ? "outline" : "destructive"}
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isAudioEnabled ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isAudioEnabled ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </Button>
          
          <Button
            onClick={toggleVideo}
            variant={isVideoEnabled ? "outline" : "destructive"}
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isVideoEnabled ? 'bg-white/20 hover:bg-white/30 text-white border-white/30' : 'bg-red-500 hover:bg-red-600 text-white'}`}
          >
            {isVideoEnabled ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </Button>

          <Button
            onClick={toggleScreenShare}
            variant="outline"
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600 text-white' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'}`}
          >
            <Monitor className="w-6 h-6" />
          </Button>

          <Button
            onClick={() => setShowQuizPanel(!showQuizPanel)}
            variant="outline"
            size="lg"
            className={`rounded-full w-14 h-14 p-0 transition-all ${showQuizPanel ? 'bg-green-500 text-white' : 'bg-white/20 hover:bg-white/30 text-white border-white/30'}`}
          >
            <MessageSquare className="w-6 h-6" />
          </Button>

          <Button
            onClick={async () => {
              stopProctoringAnalysis();
              
              // Notify backend that participant is leaving
              try {
                await fetch('http://localhost:4000/proctoring/analyze-frame', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    meetingId,
                    participantId: userInfo?.id || 'unknown',
                    userId: userInfo?.id || 'unknown',
                    detections: {},
                    browserData: { participantLeft: true }
                  })
                });
              } catch (error) {
                console.error('Failed to notify backend of participant leaving:', error);


              }
              
              // Stop all media tracks before disconnecting
              if (room?.localParticipant) {
                room.localParticipant.videoTrackPublications.forEach(pub => {
                  if (pub.track) {
                    pub.track.stop();
                  }
                });
                room.localParticipant.audioTrackPublications.forEach(pub => {
                  if (pub.track) {
                    pub.track.stop();
                  }
                });
              }
              
              if (room) {
                room.disconnect();
              }
              
              // Clear video elements
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = null;
              }
              if (tutorVideoRef.current) {
                tutorVideoRef.current.srcObject = null;
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
      {showQuizPanel && (
        <StudentQuizPanel
          meetingId={meetingId}
          isConnected={isConnected}
          userInfo={userInfo}
        />
      )}

      {/* Proctoring Alerts Panel */}
      {proctoringAlerts.length > 0 && (
        <div className="w-80 bg-black/40 backdrop-blur-sm border-l border-white/20 flex flex-col">
          <div className="p-4 border-b border-white/20">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Bell className="w-5 h-5" />
              Recent Alerts ({proctoringAlerts.length})
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {proctoringAlerts.map((alert, index) => (
              <div 
                key={`${alert.id}-${index}`} 
                className={`p-3 rounded-lg backdrop-blur-sm border ${
                  alert.severity === 'CRITICAL' ? 'bg-red-500/20 border-red-400' :
                  alert.severity === 'HIGH' ? 'bg-orange-500/20 border-orange-400' :
                  alert.severity === 'MEDIUM' ? 'bg-yellow-500/20 border-yellow-400' :
                  'bg-white/10 border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${
                    alert.severity === 'CRITICAL' ? 'bg-red-500' :
                    alert.severity === 'HIGH' ? 'bg-orange-500' :
                    alert.severity === 'MEDIUM' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  } text-white text-xs`}>
                    {alert.severity}
                  </Badge>
                  <Badge className="bg-blue-500 text-white text-xs">
                    {alert.alertType.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-300 mb-2">{alert.description}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{Math.round(alert.confidence * 100)}% confidence</span>
                  <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}