'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Eye, Phone, Users, Camera } from 'lucide-react';
import io from 'socket.io-client';

interface ProctoringAlert {
  participantId: string;
  participantName: string;
  alerts: Array<{
    alertType: string;
    description: string;
    confidence: number;
  }>;
  timestamp: Date;
}

interface ProctoringMonitorProps {
  meetingId: string;
  isProctor: boolean;
}

export default function ProctoringMonitor({ meetingId, isProctor }: ProctoringMonitorProps) {
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const socketRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isProctor) {
      // Initialize WebSocket for receiving alerts
      socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000');
      
      socketRef.current.emit('join-proctoring', {
        meetingId,
        participantId: 'tutor',
        role: 'tutor'
      });

      socketRef.current.on('proctoring-alert', (alert: ProctoringAlert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
      });

      return () => {
        socketRef.current?.disconnect();
      };
    } else {
      // Start monitoring for students
      startMonitoring();
    }
  }, [meetingId, isProctor]);

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsMonitoring(true);
        
        // Initialize WebSocket for sending frames
        socketRef.current = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000');
        
        socketRef.current.emit('join-proctoring', {
          meetingId,
          participantId: localStorage.getItem('userId') || 'student',
          role: 'student'
        });

        // Start frame analysis
        startFrameAnalysis();
      }
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    }
  };

  const startFrameAnalysis = () => {
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && isMonitoring) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0);
          
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          
          socketRef.current?.emit('proctoring-frame', {
            meetingId,
            participantId: localStorage.getItem('userId') || 'student',
            participantName: localStorage.getItem('userName') || 'Student',
            imageData
          });
        }
      }
    }, 3000); // Analyze every 3 seconds

    return () => clearInterval(interval);
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'FACE_NOT_DETECTED':
        return <Camera className="w-4 h-4" />;
      case 'MULTIPLE_FACES':
        return <Users className="w-4 h-4" />;
      case 'PHONE_DETECTED':
        return <Phone className="w-4 h-4" />;
      case 'SUSPICIOUS_BEHAVIOR':
        return <Eye className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (alertType: string) => {
    switch (alertType) {
      case 'FACE_NOT_DETECTED':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white';
      case 'MULTIPLE_FACES':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      case 'PHONE_DETECTED':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'SUSPICIOUS_BEHAVIOR':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  if (isProctor) {
    return (
      <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/30 hover:shadow-[0_25px_60px_rgba(251,146,60,0.2)] transition-all duration-300 font-['Inter']">
        <div className="mb-6">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/30">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            Proctoring Alerts ({alerts.length})
          </h3>
        </div>
        
        <div>
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl inline-block mb-4 shadow-lg">
                <AlertTriangle className="w-12 h-12 text-orange-600" />
              </div>
              <p className="text-gray-600 text-lg font-medium">No alerts detected</p>
              <p className="text-gray-500 text-sm mt-2">All participants are following guidelines</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
              {alerts.map((alert, index) => (
                <div key={index} className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_10px_30px_rgba(251,146,60,0.1)] border border-orange-200/40 hover:shadow-[0_15px_40px_rgba(251,146,60,0.15)] transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <p className="font-bold text-gray-800 text-lg">{alert.participantName}</p>
                    <span className="text-sm text-gray-500 bg-orange-50 px-3 py-1 rounded-full">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {alert.alerts.map((alertDetail, alertIndex) => (
                      <div key={alertIndex} className="flex items-center gap-3">
                        <div className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center gap-2 shadow-lg ${getAlertColor(alertDetail.alertType)}`}>
                          {getAlertIcon(alertDetail.alertType)}
                          <span>{alertDetail.alertType.replace('_', ' ')}</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-700 bg-orange-100 px-3 py-1 rounded-full">
                          {Math.round(alertDetail.confidence * 100)}% confidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/30 hover:shadow-[0_25px_60px_rgba(251,146,60,0.2)] transition-all duration-300 font-['Inter']">
      <div className="mb-6">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg shadow-orange-500/30">
            <Camera className="w-6 h-6 text-white" />
          </div>
          Proctoring Monitor
        </h3>
      </div>
      
      <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_10px_30px_rgba(251,146,60,0.1)] border border-orange-200/40">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-4 h-4 rounded-full shadow-lg ${isMonitoring ? 'bg-gradient-to-r from-green-400 to-green-500 shadow-green-500/30' : 'bg-gradient-to-r from-red-400 to-red-500 shadow-red-500/30'}`} />
            <span className="text-lg font-semibold text-gray-800">
              {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
            </span>
            {isMonitoring && (
              <div className="bg-gradient-to-r from-green-100 to-green-200 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                Live
              </div>
            )}
          </div>
          
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full max-w-sm rounded-2xl border-4 border-orange-200/50 shadow-[0_15px_35px_rgba(251,146,60,0.2)] hover:shadow-[0_20px_45px_rgba(251,146,60,0.25)] transition-all duration-300"
              style={{ transform: 'scaleX(-1)' }}
            />
            {isMonitoring && (
              <div className="absolute top-4 right-4 bg-red-500 w-3 h-3 rounded-full animate-pulse shadow-lg"></div>
            )}
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
        
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 shadow-[0_10px_30px_rgba(251,146,60,0.1)] border border-orange-200/40">
          <h4 className="font-bold text-orange-800 mb-4 text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Monitoring Guidelines
          </h4>
          <div className="space-y-3 text-orange-700">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <p className="font-medium">Keep your face visible at all times</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <p className="font-medium">Avoid looking away from the screen</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <p className="font-medium">Keep mobile devices out of view</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <p className="font-medium">Maintain proper lighting</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}