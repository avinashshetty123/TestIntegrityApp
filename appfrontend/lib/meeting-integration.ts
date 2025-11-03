// Meeting Integration Service - Handles all meeting operations
export class MeetingIntegrationService {
  private baseUrl = 'http://localhost:4000';
  
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Meeting Management
  async createMeeting(data: any) {
    const response = await fetch(`${this.baseUrl}/meetings/create`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  async joinMeeting(meetingId: string, displayName: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ displayName })
    });
    return response.json();
  }

  async startMeeting(meetingId: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/start`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async endMeeting(meetingId: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/end`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  // Session Management
  async getActiveSessions(meetingId: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/sessions`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async updateSession(sessionId: string, data: any) {
    const response = await fetch(`${this.baseUrl}/meetings/session/${sessionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return response.json();
  }

  // Lock Requests
  async createLockRequest(meetingId: string, reason: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/lock-request`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return response.json();
  }

  async getPendingLockRequests(meetingId: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/lock-requests`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  async respondToLockRequest(requestId: string, status: 'APPROVED' | 'REJECTED', tutorResponse?: string) {
    const response = await fetch(`${this.baseUrl}/meetings/lock-request/${requestId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status, tutorResponse })
    });
    return response.json();
  }

  // Results
  async getMeetingResults(meetingId: string) {
    const response = await fetch(`${this.baseUrl}/meetings/${meetingId}/results`, {
      headers: this.getAuthHeaders()
    });
    return response.json();
  }

  // Proctoring Alerts
  async submitProctoringAlert(meetingId: string, studentId: string, alert: any) {
    const response = await fetch(`${this.baseUrl}/proctoring/alert`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        meetingId,
        studentId,
        alertType: alert.type,
        confidence: alert.confidence,
        message: alert.message,
        severity: alert.severity
      })
    });
    return response.json();
  }

  // Face Verification
  async verifyFace(meetingId: string, studentId: string, referenceImageUrl: string, currentImageBlob: Blob) {
    const formData = new FormData();
    formData.append('meetingId', meetingId);
    formData.append('studentId', studentId);
    formData.append('referenceImageUrl', referenceImageUrl);
    formData.append('currentImage', currentImageBlob);

    const response = await fetch(`${this.baseUrl}/proctoring/verify-face`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    return response.json();
  }
}

// Optimized LiveKit Connection Handler
export class OptimizedLiveKitHandler {
  private room: any = null;
  private localParticipant: any = null;
  
  async connect(token: string, serverUrl: string, roomName: string) {
    try {
      // Dynamic import to reduce bundle size
      const { Room, RoomEvent, RemoteParticipant, LocalParticipant } = await import('livekit-client');
      
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 640, height: 480 },
          facingMode: 'user'
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      // Connection with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await this.room.connect(serverUrl, token);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      this.localParticipant = this.room.localParticipant;
      return this.room;
    } catch (error) {
      console.error('Failed to connect to LiveKit:', error);
      throw error;
    }
  }

  async enableCamera() {
    if (this.localParticipant) {
      await this.localParticipant.enableCameraAndMicrophone();
    }
  }

  async disconnect() {
    if (this.room) {
      this.room.disconnect();
    }
  }
}

// Performance Monitor
export class PerformanceMonitor {
  private metrics = {
    frameRate: 0,
    cpuUsage: 0,
    memoryUsage: 0,
    networkLatency: 0
  };

  startMonitoring(callback: (metrics: any) => void) {
    const interval = setInterval(() => {
      this.updateMetrics();
      callback(this.metrics);
    }, 5000);

    return () => clearInterval(interval);
  }

  private updateMetrics() {
    // Monitor performance metrics
    if ('memory' in performance) {
      this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024;
    }

    // Network latency estimation
    const start = performance.now();
    fetch('/api/ping').then(() => {
      this.metrics.networkLatency = performance.now() - start;
    }).catch(() => {});
  }

  shouldReduceQuality() {
    return this.metrics.memoryUsage > 100 || this.metrics.networkLatency > 200;
  }
}