// Enhanced Proctoring Service with Face Verification and YOLO Integration

export interface ProctoringAlert {
  id?: string;
  meetingId: string;
  studentId: string;
  alertType: 'multiple_faces' | 'no_face' | 'phone_detected' | 'face_mismatch' | 'suspicious_object';
  confidence: number;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  resolved?: boolean;
}

export interface FaceVerificationResult {
  isMatch: boolean;
  isDeepfake: boolean;
  matchScore: number;
}

export class ProctoringService {
  private baseUrl = 'http://localhost:4000';
  private token: string | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  async verifyFace(meetingId: string, studentId: string, cloudinaryImageUrl: string, capturedImageBlob: Blob): Promise<FaceVerificationResult> {
    const formData = new FormData();
    formData.append('meetingId', meetingId);
    formData.append('studentId', studentId);
    formData.append('cloudinaryImageUrl', cloudinaryImageUrl);
    formData.append('image', capturedImageBlob, 'captured-face.jpg');

    const response = await fetch(`${this.baseUrl}/proctoring/verify-face`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Face verification failed');
    }

    return response.json();
  }

  async createAlert(alert: Omit<ProctoringAlert, 'id' | 'timestamp'>): Promise<ProctoringAlert> {
    const response = await fetch(`${this.baseUrl}/proctoring/alert`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error('Failed to create alert');
    }

    return response.json();
  }

  async processYoloDetection(meetingId: string, studentId: string, detections: any[]): Promise<ProctoringAlert[]> {
    const response = await fetch(`${this.baseUrl}/proctoring/yolo-detection`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ meetingId, studentId, detections }),
    });

    if (!response.ok) {
      throw new Error('Failed to process YOLO detection');
    }

    return response.json();
  }

  async getAlertsForMeeting(meetingId: string): Promise<ProctoringAlert[]> {
    const response = await fetch(`${this.baseUrl}/proctoring/alerts/${meetingId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch alerts');
    }

    return response.json();
  }

  async getFlaggedStudents(meetingId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/proctoring/flagged-students/${meetingId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch flagged students');
    }

    return response.json();
  }

  async resolveAlert(alertId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/proctoring/resolve-alert/${alertId}`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to resolve alert');
    }
  }
}