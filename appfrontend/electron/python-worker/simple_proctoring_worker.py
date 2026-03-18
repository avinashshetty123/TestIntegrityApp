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
        self.identity_similarity_threshold = 0.40
        self.identity_alerted_at = 0.0
        self.identity_alert_cooldown = 60.0

        # ── No face ───────────────────────────────────────────────────────
        self.no_face_start = None
        self.no_face_threshold = 10.0
        self.no_face_alerted_at = 0.0
        self.no_face_cooldown = 30.0

        # ── Multiple faces ────────────────────────────────────────────────
        self.multi_face_start = None
        self.multi_face_threshold = 5.0
        self.multi_face_alerted_at = 0.0
        self.multi_face_cooldown = 45.0

        # ── Gaze deviation ────────────────────────────────────────────────
        self.gaze_away_start = None
        self.gaze_away_threshold = 8.0
        self.gaze_alerted_at = 0.0
        self.gaze_alert_cooldown = 20.0

        # ── Phone detection ───────────────────────────────────────────────
        self.phone_consecutive = 0
        self.phone_consecutive_threshold = 5
        self.phone_alerted_at = 0.0
        self.phone_alert_cooldown = 60.0

        # ── Audio / speech ────────────────────────────────────────────────
        self.audio_history = deque(maxlen=30)
        self.speech_start = None
        self.speech_threshold = 0.09
        self.speech_duration_threshold = 8.0
        self.speech_alerted_at = 0.0
        self.speech_alert_cooldown = 45.0

        print("Simple proctoring analyzer ready", file=sys.stderr)

    # ── Helpers ───────────────────────────────────────────────────────────

    def _iso(self):
        return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"

    def decode_image(self, b64: str):
        try:
            if b64.startswith("http://") or b64.startswith("https://"):
                with urllib.request.urlopen(b64, timeout=5) as r:
                    data = r.read()
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

    def _gray_clahe(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(gray)

    def _gray_eq(self, image):
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return cv2.equalizeHist(gray)

    # ── Face detection ────────────────────────────────────────────────────

    def detect_faces(self, image):
        gc = self._gray_clahe(image)
        ge = self._gray_eq(image)
        faces = []

        for gray in (gc, ge):
            found = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.05, minNeighbors=4,
                minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
            )
            if len(found) > 0:
                faces = found.tolist()
                break

        if not faces and not self.face_profile_cascade.empty():
            for gray in (gc, ge):
                found = self.face_profile_cascade.detectMultiScale(
                    gray, scaleFactor=1.05, minNeighbors=4, minSize=(60, 60)
                )
                if len(found) > 0:
                    faces = found.tolist()
                    break
                flipped = cv2.flip(gray, 1)
                found = self.face_profile_cascade.detectMultiScale(
                    flipped, scaleFactor=1.05, minNeighbors=4, minSize=(60, 60)
                )
                if len(found) > 0:
                    faces = found.tolist()
                    break

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

        body_detected = False
        if not unique and not self.upper_body_cascade.empty():
            bodies = self.upper_body_cascade.detectMultiScale(
                gc, scaleFactor=1.05, minNeighbors=3, minSize=(60, 60)
            )
            body_detected = len(bodies) > 0

        return unique, body_detected

    # ── Gaze ──────────────────────────────────────────────────────────────

    def check_gaze_away(self, image, face_rect):
        try:
            gc = self._gray_clahe(image)
            fx, fy, fw, fh = face_rect
            roi = gc[fy: fy + int(fh * 0.55), fx: fx + fw]
            eyes = self.eye_cascade.detectMultiScale(
                roi, scaleFactor=1.1, minNeighbors=3, minSize=(15, 15)
            )
            if len(eyes) == 0:
                return True
            for ex, ey, ew, eh in eyes:
                cx = (ex + ew / 2) / fw
                if 0.15 < cx < 0.85:
                    return False
            return True
        except Exception:
            return False

    # ── Phone detection ───────────────────────────────────────────────────

    def detect_phone(self, image):
        try:
            h, w = image.shape[:2]
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)

            thresh = cv2.adaptiveThreshold(
                blurred, 255,
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
            edges = cv2.Canny(blurred, 30, 100)
            combined = cv2.bitwise_or(thresh, edges)

            contours, _ = cv2.findContours(
                combined, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            frame_area = h * w
            for cnt in contours:
                area = cv2.contourArea(cnt)
                if area < frame_area * 0.015 or area > frame_area * 0.20:
                    continue
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.03 * peri, True)
                if len(approx) == 4:
                    x, y, cw, ch = cv2.boundingRect(approx)
                    long_side = max(cw, ch)
                    short_side = max(min(cw, ch), 1)
                    aspect = long_side / short_side
                    if 1.5 < aspect < 2.5:
                        if cw < w * 0.85 and ch < h * 0.85:
                            print(f"[PY] Phone candidate: area={area:.0f} aspect={aspect:.2f} rect={cw}x{ch}", file=sys.stderr)
                            return True
        except Exception as exc:
            print(f"Phone detect error: {exc}", file=sys.stderr)
        return False

    # ── Identity ──────────────────────────────────────────────────────────

    def _extract_face_signature(self, image):
        gc = self._gray_clahe(image)
        ge = self._gray_eq(image)
        faces = []
        for gray in (gc, ge):
            found = self.face_cascade.detectMultiScale(
                gray, scaleFactor=1.05, minNeighbors=4,
                minSize=(60, 60), flags=cv2.CASCADE_SCALE_IMAGE
            )
            if len(found) > 0:
                faces = found
                break
        if len(faces) == 0:
            return None
        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
        roi = gc[y: y + h, x: x + w]
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
        self.reference_face_signature = result[0]
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
        }

    # ── Audio ─────────────────────────────────────────────────────────────

    def analyze_audio(self, energy, now):
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
                    "description": f"Continuous speech detected for {int(now - self.speech_start)}s — possible communication with others",
                    "confidence": 0.74,
                    "severity": "MEDIUM",
                    "timestamp": self._iso(),
                })
                self.speech_alerted_at = now
                self.speech_start = now
        else:
            self.speech_start = None
        return alerts

    # ── Main analysis ─────────────────────────────────────────────────────

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

            # ── No face ───────────────────────────────────────────────────
            if face_count == 0:
                if self.no_face_start is None:
                    self.no_face_start = now
                    print("[PY] No face timer started", file=sys.stderr)
                else:
                    absent_for = now - self.no_face_start
                    print(f"[PY] No face for {absent_for:.1f}s / threshold={self.no_face_threshold}s", file=sys.stderr)
                    if (
                        absent_for >= self.no_face_threshold
                        and now - self.no_face_alerted_at > self.no_face_cooldown
                    ):
                        desc = "Face not visible — please look at the camera" if body_detected else "No face detected in frame for over 10 seconds"
                        alerts.append({
                            "alertType": "NO_FACE",
                            "description": desc,
                            "confidence": 0.85,
                            "severity": "MEDIUM",
                            "timestamp": self._iso(),
                        })
                        self.no_face_alerted_at = now
            else:
                if self.no_face_start is not None:
                    print(f"[PY] Face returned after {now - self.no_face_start:.1f}s", file=sys.stderr)
                self.no_face_start = None

            # ── Multiple faces ────────────────────────────────────────────
            if face_count > 1:
                if self.multi_face_start is None:
                    self.multi_face_start = now
                    print("[PY] Multiple faces timer started", file=sys.stderr)
                else:
                    present_for = now - self.multi_face_start
                    print(f"[PY] Multiple faces for {present_for:.1f}s / threshold={self.multi_face_threshold}s", file=sys.stderr)
                    if (
                        present_for >= self.multi_face_threshold
                        and now - self.multi_face_alerted_at > self.multi_face_cooldown
                    ):
                        alerts.append({
                            "alertType": "MULTIPLE_FACES",
                            "description": f"{face_count} faces detected for over 5 seconds — another person may be assisting",
                            "confidence": 0.88,
                            "severity": "HIGH",
                            "timestamp": self._iso(),
                        })
                        self.multi_face_alerted_at = now
                        self.multi_face_start = now
            else:
                self.multi_face_start = None

            # ── Gaze deviation ────────────────────────────────────────────
            if face_count == 1:
                looking_away = self.check_gaze_away(image, faces[0])
                print(f"[PY] gaze_away={looking_away}", file=sys.stderr)
                if looking_away:
                    if self.gaze_away_start is None:
                        self.gaze_away_start = now
                    else:
                        away_for = now - self.gaze_away_start
                        print(f"[PY] Gaze away for {away_for:.1f}s / threshold={self.gaze_away_threshold}s", file=sys.stderr)
                        if (
                            away_for >= self.gaze_away_threshold
                            and now - self.gaze_alerted_at > self.gaze_alert_cooldown
                        ):
                            alerts.append({
                                "alertType": "GAZE_DEVIATION",
                                "description": "Student has been looking away from the screen for over 8 seconds",
                                "confidence": 0.70,
                                "severity": "LOW",
                                "timestamp": self._iso(),
                            })
                            self.gaze_alerted_at = now
                            self.gaze_away_start = now
                else:
                    self.gaze_away_start = None
            else:
                self.gaze_away_start = None

            # ── Phone detection ───────────────────────────────────────────
            if self.detect_phone(image):
                self.phone_consecutive += 1
                print(f"[PY] Phone consecutive={self.phone_consecutive}/{self.phone_consecutive_threshold}", file=sys.stderr)
                if (
                    self.phone_consecutive >= self.phone_consecutive_threshold
                    and now - self.phone_alerted_at > self.phone_alert_cooldown
                ):
                    alerts.append({
                        "alertType": "PHONE_DETECTED",
                        "description": "Mobile phone detected in frame — please remove unauthorized devices",
                        "confidence": 0.75,
                        "severity": "HIGH",
                        "timestamp": self._iso(),
                    })
                    self.phone_alerted_at = now
                    self.phone_consecutive = 0
            else:
                self.phone_consecutive = max(0, self.phone_consecutive - 1)

            # ── Identity check ────────────────────────────────────────────
            identity_result = self.compare_identity(image)
            identity_verified = None
            identity_similarity = None
            if identity_result is not None:
                identity_similarity = identity_result["similarity"]
                identity_verified = identity_result["matches"]
                if (
                    not identity_result["matches"]
                    and now - self.identity_alerted_at > self.identity_alert_cooldown
                ):
                    alerts.append({
                        "alertType": "IDENTITY_MISMATCH",
                        "description": f"Face does not match registered student (similarity {identity_similarity:.0%})",
                        "confidence": round(1 - identity_similarity, 2),
                        "severity": "HIGH",
                        "timestamp": self._iso(),
                    })
                    self.identity_alerted_at = now

            # ── Audio ─────────────────────────────────────────────────────
            audio_energy = frame_data.get("audioEnergy")
            if audio_energy is not None:
                alerts.extend(self.analyze_audio(float(audio_energy), now))

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
