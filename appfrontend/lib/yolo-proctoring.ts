// Optimized YOLO Proctoring with Performance Optimization
import { ProctoringService } from './proctoring-service';

export interface DetectionResult {
  class: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface ProctoringAlert {
  type: 'multiple_faces' | 'no_face' | 'phone_detected' | 'suspicious_object' | 'face_mismatch';
  confidence: number;
  timestamp: Date;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export class YOLOProctoringService {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  private isRunning = false;
  private alertCallback?: (alert: ProctoringAlert) => void;
  private detectionInterval?: NodeJS.Timeout;
  private faceVerificationInterval?: NodeJS.Timeout;
  private proctoringService: ProctoringService;
  private meetingId: string;
  private studentId: string;
  private cloudinaryImageUrl?: string;

  constructor(
    video: HTMLVideoElement, 
    canvas: HTMLCanvasElement, 
    meetingId: string, 
    studentId: string,
    cloudinaryImageUrl?: string
  ) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.meetingId = meetingId;
    this.studentId = studentId;
    this.cloudinaryImageUrl = cloudinaryImageUrl;
    this.proctoringService = new ProctoringService();
  }

  setAlertCallback(callback: (alert: ProctoringAlert) => void) {
    this.alertCallback = callback;
  }

  async startProctoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    this.canvas.width = this.video.videoWidth || 640;
    this.canvas.height = this.video.videoHeight || 480;
    
    this.detectionInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.processFrame();
      }
    }, 3000);
    
    if (this.cloudinaryImageUrl) {
      this.faceVerificationInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          this.verifyFace();
        }
      }, 15000);
    }
  }

  stopProctoring() {
    this.isRunning = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    if (this.faceVerificationInterval) {
      clearInterval(this.faceVerificationInterval);
    }
    this.clearCanvas();
  }

  private async processFrame() {
    if (!this.isRunning || !this.video.videoWidth || this.video.paused) return;

    try {
      if (this.video.readyState < 2) return;
      
      const detections = await this.simulateYOLODetection();
      this.processDetections(detections);
      
      if (detections.length > 0) {
        this.drawDetections(detections);
      }
      
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }

  private async simulateYOLODetection(): Promise<DetectionResult[]> {
    const detections: DetectionResult[] = [];
    const random = Math.random();
    
    if (random > 0.1) {
      detections.push({
        class: 'person',
        confidence: 0.85 + Math.random() * 0.1,
        bbox: [100, 50, 200, 300]
      });
    }
    
    if (random < 0.02) {
      detections.push({
        class: 'cell phone',
        confidence: 0.7 + Math.random() * 0.2,
        bbox: [300, 200, 80, 150]
      });
    }
    
    if (random < 0.01) {
      detections.push({
        class: 'person',
        confidence: 0.75,
        bbox: [400, 100, 150, 250]
      });
    }
    
    return detections;
  }

  private async processDetections(detections: DetectionResult[]) {
    try {
      await this.proctoringService.processYoloDetection(
        this.meetingId,
        this.studentId,
        detections
      );
      
      const people = detections.filter(d => d.class === 'person');
      const phones = detections.filter(d => d.class === 'cell phone');
      
      if (people.length > 1) {
        this.triggerAlert({
          type: 'multiple_faces',
          confidence: Math.max(...people.map(p => p.confidence)),
          timestamp: new Date(),
          message: `${people.length} people detected in frame`,
          severity: 'high'
        });
      }
      
      if (people.length === 0) {
        this.triggerAlert({
          type: 'no_face',
          confidence: 1.0,
          timestamp: new Date(),
          message: 'No person detected in frame',
          severity: 'medium'
        });
      }
      
      if (phones.length > 0) {
        this.triggerAlert({
          type: 'phone_detected',
          confidence: Math.max(...phones.map(p => p.confidence)),
          timestamp: new Date(),
          message: 'Mobile phone detected',
          severity: 'high'
        });
      }
    } catch (error) {
      console.error('Failed to process detections:', error);
    }
  }

  private drawDetections(detections: DetectionResult[]) {
    this.clearCanvas();
    
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      
      let color = '#00ff00';
      if (detection.class === 'cell phone') color = '#ff0000';
      
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
      
      this.ctx.fillStyle = color;
      this.ctx.font = '14px Arial';
      this.ctx.fillText(
        `${detection.class} (${(detection.confidence * 100).toFixed(1)}%)`,
        x,
        y - 5
      );
    });
  }

  private clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private triggerAlert(alert: ProctoringAlert) {
    if (this.alertCallback) {
      this.alertCallback(alert);
    }
  }

  private async verifyFace() {
    if (!this.cloudinaryImageUrl || !this.isRunning) return;
    
    try {
      const imageBlob = await this.captureFrameAsBlob();
      
      const result = await this.proctoringService.verifyFace(
        this.meetingId,
        this.studentId,
        this.cloudinaryImageUrl,
        imageBlob
      );
      
      if (!result.isMatch || result.isDeepfake) {
        this.triggerAlert({
          type: 'face_mismatch',
          confidence: result.isDeepfake ? 0.95 : (1 - result.matchScore),
          timestamp: new Date(),
          message: result.isDeepfake ? 'Deepfake detected' : 'Face does not match registered image',
          severity: 'high'
        });
      }
    } catch (error) {
      console.error('Face verification failed:', error);
    }
  }
  
  private async captureFrameAsBlob(): Promise<Blob> {
    return new Promise((resolve) => {
      this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      this.canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 0.8);
    });
  }
}

export class EyeTrackingService {
  private isTracking = false;
  private trackingInterval?: NodeJS.Timeout;
  private callback?: (data: any) => void;

  startTracking(callback: (data: any) => void) {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.callback = callback;
    
    this.trackingInterval = setInterval(() => {
      const eyeData = {
        lookingAtScreen: Math.random() > 0.2,
        gazeDirection: this.getRandomGazeDirection(),
        blinkRate: 12 + Math.random() * 8,
        pupilDilation: 0.3 + Math.random() * 0.4
      };
      
      if (this.callback) {
        this.callback(eyeData);
      }
    }, 500);
  }

  stopTracking() {
    this.isTracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
    }
  }

  private getRandomGazeDirection() {
    const directions = ['center', 'left', 'right', 'up', 'down'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
}

export const initializeProctoring = (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
  meetingId: string,
  studentId: string,
  cloudinaryImageUrl: string | undefined,
  onAlert: (alert: ProctoringAlert) => void,
  onEyeTracking: (data: any) => void
) => {
  const yoloService = new YOLOProctoringService(
    videoElement, 
    canvasElement, 
    meetingId, 
    studentId, 
    cloudinaryImageUrl
  );
  const eyeService = new EyeTrackingService();
  
  yoloService.setAlertCallback(onAlert);
  
  return {
    start: () => {
      yoloService.startProctoring();
      eyeService.startTracking(onEyeTracking);
    },
    stop: () => {
      yoloService.stopProctoring();
      eyeService.stopTracking();
    }
  };
};