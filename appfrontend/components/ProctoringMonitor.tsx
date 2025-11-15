'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
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
        return 'bg-red-100 text-red-800';
      case 'MULTIPLE_FACES':
        return 'bg-orange-100 text-orange-800';
      case 'PHONE_DETECTED':
        return 'bg-purple-100 text-purple-800';
      case 'SUSPICIOUS_BEHAVIOR':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isProctor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Proctoring Alerts ({alerts.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-gray-600 text-center py-4">No alerts detected</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {alerts.map((alert, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{alert.participantName}</p>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {alert.alerts.map((alertDetail, alertIndex) => (
                      <div key={alertIndex} className="flex items-center gap-2">
                        <Badge className={getAlertColor(alertDetail.alertType)}>
                          {getAlertIcon(alertDetail.alertType)}
                          <span className="ml-1">{alertDetail.alertType.replace('_', ' ')}</span>
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {Math.round(alertDetail.confidence * 100)}% confidence
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Proctoring Monitor
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">
                {isMonitoring ? 'Monitoring Active' : 'Monitoring Inactive'}
              </span>
            </div>
            
            <video
              ref={videoRef}
              autoPlay
              muted
              className="w-full max-w-sm rounded-lg border"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="text-xs text-gray-600">
              <p>• Keep your face visible at all times</p>
              <p>• Avoid looking away from the screen</p>
              <p>• Keep mobile devices out of view</p>
              <p>• Maintain proper lighting</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}