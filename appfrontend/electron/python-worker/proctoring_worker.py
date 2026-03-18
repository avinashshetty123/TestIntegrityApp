# python-worker/proctoring_worker.py
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

class ProctoringAnalyzer:
    def __init__(self):
        print("Initializing Proctoring Analyzer...")
        
        # Load YOLO model for object detection
        print("Loading YOLO model...")
        self.yolo_model = YOLO('yolov8n.pt')
        
        # Load dlib face detector
        print("Loading dlib face detector...")
        self.face_detector = dlib.get_frontal_face_detector()
        
        # Load face recognition models
        print("Loading face recognition models...")
        try:
            self.face_recognizer = dlib.face_recognition_model_v1('dlib_face_recognition_resnet_model_v1.dat')
            self.shape_predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')
            self.face_recognition_loaded = True
        except Exception as e:
            print(f"Face recognition models not found: {e}, using basic face detection only")
            self.face_recognition_loaded = False
        
        # Reference face for identity verification
        self.reference_face_encoding = None
        self.reference_user_id = None
        self.identity_verified = False
        
        # Detection thresholds
        self.phone_class_id = 67  # COCO class for cell phone
        self.confidence_threshold = 0.3
        self.face_similarity_threshold = 0.35
        
        # Eye tracking
        self.eye_aspect_ratio_threshold = 0.25
        self.eye_closure_frames = 0
        self.eye_closure_threshold = 10
        
        # Gaze tracking
        self.gaze_history = deque(maxlen=10)
        self.gaze_deviation_threshold = 0.2
        
        # Head pose thresholds (degrees)
        self.head_yaw_threshold = 20
        self.head_pitch_threshold = 18
        self.head_roll_threshold = 18
        
        # Multiple faces tracking
        self.multiple_faces_start = None
        self.multiple_faces_threshold = 0  # seconds
        self.no_face_start = None
        self.no_face_threshold = 0.5  # seconds
        
        # Audio analysis placeholder (you can integrate a VAD library later)
        self.last_audio_energy = 0
        self.silence_start = None
        self.silence_threshold = 5
        
        print("Proctoring analyzer initialized!")

    def load_reference_face(self, image_url, user_id):
        """Download image from URL, detect face, and compute reference encoding."""
        try:
            print(f"Loading reference face from: {image_url} for user {user_id}")
            response = requests.get(image_url)
            if response.status_code != 200:
                print(f"Failed to download image: {response.status_code}")
                return False
            
            # Convert to numpy array
            image_data = np.frombuffer(response.content, np.uint8)
            image = cv2.imdecode(image_data, cv2.IMREAD_COLOR)
            if image is None:
                print("Failed to decode image")
                return False
            
            # Convert to grayscale for detection
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector(gray)
            if len(faces) == 0:
                print("No face found in reference image")
                return False
            
            face = faces[0]
            if self.face_recognition_loaded:
                landmarks = self.shape_predictor(gray, face)
                encoding = np.array(self.face_recognizer.compute_face_descriptor(image, landmarks))
                self.reference_face_encoding = encoding
                print("Reference face encoding stored")
            else:
                # If no recognition, store a placeholder – we'll just detect presence
                self.reference_face_encoding = "basic"
                print("Basic detection mode (no face recognition)")
            
            self.reference_user_id = user_id
            return True
        except Exception as e:
            print(f"Error loading reference face: {e}")
            return False

    def verify_face_identity(self, image, face_rect):
        """Compare detected face with reference encoding."""
        if self.reference_face_encoding is None:
            return None, None
        
        if not self.face_recognition_loaded:
            # In basic mode, we assume any face is the correct one (no verification)
            return True, 1.0
        
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            landmarks = self.shape_predictor(gray, face_rect)
            current_encoding = np.array(self.face_recognizer.compute_face_descriptor(image, landmarks))
            distance = np.linalg.norm(self.reference_face_encoding - current_encoding)
            similarity = max(0, 1 - distance)
            is_match = similarity >= self.face_similarity_threshold
            return is_match, similarity
        except Exception as e:
            print(f"Error in face verification: {e}")
            return False, 0.0

    def decode_base64_image(self, base64_string):
        """Convert base64 string to OpenCV image."""
        try:
            if ',' in base64_string:
                base64_string = base64_string.split(',')[1]
            img_data = base64.b64decode(base64_string)
            nparr = np.frombuffer(img_data, np.uint8)
            return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception as e:
            print(f"Error decoding image: {e}")
            return None

    def calculate_eye_aspect_ratio(self, eye_landmarks):
        """EAR = (|p2-p6| + |p3-p5|) / (2|p1-p4|)."""
        A = np.linalg.norm(eye_landmarks[1] - eye_landmarks[5])
        B = np.linalg.norm(eye_landmarks[2] - eye_landmarks[4])
        C = np.linalg.norm(eye_landmarks[0] - eye_landmarks[3])
        return (A + B) / (2.0 * C)

    def estimate_head_pose(self, landmarks, image_shape):
        """Estimate head rotation angles using solvePnP."""
        # 2D image points from landmarks
        image_points = np.array([
            (landmarks[30].x, landmarks[30].y),  # Nose tip
            (landmarks[8].x, landmarks[8].y),    # Chin
            (landmarks[36].x, landmarks[36].y),  # Left eye left corner
            (landmarks[45].x, landmarks[45].y),  # Right eye right corner
            (landmarks[48].x, landmarks[48].y),  # Left mouth corner
            (landmarks[54].x, landmarks[54].y)   # Right mouth corner
        ], dtype="double")

        # 3D model points (approximate)
        model_points = np.array([
            (0.0, 0.0, 0.0),           # Nose tip
            (0.0, -330.0, -65.0),       # Chin
            (-225.0, 170.0, -135.0),    # Left eye left corner
            (225.0, 170.0, -135.0),     # Right eye right corner
            (-150.0, -150.0, -125.0),   # Left mouth corner
            (150.0, -150.0, -125.0)     # Right mouth corner
        ])

        # Camera internals
        focal_length = image_shape[1]
        center = (image_shape[1]/2, image_shape[0]/2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype="double")
        dist_coeffs = np.zeros((4,1))

        success, rotation_vector, translation_vector = cv2.solvePnP(model_points, image_points, camera_matrix, dist_coeffs)
        if not success:
            return 0, 0, 0

        # Convert rotation vector to Euler angles
        rvec_matrix = cv2.Rodrigues(rotation_vector)[0]
        proj_matrix = np.hstack((rvec_matrix, translation_vector))
        euler_angles = cv2.decomposeProjectionMatrix(proj_matrix)[6]  # [pitch, yaw, roll]
        return euler_angles[0], euler_angles[1], euler_angles[2]  # pitch, yaw, roll

    def detect_suspicious_objects(self, image):
        """Run YOLO to detect phones."""
        results = self.yolo_model(image, conf=self.confidence_threshold, verbose=False)
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])
                    if class_id == self.phone_class_id and confidence > self.confidence_threshold:
                        detections.append({
                            'object': 'cell_phone',
                            'confidence': confidence,
                            'bbox': box.xyxy[0].tolist()
                        })
        return detections

    def analyze_audio_placeholder(self, audio_energy=None):
        """
        Placeholder for audio analysis.
        In real implementation, you would:
        - Use webrtcvad to detect voice activity.
        - If voice is detected but no face is present, flag it.
        - If multiple speakers (requires diarization) – complex.
        """
        alerts = []
        # If we had audio energy level:
        # if audio_energy < 0.01: # silence
        #     if self.silence_start is None:
        #         self.silence_start = time.time()
        #     elif time.time() - self.silence_start > self.silence_threshold:
        #         alerts.append(...)
        # else:
        #     self.silence_start = None
        return alerts

    def analyze_frame(self, frame_data):
        """Main analysis pipeline for each video frame."""
        try:
            image = self.decode_base64_image(frame_data['imageData'])
            if image is None:
                return {'alerts': [], 'faceDetected': False}

            alerts = []
            face_count = 0
            identity_matches = 0

            # Object detection
            objects = self.detect_suspicious_objects(image)
            for obj in objects:
                alerts.append({
                    'alertType': 'PHONE_DETECTED',
                    'description': f'Mobile phone detected (conf: {obj["confidence"]:.2f})',
                    'confidence': obj['confidence'],
                    'severity': 'HIGH'
                })

            # Face detection and analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_detector(gray)
            face_count = len(faces)

            # No face sustained
            if face_count == 0:
                if self.no_face_start is None:
                    self.no_face_start = time.time()
                elif time.time() - self.no_face_start > self.no_face_threshold:
                    alerts.append({
                        'alertType': 'NO_FACE',
                        'description': 'No face detected for extended period',
                        'confidence': 0.8,
                        'severity': 'MEDIUM'
                    })
            else:
                self.no_face_start = None

            # Multiple faces sustained
            if face_count > 1:
                if self.multiple_faces_start is None:
                    self.multiple_faces_start = time.time()
                elif time.time() - self.multiple_faces_start > self.multiple_faces_threshold:
                    alerts.append({
                        'alertType': 'MULTIPLE_FACES',
                        'description': f'{face_count} faces detected',
                        'confidence': 0.9,
                        'severity': 'HIGH'
                    })
            else:
                self.multiple_faces_start = None

            # Analyze each face
            for face in faces:
                # Identity verification
                is_match, similarity = self.verify_face_identity(image, face)
                if is_match is None:
                    pass
                elif is_match:
                    identity_matches += 1
                    if not self.identity_verified:
                        self.identity_verified = True
                        alerts.append({
                            'alertType': 'IDENTITY_VERIFIED',
                            'description': f'Face identity verified (sim: {similarity:.2f})',
                            'confidence': similarity,
                            'severity': 'LOW'
                        })
                else:
                    alerts.append({
                        'alertType': 'IDENTITY_MISMATCH',
                        'description': f'Face does not match registered user (sim: {similarity:.2f})',
                        'confidence': 1 - similarity,
                        'severity': 'HIGH'
                    })
                    if similarity is not None and similarity < 0.85:
                        alerts.append({
                            'alertType': 'FACE_SIMILARITY_LOW',
                            'description': f'Face similarity dropped to {similarity:.2f}',
                            'confidence': 1 - similarity,
                            'severity': 'MEDIUM' if similarity > self.face_similarity_threshold else 'HIGH'
                        })

                if self.face_recognition_loaded:
                    try:
                        landmarks = self.shape_predictor(gray, face)
                        landmarks_np = np.array([[p.x, p.y] for p in landmarks.parts()])

                        # Eye Aspect Ratio
                        left_eye = landmarks_np[36:42]
                        right_eye = landmarks_np[42:48]
                        left_ear = self.calculate_eye_aspect_ratio(left_eye)
                        right_ear = self.calculate_eye_aspect_ratio(right_eye)
                        ear = (left_ear + right_ear) / 2.0

                        if ear < self.eye_aspect_ratio_threshold:
                            self.eye_closure_frames += 1
                            if self.eye_closure_frames > self.eye_closure_threshold:
                                alerts.append({
                                    'alertType': 'EYE_CLOSURE',
                                    'description': 'Prolonged eye closure detected',
                                    'confidence': 0.7,
                                    'severity': 'MEDIUM'
                                })
                        else:
                            self.eye_closure_frames = 0

                        # Gaze direction (using eye centers)
                        left_eye_center = np.mean(left_eye, axis=0)
                        right_eye_center = np.mean(right_eye, axis=0)
                        gaze_vector = right_eye_center - left_eye_center
                        gaze_norm = np.linalg.norm(gaze_vector)
                        if gaze_norm > 0:
                            gaze_dir = gaze_vector / gaze_norm
                            self.gaze_history.append(gaze_dir)
                            if len(self.gaze_history) >= 5:
                                variance = np.var(self.gaze_history, axis=0)
                                if np.max(variance) > self.gaze_deviation_threshold:
                                    alerts.append({
                                        'alertType': 'SUSPICIOUS_GAZE',
                                        'description': 'Unusual eye movement patterns',
                                        'confidence': 0.6,
                                        'severity': 'MEDIUM'
                                    })

                        # Head pose estimation
                        pitch, yaw, roll = self.estimate_head_pose(landmarks, image.shape)
                        if abs(yaw) > self.head_yaw_threshold:
                            alerts.append({
                                'alertType': 'HEAD_TURNED',
                                'description': f'Head turned sideways ({yaw:.1f}°)',
                                'confidence': 0.7,
                                'severity': 'MEDIUM'
                            })
                        if abs(pitch) > self.head_pitch_threshold:
                            alerts.append({
                                'alertType': 'HEAD_DOWN',
                                'description': f'Head tilted down ({pitch:.1f}°)',
                                'confidence': 0.7,
                                'severity': 'MEDIUM'
                            })
                        if abs(roll) > self.head_roll_threshold:
                            alerts.append({
                                'alertType': 'HEAD_TILTED',
                                'description': f'Head tilted ({roll:.1f}°)',
                                'confidence': 0.7,
                                'severity': 'MEDIUM'
                            })

                    except Exception as e:
                        print(f"Error in advanced face analysis: {e}")

            # Audio analysis (placeholder)
            audio_alerts = self.analyze_audio_placeholder()
            alerts.extend(audio_alerts)

            return {
                'alerts': alerts,
                'faceDetected': face_count > 0,
                'faceCount': face_count,
                'identityVerified': self.identity_verified and identity_matches > 0,
                'identityMatches': identity_matches,
                'objectsDetected': [obj['object'] for obj in objects],
                'timestamp': time.time(),
                'processingTime': time.time(),
                'frameTimestamp': frame_data.get('timestamp')
            }

        except Exception as e:
            print(f"Error in frame analysis: {e}")
            return {'alerts': [], 'faceDetected': False, 'error': str(e)}

def main():
    analyzer = ProctoringAnalyzer()
    print(json.dumps({'status': 'READY', 'mode': 'advanced', 'timestamp': time.time()}))
    sys.stdout.flush()
    print("Python proctoring worker started. Waiting for frames...", file=sys.stderr)

    for line in sys.stdin:
        try:
            data = json.loads(line.strip())

            if data.get('type') == 'VIDEO_FRAME':
                frame_data = data.get('data', {})
                result = analyzer.analyze_frame(frame_data)
                # Add metadata
                result.update({
                    'meetingId': frame_data.get('meetingId'),
                    'userId': frame_data.get('userId'),
                    'participantId': frame_data.get('participantId'),
                })
                print(json.dumps(result))
                sys.stdout.flush()

            elif data.get('type') == 'LOAD_REFERENCE_FACE':
                success = analyzer.load_reference_face(data['imageUrl'], data['userId'])
                print(json.dumps({
                    'status': 'REFERENCE_FACE_LOADED',
                    'success': success,
                    'userId': data['userId'],
                    'timestamp': time.time()
                }))
                sys.stdout.flush()

            elif data.get('type') == 'START_PROCESSING':
                print(json.dumps({'status': 'PROCESSING_STARTED', 'timestamp': time.time()}))
                sys.stdout.flush()

            elif data.get('type') == 'STOP_PROCESSING':
                print(json.dumps({'status': 'PROCESSING_STOPPED', 'timestamp': time.time()}))
                sys.stdout.flush()

        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"Processing error: {e}", file=sys.stderr)
            print(json.dumps({'status': 'ERROR', 'error': str(e), 'timestamp': time.time()}))
            sys.stdout.flush()

if __name__ == "__main__":
    main()
