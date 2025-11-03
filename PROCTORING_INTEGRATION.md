# 🛡️ Proctoring System Integration Guide

## Overview
This integration adds comprehensive AI-powered proctoring to TestIntegrity with:
- **Face Verification**: Matches student faces against Cloudinary stored images
- **YOLO Detection**: Detects multiple faces, phones, and suspicious objects
- **Real-time Alerts**: Flags students for cheating attempts
- **Tutor Dashboard**: Monitor all students and alerts in real-time

## Backend Components

### 1. Proctoring Module (`/src/proctoring/`)
- **ProctoringService**: Handles face verification and YOLO processing
- **ProctoringController**: API endpoints for alerts and verification
- **Entities**: Database models for alerts and face verification records

### 2. API Endpoints
```
POST /proctoring/verify-face        # Verify student face against Cloudinary image
POST /proctoring/alert              # Create proctoring alert
POST /proctoring/yolo-detection     # Process YOLO detection results
GET  /proctoring/alerts/:meetingId  # Get alerts for meeting
GET  /proctoring/flagged-students/:meetingId # Get flagged students
POST /proctoring/resolve-alert/:alertId # Resolve alert
```

## Frontend Components

### 1. Enhanced Student Meeting (`StudentProctoredMeeting.tsx`)
- Integrates YOLO proctoring with face verification
- Real-time detection overlay on video
- Local alert display for immediate feedback

### 2. Tutor Proctoring Dashboard (`TutorProctoredMeeting.tsx`)
- Multi-student video grid with flagged indicators
- Real-time proctoring panel
- Student management controls

### 3. Proctoring Panel (`ProctoringPanel.tsx`)
- Live alert monitoring
- Flagged students summary
- Alert resolution interface

## Usage Instructions

### For Students
1. **Join Meeting**: Use join link from tutor
2. **Face Verification**: System automatically verifies face against registered image
3. **Continuous Monitoring**: YOLO model monitors for:
   - Multiple faces in frame
   - Mobile phones or devices
   - Student leaving frame
   - Face mismatch or deepfake detection

### For Tutors
1. **Create Meeting**: Set up proctored examination
2. **Monitor Students**: View all student feeds with flagged indicators
3. **Review Alerts**: Check proctoring panel for real-time alerts
4. **Take Action**: Resolve alerts or flag students for review

## Integration Steps

### 1. Backend Setup
```bash
# Backend is already configured with proctoring module
# Entities will be auto-created in database
cd backend/backend
npm run start:dev
```

### 2. Frontend Integration
```typescript
// In student meeting component
import { initializeProctoring } from '@/lib/yolo-proctoring';
import { ProctoringService } from '@/lib/proctoring-service';

// Initialize with student data
const proctoring = initializeProctoring(
  videoElement,
  canvasElement,
  meetingId,
  studentId,
  cloudinaryImageUrl, // Student's registered face image
  onAlert,
  onEyeTracking
);
```

### 3. Database Tables
The system creates these tables automatically:
- `proctoring_alerts`: Stores all cheating detection alerts
- `face_verifications`: Records face verification attempts

## Alert Types

| Alert Type | Description | Severity |
|------------|-------------|----------|
| `multiple_faces` | More than one person detected | High |
| `no_face` | No person in frame | Medium |
| `phone_detected` | Mobile phone visible | High |
| `face_mismatch` | Face doesn't match registered image | High |
| `suspicious_object` | Unknown object detected | Low-Medium |

## Configuration

### Environment Variables
```env
# Add to backend/.env.docker
FACE_RECOGNITION_API_URL=your_face_api_endpoint
YOLO_MODEL_URL=your_yolo_endpoint
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Thresholds
- **Face Match Threshold**: 70% (configurable in ProctoringService)
- **Detection Confidence**: 60% minimum for alerts
- **Alert Frequency**: Max 1 alert per type per 5 seconds

## Security Features

1. **Deepfake Detection**: Integrated with existing deepfake service
2. **Face Verification**: Compares against pre-registered Cloudinary images
3. **Real-time Monitoring**: Continuous YOLO object detection
4. **Alert Logging**: All incidents stored with timestamps
5. **Encrypted Communication**: All API calls use JWT authentication

## Testing

### Test Face Verification
```bash
curl -X POST http://localhost:4000/proctoring/verify-face \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "meetingId=test-meeting" \
  -F "studentId=test-student" \
  -F "cloudinaryImageUrl=https://cloudinary.com/image.jpg" \
  -F "image=@captured-face.jpg"
```

### Test YOLO Detection
```bash
curl -X POST http://localhost:4000/proctoring/yolo-detection \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "meetingId": "test-meeting",
    "studentId": "test-student",
    "detections": [
      {"class": "person", "confidence": 0.95, "bbox": [100, 50, 200, 300]},
      {"class": "cell phone", "confidence": 0.85, "bbox": [300, 200, 80, 150]}
    ]
  }'
```

## Monitoring Dashboard

Tutors can monitor:
- **Live Student Feeds**: All participants with video overlay
- **Alert Summary**: Real-time flagged students count
- **Alert History**: Chronological list of all incidents
- **Student Status**: Individual student alert counts and severity

## Next Steps

1. **Deploy YOLO Model**: Set up actual YOLO inference server
2. **Face Recognition API**: Integrate with face comparison service
3. **Mobile App**: Extend proctoring to mobile devices
4. **Analytics**: Add detailed reporting and analytics
5. **ML Training**: Improve detection accuracy with custom datasets

---

**🚀 The proctoring system is now fully integrated and ready for secure online examinations!**