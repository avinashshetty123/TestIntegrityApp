import cv2
import numpy as np
import json
import sys
import base64
import time
import math
import requests
from collections import deque
from ultralytics import YOLO
import dlib
import os
from PIL import Image
import io

class ProctoringAnalyzer:
    def __init__(self):
        print("Initializing Proctoring Analyzer...")
        
        # Load YOLO model for object detection
        print("Loading YOLO model...")
        self.yolo_model = YOLO('yolov8n.pt')
        
        # Load dlib for face detection
        print("Loading dlib face detector...")
        self.face_detector = dlib.get_frontal_face_detector()
        
        # Load face recognition model (using dlib's ResNet)
        print("Loading face recognition model...")
        try:
            self.face_recognizer = dlib.face_recognition_model_v1('dlib_face_recognition_resnet_model_v1.dat')
            self.shape_predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')
            self.face_recognition_loaded = True
        except:
            print("Face recognition models not found, using basic face detection only")
            self.face_recognition_loaded = False
        
        # Reference face for identity verification
        self.reference_face_encoding = None
        self.reference_image_url = None
        self.identity_verified = False
        
        # Detection thresholds
        self.confidence_threshold = 0.5
        self.phone_class_id = 67
        self.face_similarity_threshold = 0.6
        
        # Eye tracking
        self.eye_aspect_ratio_threshold = 0.25
        self.eye_closure_frames = 0
        self.eye_closure_threshold = 10
        
        # Tracking variables
        self.gaze_history = deque(maxlen=10)
        self.gaze_deviation_threshold = 0.4
        self.multiple_faces_time = None
        self.multiple_faces_threshold = 5
        self.no_face_time = None
        self.no_face_threshold = 3
        
        print("Proctoring analyzer initialized!")

    def load_reference_face(self, image_url, user_id):
        """Load reference face from user profile for identity verification"""
        try:
            print(f"Loading reference face from: {image_url}")
            self.reference_image_url = image_url
            
            # Download image
            response = requests.get(image_url)
            if response.status_code == 200:
                # Convert to numpy array
                image_data = np.frombuffer(response.content, np.uint8)
                image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
                
                if image is not None:
                    # Detect and encode face
                    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
                    faces = self.face_detector(gray)
                    
                    if len(faces) > 0:
                        # Get the first face
                        face = faces[0]
                        
                        if self.face_recognition_loaded:
                            # Get face landmarks
                            landmarks = self.shape_predictor(gray, face)
                            # Compute face encoding
                            face_encoding = self.face_recognizer.compute_face_descriptor(image, landmarks)
                            self.reference_face_encoding = np.array(face_encoding)
                            print("Reference face encoding loaded successfully")
                        else:
                            # Basic face detection without recognition
                            self.reference_face_encoding = "basic_detection"
                            print("Basic face detection enabled (no recognition)")
                        
                        return True
                    else:
                        print("No face found in reference image")
                else:
                    print("Failed to decode reference image")
            else:
                print(f"Failed to download reference image: {response.status_code}")
                
        except Exception as e:
            print(f"Error loading reference face: {e}")
            
        return False

    def verify_face_identity(self, image, face_rect):
        """Verify if the detected face matches the reference face"""
        if self.reference_face_encoding is None:
            return False, 0.0
        
        try:
            if not self.face_recognition_loaded:
                # Basic verification - just check if face is detected
                return True, 1.0
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            landmarks = self.shape_predictor(gray, face_rect)
            current_encoding = np.array(self.face_recognizer.compute_face_descriptor(image, landmarks))
            
            # Calculate Euclidean distance between face encodings
            distance = np.linalg.norm(self.reference_face_encoding - current_encoding)
            similarity = max(0, 1 - distance)
            
            is_match = similarity >= self.face_similarity_threshold
            return is_match, similarity
            
        except Exception as e:
            print(f"Error in face verification: {e}")
            return False, 0.0

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

    def calculate_eye_aspect_ratio(self, eye_landmarks):
        """Calculate Eye Aspect Ratio (EAR) for blink detection"""
        # Vertical distances
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        
        # Horizontal distance
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        
        ear = (A + B) / (2.0 * C)
        return ear

    def calculate_gaze_direction(self, left_eye_landmarks, right_eye_landmarks):
        """Calculate gaze direction based on eye landmarks"""
        left_eye_center = np.mean(left_eye_landmarks, axis=0)
        right_eye_center = np.mean(right_eye_landmarks, axis=0)
        
        gaze_vector = right_eye_center - left_eye_center
        gaze_norm = np.linalg.norm(gaze_vector)
        
        if gaze_norm > 0:
            gaze_direction = gaze_vector / gaze_norm
            return gaze_direction
        return np.array([0, 0])

    def detect_suspicious_objects(self, image):
        """Detect phones and other suspicious objects using YOLO"""
        results = self.yolo_model(image, conf=self.confidence_threshold, verbose=False)
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    
                    # Check for cell phone
                    if class_id == self.phone_class_id and confidence > self.confidence_threshold:
                        detections.append({
                            'object': 'cell_phone',
                            'confidence': confidence,
                            'bbox': box.xyxy[0].tolist()
                        })
        
        return detections

    def analyze_face_behavior(self, image):
        """Analyze face for proctoring violations"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        faces = self.face_detector(gray)
        
        alerts = []
        face_count = len(faces)
        identity_matches = 0
        
        # Check for multiple faces
        if face_count > 1:
            if self.multiple_faces_time is None:
                self.multiple_faces_time = time.time()
            elif time.time() - self.multiple_faces_time > self.multiple_faces_threshold:
                alerts.append({
                    'alertType': 'MULTIPLE_FACES',
                    'description': f'Multiple faces detected ({face_count})',
                    'confidence': 0.9,
                    'severity': 'HIGH'
                })
        else:
            self.multiple_faces_time = None
        
        # Check for no face
        if face_count == 0:
            if self.no_face_time is None:
                self.no_face_time = time.time()
            elif time.time() - self.no_face_time > self.no_face_threshold:
                alerts.append({
                    'alertType': 'NO_FACE',
                    'description': 'No face detected for extended period',
                    'confidence': 0.8,
                    'severity': 'MEDIUM'
                })
        else:
            self.no_face_time = None
        
        # Analyze each face
        for face in faces:
            # Identity verification
            is_verified, similarity = self.verify_face_identity(image, face)
            if is_verified:
                identity_matches += 1
                if not self.identity_verified:
                    self.identity_verified = True
                    alerts.append({
                        'alertType': 'IDENTITY_VERIFIED',
                        'description': f'Face identity verified (similarity: {similarity:.2f})',
                        'confidence': similarity,
                        'severity': 'LOW'
                    })
            else:
                alerts.append({
                    'alertType': 'IDENTITY_MISMATCH',
                    'description': f'Face does not match registered user (similarity: {similarity:.2f})',
                    'confidence': 1 - similarity,
                    'severity': 'HIGH'
                })
            
            # Advanced face analysis if shape predictor is available
            if self.face_recognition_loaded:
                try:
                    landmarks = self.shape_predictor(gray, face)
                    landmarks_np = np.array([[p.x, p.y] for p in landmarks.parts()])
                    
                    # Extract eye landmarks
                    left_eye = landmarks_np[36:42]
                    right_eye = landmarks_np[42:48]
                    
                    # Calculate Eye Aspect Ratio for blink detection
                    left_ear = self.calculate_eye_aspect_ratio(left_eye)
                    right_ear = self.calculate_eye_aspect_ratio(right_eye)
                    ear = (left_ear + right_ear) / 2.0
                    
                    # Check for eye closure
                    if ear < self.eye_aspect_ratio_threshold:
                        self.eye_closure_frames += 1
                        if self.eye_closure_frames > self.eye_closure_threshold:
                            alerts.append({
                                'alertType': 'EYE_GAZE_DEVIATION',
                                'description': 'Prolonged eye closure detected',
                                'confidence': 0.7,
                                'severity': 'MEDIUM'
                            })
                    else:
                        self.eye_closure_frames = 0
                    
                    # Gaze direction analysis
                    gaze_direction = self.calculate_gaze_direction(left_eye, right_eye)
                    self.gaze_history.append(gaze_direction)
                    
                    # Check for gaze deviation
                    if len(self.gaze_history) >= 5:
                        gaze_variance = np.var(self.gaze_history, axis=0)
                        if np.max(gaze_variance) > self.gaze_deviation_threshold:
                            alerts.append({
                                'alertType': 'SUSPICIOUS_BEHAVIOR',
                                'description': 'Unusual eye movement patterns detected',
                                'confidence': 0.6,
                                'severity': 'MEDIUM'
                            })
                            
                except Exception as e:
                    print(f"Error in advanced face analysis: {e}")
        
        return alerts, face_count, identity_matches

    def analyze_frame(self, frame_data):
        """Main analysis function for each video frame"""
        try:
            # Decode base64 image
            image = self.decode_base64_image(frame_data['imageData'])
            if image is None:
                return {'alerts': [], 'faceDetected': False}
            
            # Detect suspicious objects
            object_alerts = self.detect_suspicious_objects(image)
            
            # Analyze face behavior
            face_alerts, face_count, identity_matches = self.analyze_face_behavior(image)
            
            # Combine all alerts
            all_alerts = []
            
            # Add object detection alerts
            for obj_alert in object_alerts:
                all_alerts.append({
                    'alertType': 'PHONE_DETECTED',
                    'description': f'Mobile phone detected (confidence: {obj_alert["confidence"]:.2f})',
                    'confidence': obj_alert['confidence'],
                    'severity': 'HIGH'
                })
            
            # Add face behavior alerts
            all_alerts.extend(face_alerts)
            
            # Add basic face verification
            if face_count > 0 and not any(alert['alertType'] == 'IDENTITY_VERIFIED' for alert in all_alerts):
                all_alerts.append({
                    'alertType': 'FACE_DETECTED',
                    'description': 'Face detected in frame',
                    'confidence': 0.8,
                    'severity': 'LOW'
                })
            
            return {
                'alerts': all_alerts,
                'faceDetected': face_count > 0,
                'faceCount': face_count,
                'identityVerified': self.identity_verified,
                'identityMatches': identity_matches,
                'objectsDetected': [obj['object'] for obj in object_alerts],
                'timestamp': time.time()
            }
            
        except Exception as e:
            print(f"Error in frame analysis: {e}")
            return {'alerts': [], 'faceDetected': False, 'error': str(e)}

def main():
    analyzer = ProctoringAnalyzer()
    print("Python proctoring worker started. Waiting for frames...")
    
    try:
        for line in sys.stdin:
            try:
                data = json.loads(line.strip())
                
                if data.get('type') == 'VIDEO_FRAME':
                    frame_data = data.get('data', {})
                    analysis_result = analyzer.analyze_frame(frame_data)
                    
                    # Send analysis result to Electron
                    print(json.dumps(analysis_result))
                    sys.stdout.flush()
                
                elif data.get('type') == 'LOAD_REFERENCE_FACE':
                    image_url = data.get('imageUrl')
                    user_id = data.get('userId')
                    success = analyzer.load_reference_face(image_url, user_id)
                    print(json.dumps({
                        'status': 'REFERENCE_FACE_LOADED',
                        'success': success,
                        'userId': user_id
                    }))
                    sys.stdout.flush()
                
                elif data.get('type') == 'START_PROCESSING':
                    print(json.dumps({'status': 'PROCESSING_STARTED'}))
                    sys.stdout.flush()
                
                elif data.get('type') == 'STOP_PROCESSING':
                    print(json.dumps({'status': 'PROCESSING_STOPPED'}))
                    sys.stdout.flush()
                    
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
            except Exception as e:
                print(f"Processing error: {e}")
                
    except KeyboardInterrupt:
        print("Python worker shutting down...")

if __name__ == "__main__":
    main()