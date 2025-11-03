'use client';

import { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Eye, Shield, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { YOLOProctoringService, ProctoringAlert } from '@/lib/yolo-proctoring';

interface LocalProctoringAlert {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high';
}

interface EnhancedStudentMeetingProps {
  meetingId: string;
  meetingTitle: string;
  tutorName: string;
  studentId: string;
  studentName: string;
  cloudinaryImageUrl?: string;
  onLeave: () => void;
}

export default function EnhancedStudentMeeting({ 
  meetingId, 
  meetingTitle, 
  tutorName, 
  studentId,
  studentName,
  cloudinaryImageUrl,
  onLeave 
}: EnhancedStudentMeetingProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [proctoringActive, setProctoringActive] = useState(true);
  const [alerts, setAlerts] = useState<LocalProctoringAlert[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockRequestSent, setLockRequestSent] = useState(false);
  const [eyeTrackingData, setEyeTrackingData] = useState({
    lookingAtScreen: true,
    gazeDirection: 'center',
    blinkRate: 15
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const proctoringServiceRef = useRef<YOLOProctoringService | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    initializeCamera();
    checkMeetingStatus();
    
    const statusInterval = setInterval(checkMeetingStatus, 5000);
    
    return () => {
      stopCamera();
      if (proctoringServiceRef.current) {
        proctoringServiceRef.current.stopProctoring();
      }
      clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && canvasRef.current && streamRef.current && proctoringActive) {
      proctoringServiceRef.current = new YOLOProctoringService(
        videoRef.current,
        canvasRef.current,
        meetingId,
        studentId,
        cloudinaryImageUrl
      );
      
      proctoringServiceRef.current.setAlertCallback(handleProctoringAlert);
      proctoringServiceRef.current.startProctoring();
      
      return () => {
        if (proctoringServiceRef.current) {
          proctoringServiceRef.current.stopProctoring();
        }
      };
    }
  }, [streamRef.current, proctoringActive]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 }, 
        audio: true 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      addAlert('face_detection', 'Camera access required for proctoring', 'high');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const checkMeetingStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const meeting = await response.json();
        setIsLocked(meeting.isLocked);
      }
    } catch (error) {
      console.error('Failed to check meeting status:', error);
    }
  };

  const handleProctoringAlert = (alert: ProctoringAlert) => {
    const newAlert: LocalProctoringAlert = {
      id: Date.now().toString(),
      type: alert.type,
      message: alert.message,
      timestamp: alert.timestamp,
      severity: alert.severity
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
    
    // Update session with alert
    updateSessionAlerts(alert.severity);
  };

  const updateSessionAlerts = async (severity: string) => {
    if (!sessionIdRef.current) return;
    
    try {
      const token = localStorage.getItem('token');
      const alertField = severity === 'high' ? 'highSeverityAlerts' : 
                        severity === 'medium' ? 'mediumSeverityAlerts' : 'lowSeverityAlerts';
      
      await fetch(`http://localhost:4000/meetings/session/${sessionIdRef.current}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          [alertField]: 1,
          totalAlerts: 1
        })
      });
    } catch (error) {
      console.error('Failed to update session alerts:', error);
    }
  };

  const requestLock = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/meetings/${meetingId}/lock-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: 'Student requested meeting lock for exam security'
        })
      });
      
      setLockRequestSent(true);
    } catch (error) {
      console.error('Failed to request lock:', error);
    }
  };

  const addAlert = (type: string, message: string, severity: 'low' | 'medium' | 'high') => {
    const newAlert: LocalProctoringAlert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: new Date(),
      severity
    };
    
    setAlerts(prev => [newAlert, ...prev.slice(0, 4)]);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white">
      {/* Header */}
      <div className="bg-black/50 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{meetingTitle}</h1>
            <p className="text-sm text-gray-300">Tutor: {tutorName}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className={`w-5 h-5 ${proctoringActive ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm">Proctoring {proctoringActive ? 'Active' : 'Inactive'}</span>
            </div>
            {isLocked && (
              <Badge className="bg-red-500">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
            <Badge className="bg-green-500">Live</Badge>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Video Area */}
        <div className="flex-1 p-6">
          <div className="grid grid-cols-2 gap-6 h-full">
            {/* Student Video (Self) */}
            <Card className="bg-white/5 border-white/10 p-4 relative overflow-hidden">
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-blue-500">{studentName} (You)</Badge>
              </div>
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-lg"
              />
              
              {/* YOLO Detection Overlay */}
              <canvas
                ref={canvasRef}
                className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)] pointer-events-none"
              />
              
              {!isVideoEnabled && (
                <div className="absolute inset-4 bg-gray-800 rounded-lg flex items-center justify-center">
                  <VideoOff className="w-16 h-16 text-gray-400" />
                </div>
              )}
            </Card>

            {/* Tutor Video */}
            <Card className="bg-white/5 border-white/10 p-4 relative">
              <div className="absolute top-4 left-4 z-10">
                <Badge className="bg-purple-500">Tutor</Badge>
              </div>
              
              <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold">{tutorName.charAt(0)}</span>
                  </div>
                  <p className="text-gray-300">{tutorName}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Proctoring Panel */}
        <div className="w-80 bg-black/30 border-l border-white/10 p-4">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Proctoring Monitor
          </h3>

          {/* Lock Request */}
          {!isLocked && !lockRequestSent && (
            <Card className="bg-white/5 border-white/10 p-4 mb-4">
              <h4 className="font-medium mb-2">Meeting Security</h4>
              <p className="text-sm text-gray-300 mb-3">
                Request to lock the meeting for enhanced security during the exam.
              </p>
              <Button
                onClick={requestLock}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                Request Lock
              </Button>
            </Card>
          )}

          {lockRequestSent && !isLocked && (
            <Card className="bg-white/5 border-white/10 p-4 mb-4">
              <div className="text-center">
                <Lock className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                <p className="text-sm text-yellow-400">Lock request sent</p>
                <p className="text-xs text-gray-400">Waiting for tutor approval</p>
              </div>
            </Card>
          )}

          {/* Eye Tracking Status */}
          <Card className="bg-white/5 border-white/10 p-4 mb-4">
            <h4 className="font-medium mb-2">Eye Tracking</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Looking at screen:</span>
                <Badge className={eyeTrackingData.lookingAtScreen ? "bg-green-500" : "bg-red-500"}>
                  {eyeTrackingData.lookingAtScreen ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Gaze direction:</span>
                <span className="text-gray-300">{eyeTrackingData.gazeDirection}</span>
              </div>
              <div className="flex justify-between">
                <span>Blink rate:</span>
                <span className="text-gray-300">{eyeTrackingData.blinkRate.toFixed(1)}/min</span>
              </div>
            </div>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-white/5 border-white/10 p-4 mb-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recent Alerts
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-sm text-gray-400">No alerts</p>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className="text-xs p-2 bg-white/5 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(alert.severity)}`} />
                      <span className="font-medium">{alert.type.replace('_', ' ')}</span>
                    </div>
                    <p className="text-gray-300">{alert.message}</p>
                    <p className="text-gray-500 mt-1">{alert.timestamp.toLocaleTimeString()}</p>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Guidelines */}
          <Card className="bg-white/5 border-white/10 p-4">
            <h4 className="font-medium mb-2">Guidelines</h4>
            <ul className="text-xs space-y-1 text-gray-300">
              <li>• Keep your face visible at all times</li>
              <li>• Look at the screen during the exam</li>
              <li>• Avoid sudden movements</li>
              <li>• No additional people in frame</li>
              <li>• Keep audio enabled for instructions</li>
            </ul>
          </Card>
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
}