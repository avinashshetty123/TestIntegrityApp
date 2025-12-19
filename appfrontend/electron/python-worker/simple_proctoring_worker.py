import json
import sys
import time
import base64
import numpy as np
import cv2

class SimpleProctoringAnalyzer:
    def __init__(self):
        print("Simple Proctoring Analyzer initialized (basic mode)")
        self.face_cascade = None
        try:
            # Try to load OpenCV face cascade
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            print("✅ Face detection loaded")
        except Exception as e:
            print(f"⚠️ Face detection not available: {e}")

    def decode_base64_image(self, base64_string):
        """Convert base64 string to OpenCV image"""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            
            img_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(img_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            print(f"Error decoding image: {e}")
            return None

    def analyze_frame(self, frame_data):
        """Basic frame analysis without advanced AI"""
        try:
            image = self.decode_base64_image(frame_data['imageData'])
            if image is None:
                return {'alerts': [], 'faceDetected': False}
            
            alerts = []
            face_count = 0
            
            # Basic face detection if available
            if self.face_cascade is not None:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
                face_count = len(faces)
                
                if face_count == 0:
                    alerts.append({
                        'alertType': 'NO_FACE',
                        'description': 'No face detected in frame',
                        'confidence': 0.8,
                        'severity': 'MEDIUM'
                    })
                elif face_count > 1:
                    alerts.append({
                        'alertType': 'MULTIPLE_FACES',
                        'description': f'{face_count} faces detected',
                        'confidence': 0.9,
                        'severity': 'HIGH'
                    })
                else:
                    alerts.append({
                        'alertType': 'FACE_DETECTED',
                        'description': 'Face detected successfully',
                        'confidence': 0.8,
                        'severity': 'LOW'
                    })
            
            return {
                'alerts': alerts,
                'faceDetected': face_count > 0,
                'faceCount': face_count,
                'identityVerified': False,
                'identityMatches': 0,
                'objectsDetected': [],
                'timestamp': time.time(),
                'processingTime': time.time(),
                'mode': 'basic'
            }
            
        except Exception as e:
            print(f"Error in frame analysis: {e}")
            return {'alerts': [], 'faceDetected': False, 'error': str(e)}

def main():
    analyzer = SimpleProctoringAnalyzer()
    print("Simple Python proctoring worker started. Waiting for frames...")
    
    try:
        for line in sys.stdin:
            try:
                data = json.loads(line.strip())
                
                if data.get('type') == 'VIDEO_FRAME':
                    frame_data = data.get('data', {})
                    analysis_result = analyzer.analyze_frame(frame_data)
                    
                    # Add metadata
                    analysis_result.update({
                        'meetingId': frame_data.get('meetingId'),
                        'userId': frame_data.get('userId'),
                        'participantId': frame_data.get('participantId'),
                        'frameTimestamp': frame_data.get('timestamp')
                    })
                    
                    print(json.dumps(analysis_result))
                    sys.stdout.flush()
                
                elif data.get('type') == 'START_PROCESSING':
                    print(json.dumps({
                        'status': 'PROCESSING_STARTED',
                        'mode': 'basic',
                        'timestamp': time.time()
                    }))
                    sys.stdout.flush()
                
                elif data.get('type') == 'STOP_PROCESSING':
                    print(json.dumps({
                        'status': 'PROCESSING_STOPPED',
                        'timestamp': time.time()
                    }))
                    sys.stdout.flush()
                    
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}", file=sys.stderr)
            except Exception as e:
                print(f"Processing error: {e}", file=sys.stderr)
                
    except KeyboardInterrupt:
        print("Simple Python worker shutting down...", file=sys.stderr)

if __name__ == "__main__":
    main()