// YOLO Proctoring Integration
// This service will integrate with YOLO model for real-time object detection during proctoring

export interface DetectionResult {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface ProctoringAlert {
  type: 'multiple_faces' | 'no_face' | 'phone_detected' | 'suspicious_object' | 'person_left_frame';
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

  constructor(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
    this.video = video;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  setAlertCallback(callback: (alert: ProctoringAlert) => void) {
    this.alertCallback = callback;
  }

  async startProctoring() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Set canvas size to match video
    this.canvas.width = this.video.videoWidth || 640;
    this.canvas.height = this.video.videoHeight || 480;
    
    // Start detection loop
    this.detectionInterval = setInterval(() => {
      this.processFrame();
    }, 1000); // Process every second
  }

  stopProctoring() {
    this.isRunning = false;
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
    }
    this.clearCanvas();
  }

  private async processFrame() {
    if (!this.isRunning || !this.video.videoWidth) return;

    try {
      // Capture frame from video
      const imageData = this.captureFrame();
      
      // In a real implementation, send to YOLO model API
      // For now, simulate detection results
      const detections = await this.simulateYOLODetection(imageData);
      
      // Process detections and generate alerts
      this.processDetections(detections);
      
      // Draw bounding boxes
      this.drawDetections(detections);
      
    } catch (error) {
      console.error('Error processing frame:', error);
    }
  }

  private captureFrame(): ImageData {
    // Draw video frame to canvas
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    
    // Get image data
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  private async simulateYOLODetection(imageData: ImageData): Promise<DetectionResult[]> {
    // Simulate YOLO detection results
    // In real implementation, this would call your YOLO model API
    
    const detections: DetectionResult[] = [];
    const random = Math.random();
    
    // Simulate face detection (should always have 1 face)
    if (random > 0.1) {
      detections.push({
        class: 'person',
        confidence: 0.85 + Math.random() * 0.1,
        bbox: [100, 50, 200, 300] // [x, y, width, height]
      });
    }
    
    // Simulate phone detection (rare)
    if (random < 0.05) {
      detections.push({
        class: 'cell phone',
        confidence: 0.7 + Math.random() * 0.2,
        bbox: [300, 200, 80, 150]
      });
    }
    
    // Simulate multiple people (should trigger alert)
    if (random < 0.03) {
      detections.push({
        class: 'person',
        confidence: 0.75,
        bbox: [400, 100, 150, 250]
      });
    }
    
    return detections;
  }

  private processDetections(detections: DetectionResult[]) {
    const people = detections.filter(d => d.class === 'person');
    const phones = detections.filter(d => d.class === 'cell phone');
    
    // Check for multiple faces
    if (people.length > 1) {
      this.triggerAlert({
        type: 'multiple_faces',
        confidence: Math.max(...people.map(p => p.confidence)),
        timestamp: new Date(),
        message: `${people.length} people detected in frame`,
        severity: 'high'
      });
    }
    
    // Check for no face
    if (people.length === 0) {
      this.triggerAlert({
        type: 'no_face',
        confidence: 1.0,
        timestamp: new Date(),
        message: 'No person detected in frame',
        severity: 'medium'
      });
    }
    
    // Check for phone
    if (phones.length > 0) {
      this.triggerAlert({
        type: 'phone_detected',
        confidence: Math.max(...phones.map(p => p.confidence)),
        timestamp: new Date(),
        message: 'Mobile phone detected',
        severity: 'high'
      });
    }
  }

  private drawDetections(detections: DetectionResult[]) {
    // Clear previous drawings
    this.clearCanvas();
    
    // Draw bounding boxes
    detections.forEach(detection => {
      const [x, y, width, height] = detection.bbox;
      
      // Set color based on class
      let color = '#00ff00'; // Green for person
      if (detection.class === 'cell phone') color = '#ff0000'; // Red for phone
      
      // Draw bounding box
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, width, height);
      
      // Draw label
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
}

// Eye tracking simulation (would integrate with actual eye tracking library)
export class EyeTrackingService {
  private isTracking = false;
  private trackingInterval?: NodeJS.Timeout;
  private callback?: (data: any) => void;

  startTracking(callback: (data: any) => void) {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.callback = callback;
    
    this.trackingInterval = setInterval(() => {
      // Simulate eye tracking data
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

// Utility function to initialize proctoring
export const initializeProctoring = (
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
  onAlert: (alert: ProctoringAlert) => void,
  onEyeTracking: (data: any) => void
) => {
  const yoloService = new YOLOProctoringService(videoElement, canvasElement);
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