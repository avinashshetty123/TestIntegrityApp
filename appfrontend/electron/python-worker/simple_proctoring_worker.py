import base64
import json
import sys
import time
import urllib.request
from collections import deque

import cv2
import numpy as np


class SimpleProctoringAnalyzer:
    def __init__(self):
        print("Initializing Simple Proctoring Analyzer...", file=sys.stderr)

        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.face_profile_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )
        self.upper_body_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_upperbody.xml"
        )

        # ── Identity ──────────────────────────────────────────────────────
        self.reference_face_signature = None
        self.reference_user_id = None
        self.identity_similarity_threshold = 0.40  # >40% similarity = pass
        self.identity_alert_cooldown = 30.0       # once per 30s max
        self.identity_alerted_at = 0.0

        # ── No face: must be absent for 8s before alerting, then 20s cooldown
        self.no_face_start = None
        self.no_face_threshold = 8.0
        self.no_face_alerted_at = 0.0
        self.no_face_cooldown = 20.0

        # ── Multiple faces: 3 consecutive frames, cooldown 30s ─────────────
        self.multi_face_alerted_at = 0.0
        self.multi_face_cooldown = 30.0

        # ── Gaze: needs 5 consecutive off-frames, cooldown 15s ────────────
        self.gaze_off_count = 0
        self.gaze_off_threshold = 5
        self.gaze_alerted_at = 0.0
        self.gaze_alert_cooldown = 15.0

        # ── Audio ─────────────────────────────────────────────────────────
        self.audio_history = deque(maxlen=24)
        self.speech_start = None
        self.speech_threshold = 0.08              # higher = less sensitive
        self.speech_duration_threshold = 5.0      # must speak for 5s
        self.speech_alerted_at = 0.0
        self.speech_alert_cooldown = 30.0

        # ── Phone: disabled by default (too many false positives with Haar)
        # Only fires if BOTH contour AND glow checks agree, cooldown 60s
        self.phone_alerted_at = 0.0
        self.phone_alert_cooldown = 60.0

        # ── Consecutive-frame confirmation buffers ─────────────────────────
        # Phone must be detected in 3 consecutive frames before alerting
        self.phone_consecutive = 0
        self.phone_consecutive_threshold = 3

        # Multi-face must be detected in 3 consecutive frames
        self.multi_face_consecutive = 0
        self.multi_face_consecutive_threshold = 3

        print("Simple proctoring analyzer ready", file=sys.stderr)

    def _iso(self):
        return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"

    def decode_image(self, b64: str):
        try:
            if b64.startswith("http://") or b64.startswith("https://"):
                with urllib.request.urlopen(b64, timeout=5) as response:
                    data = response.read()
                arr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            else:
                if "," in b64:
                    b64 = b64.split(",")[1]
                b64 += "=" * (-len(b64) % 4)
                data = base64.b64decode(b64)
                arr = np.frombuffer(data, np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)

            if img is None:
                return None

            h, w = img.shape[:2]
            if w < 640:
                scale = 640.0 / w
                img = cv2.resize(img, (int(w * scale), int(h * scale)),
                                 interpolation=cv2.INTER_LINEAR)
            return img
        except Exception as exc:
            print(f"Image decode error: {exc}", file=sys.stderr)
            return None

    def _preprocess_gray(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)

    def detect_faces(self, image):
        """
        Multi-pass face detection tuned for real webcam conditions:
        - 320x240 input upscaled to 640px wide
        - Normal indoor lighting, slight angle, glasses OK
        Returns (faces_list, body_detected).
        """
        h, w = image.shape[:2]

        # ── Pass 1: CLAHE-enhanced gray (good for normal/dim lighting) ────
        gray_clahe = self._preprocess_gray(image)

        # ── Pass 2: plain gray (CLAHE can over-sharpen and confuse cascade)
        gray_plain = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        gray_plain = cv2.equalizeHist(gray_plain)

        faces = []

        for gray in (gray_clahe, gray_plain):
            # Frontal — balanced: minNeighbors=4 catches real faces at webcam distance
            frontal = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.05, minNeighbors=4,
                minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
            )
            if len(frontal) > 0:
                faces.extend(frontal.tolist())
                break  # found faces — no need for second pass

        # Profile fallback (turned head)
        if len(faces) == 0 and not self.face_profile_cascade.empty():
            for gray in (gray_clahe, gray_plain):
                profile = self.face_profile_cascade.detectMultiScale(
                    gray, scaleFactor=1.05, minNeighbors=4, minSize=(60, 60)
                )
                if len(profile) > 0:
                    faces.extend(profile.tolist())
                    break
                # mirror for right-profile
                flipped = cv2.flip(gray, 1)
                profile_flip = self.face_profile_cascade.detectMultiScale(
                    flipped, scaleFactor=1.05, minNeighbors=4, minSize=(60, 60)
                )
                if len(profile_flip) > 0:
                    faces.extend(profile_flip.tolist())
                    break

        # Deduplicate overlapping rects (IoU > 0.4)
        unique = []
        for f in faces:
            fx, fy, fw, fh = f
            dup = False
            for uf in unique:
                ux, uy, uw, uh = uf
                ox = max(0, min(fx + fw, ux + uw) - max(fx, ux))
                oy = max(0, min(fy + fh, uy + uh) - max(fy, uy))
                if ox * oy / max(fw * fh, 1) > 0.4:
                    dup = True
                    break
            if not dup:
                unique.append(f)

        # Upper body fallback (only for no-face detection, not multi-face)
        body_detected = False
        if len(unique) == 0 and not self.upper_body_cascade.empty():
            bodies = self.upper_body_cascade.detectMultiScale(
                gray_clahe, scaleFactor=1.05, minNeighbors=3, minSize=(60, 60)
            )
            body_detected = len(bodies) > 0

        return unique, body_detected

    def _extract_face_signature(self, image):
        gray_clahe = self._preprocess_gray(image)
        gray_plain = cv2.equalizeHist(cv2.cvtColor(image, cv2.COLOR_BGR2GRAY))
        faces = []
        for gray in (gray_clahe, gray_plain):
            detected = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.05, minNeighbors=4,
                minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE,
            )
            if len(detected) > 0:
                faces = detected
                break
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        roi = gray_clahe[y: y + h, x: x + w]
        roi = cv2.resize(roi, (96, 96))
        hist = cv2.calcHist([roi], [0], None, [32], [0, 256]).flatten()
        hist = cv2.normalize(hist, hist).flatten()
        edges = cv2.Canny(roi, 80, 160)
        edge_hist = cv2.calcHist([edges], [0], None, [16], [0, 256]).flatten()
        edge_hist = cv2.normalize(edge_hist, edge_hist).flatten()
        return np.concatenate([hist, edge_hist]), faces

    def load_reference_face(self, image_b64, user_id):
        image = self.decode_image(image_b64)
        if image is None:
            return False
        result = self._extract_face_signature(image)
        if result is None:
            return False
        signature, _ = result
        self.reference_face_signature = signature
        self.reference_user_id = user_id
        print(f"Reference face loaded for {user_id}", file=sys.stderr)
        return True

    def compare_identity(self, image):
        if self.reference_face_signature is None:
            return None
        result = self._extract_face_signature(image)
        if result is None:
            return None
        signature, faces = result
        similarity = float(cv2.compareHist(
            self.reference_face_signature.astype(np.float32),
            signature.astype(np.float32),
            cv2.HISTCMP_CORREL,
        ))
        similarity = max(0.0, min(1.0, similarity))
        return {
            "similarity": similarity,
            "matches": similarity >= self.identity_similarity_threshold,
            "faces": faces,
        }

    def detect_phone(self, image):
        """
        Phone detection — requires BOTH contour AND glow evidence.
        Much stricter than before to eliminate false positives from
        monitors, windows, picture frames, etc.
        """
        try:
            h, w = image.shape[:2]
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # ── Contour check ─────────────────────────────────────────────
            # Phone must be small (2%–15% of frame) and portrait aspect ratio
            blurred = cv2.GaussianBlur(gray, (7, 7), 0)
            edges = cv2.Canny(blurred, 50, 150)
            contours, _ = cv2.findContours(
                edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            contour_hit = False
            for cnt in contours:
                area = cv2.contourArea(cnt)
                # Must be 2%–15% of frame (not a monitor/window)
                if area < (h * w * 0.02) or area > (h * w * 0.15):
                    continue
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                if len(approx) == 4:
                    x, y, cw, ch = cv2.boundingRect(approx)
                    aspect = max(cw, ch) / max(min(cw, ch), 1)
                    # Phone portrait: 1.6–2.2 aspect ratio
                    if 1.6 < aspect < 2.2:
                        contour_hit = True
                        break

            if not contour_hit:
                return False

            # ── Glow check (must also pass) ───────────────────────────────
            # A phone screen is bright AND small AND rectangular
            _, bright = cv2.threshold(gray, 210, 255, cv2.THRESH_BINARY)
            bright_cnts, _ = cv2.findContours(
                bright, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )
            for cnt in bright_cnts:
                area = cv2.contourArea(cnt)
                if area < (h * w * 0.015) or area > (h * w * 0.12):
                    continue
                x, y, cw, ch = cv2.boundingRect(cnt)
                aspect = max(cw, ch) / max(min(cw, ch), 1)
                if 1.5 < aspect < 2.3:
                    return True

        except Exception as exc:
            print(f"Phone detect error: {exc}", file=sys.stderr)
        return False

    def check_gaze(self, gray, face_rect):
        """Gaze check — only flag if eye is very far off-center (>75% from center)."""
        try:
            fx, fy, fw, fh = face_rect
            roi = gray[fy: fy + int(fh * 0.6), fx: fx + fw]
            eyes = self.eye_cascade.detectMultiScale(
                roi, 1.1, 4, minSize=(20, 20)
            )
            if len(eyes) < 1:
                return False
            for ex, ey, ew, eh in eyes:
                cx = (ex + ew / 2) / fw
                # Only flag extreme gaze (< 15% or > 85% of face width)
                if cx < 0.15 or cx > 0.85:
                    return True
        except Exception:
            pass
        return False

    def analyze_audio(self, energy, now, face_count):
        alerts = []
        self.audio_history.append(energy)

        if energy > self.speech_threshold:
            if self.speech_start is None:
                self.speech_start = now
            elif (
                now - self.speech_start > self.speech_duration_threshold
                and now - self.speech_alerted_at > self.speech_alert_cooldown
            ):
                alerts.append({
                    "alertType": "SUSTAINED_SPEECH",
                    "description": f"Continuous speech detected for {int(now - self.speech_start)}s",
                    "confidence": 0.74,
                    "severity": "MEDIUM",
                    "timestamp": self._iso(),
                })
                self.speech_alerted_at = now
        else:
            self.speech_start = None

        return alerts

    def analyze_frame(self, frame_data):
        try:
            raw = frame_data.get("imageData", "")
            print(f"[PY] analyze_frame: len={len(raw)}", file=sys.stderr)
            image = self.decode_image(raw)
            if image is None:
                print("[PY] decode_image returned None!", file=sys.stderr)
                return {"alerts": [], "faceDetected": False, "faceCount": 0}
            print(f"[PY] decoded image shape={image.shape}", file=sys.stderr)

            alerts = []
            now = time.time()

            faces, body_detected = self.detect_faces(image)
            face_count = len(faces)
            print(f"[PY] detect_faces: face_count={face_count} body={body_detected}", file=sys.stderr)
            gray = self._preprocess_gray(image)

            identity_verified = None
            identity_similarity = None

            # ── No face ───────────────────────────────────────────────────
            if face_count == 0:
                if self.no_face_start is None:
                    self.no_face_start = now
                elif (
                    now - self.no_face_start > self.no_face_threshold
                    and now - self.no_face_alerted_at > self.no_face_cooldown
                ):
                    desc = "No face detected in frame"
                    if body_detected:
                        desc = "Face not visible — please look at the camera"
                    alerts.append({
                        "alertType": "NO_FACE",
                        "description": desc,
                        "confidence": 0.85,
                        "severity": "MEDIUM",
                        "timestamp": self._iso(),
                    })
                    self.no_face_alerted_at = now
            else:
                self.no_face_start = None

            # ── Multiple faces — 3 consecutive frames is enough ──────────────
            if face_count > 1:
                self.multi_face_consecutive += 1
                if (
                    self.multi_face_consecutive >= self.multi_face_consecutive_threshold
                    and now - self.multi_face_alerted_at > self.multi_face_cooldown
                ):
                    alerts.append({
                        "alertType": "MULTIPLE_FACES",
                        "description": f"{face_count} faces detected — another person may be present",
                        "confidence": 0.88,
                        "severity": "HIGH",
                        "timestamp": self._iso(),
                    })
                    self.multi_face_alerted_at = now
                    self.multi_face_consecutive = 0
            else:
                self.multi_face_consecutive = 0

            # ── Gaze deviation ────────────────────────────────────────────
            if face_count == 1 and self.check_gaze(gray, faces[0]):
                self.gaze_off_count += 1
                if (
                    self.gaze_off_count >= self.gaze_off_threshold
                    and now - self.gaze_alerted_at > self.gaze_alert_cooldown
                ):
                    alerts.append({
                        "alertType": "GAZE_DEVIATION",
                        "description": "Student appears to be looking away from screen",
                        "confidence": 0.68,
                        "severity": "LOW",
                        "timestamp": self._iso(),
                    })
                    self.gaze_alerted_at = now
                    self.gaze_off_count = 0
            else:
                self.gaze_off_count = max(0, self.gaze_off_count - 1)

            # ── Identity check ────────────────────────────────────────────
            identity_result = self.compare_identity(image)
            if identity_result is not None:
                identity_similarity = identity_result["similarity"]
                identity_verified = identity_result["matches"]
                if (
                    not identity_result["matches"]
                    and now - self.identity_alerted_at > self.identity_alert_cooldown
                ):
                    alerts.append({
                        "alertType": "IDENTITY_MISMATCH",
                        "description": f"Face may not match registered student (similarity {identity_similarity:.2f})",
                        "confidence": round(1 - identity_similarity, 2),
                        "severity": "HIGH",
                        "timestamp": self._iso(),
                    })
                    self.identity_alerted_at = now

            # ── Phone detection — requires 3 consecutive frames ───────────
            if self.detect_phone(image):
                self.phone_consecutive += 1
                if (
                    self.phone_consecutive >= self.phone_consecutive_threshold
                    and now - self.phone_alerted_at > self.phone_alert_cooldown
                ):
                    alerts.append({
                        "alertType": "PHONE_DETECTED",
                        "description": "Mobile phone detected in frame",
                        "confidence": 0.72,
                        "severity": "HIGH",
                        "timestamp": self._iso(),
                    })
                    self.phone_alerted_at = now
                    self.phone_consecutive = 0
            else:
                self.phone_consecutive = 0

            # ── Audio ─────────────────────────────────────────────────────
            audio_energy = frame_data.get("audioEnergy")
            if audio_energy is not None:
                alerts.extend(self.analyze_audio(float(audio_energy), now, face_count))

            print(f"[PY] RESULT: faceDetected={face_count > 0} alerts={len(alerts)}", file=sys.stderr)
            return {
                "alerts": alerts,
                "faceDetected": face_count > 0,
                "faceCount": face_count,
                "bodyDetected": body_detected,
                "identityVerified": identity_verified,
                "identitySimilarity": identity_similarity,
                "timestamp": self._iso(),
                "mode": "simple",
            }
        except Exception as exc:
            print(f"Frame analysis error: {exc}", file=sys.stderr)
            return {"alerts": [], "faceDetected": False, "faceCount": 0}


def main():
    analyzer = SimpleProctoringAnalyzer()
    print(json.dumps({
        "status": "READY",
        "mode": "simple",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }))
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            msg_type = data.get("type")

            if msg_type == "VIDEO_FRAME":
                frame_data = data.get("data", {})
                result = analyzer.analyze_frame(frame_data)
                result.update({
                    "meetingId": frame_data.get("meetingId"),
                    "userId": frame_data.get("userId"),
                    "participantId": frame_data.get("participantId"),
                })
                print(json.dumps(result))
                sys.stdout.flush()

            elif msg_type == "LOAD_REFERENCE_FACE":
                success = analyzer.load_reference_face(
                    data.get("imageUrl", ""),
                    data.get("userId"),
                )
                print(json.dumps({
                    "status": "REFERENCE_FACE_LOADED",
                    "success": success,
                    "userId": data.get("userId"),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }))
                sys.stdout.flush()

            elif msg_type == "START_PROCESSING":
                print(json.dumps({
                    "status": "PROCESSING_STARTED",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }))
                sys.stdout.flush()

            elif msg_type == "STOP_PROCESSING":
                print(json.dumps({
                    "status": "PROCESSING_STOPPED",
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }))
                sys.stdout.flush()

        except json.JSONDecodeError as exc:
            print(f"JSON decode error: {exc}", file=sys.stderr)
        except Exception as exc:
            print(f"Processing error: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
