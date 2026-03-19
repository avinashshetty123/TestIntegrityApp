import base64
import json
import os
import sys
import time
import urllib.request
from collections import deque

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

import cv2
import numpy as np

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


# ── Constants ─────────────────────────────────────────────────────────────
FACE_SF       = 1.05
FACE_MIN_N    = 4
FACE_MIN_SIZE = 60
NMS_COVER     = 0.30
SIZE_RATIO    = 0.50

# Identity: NCC on CLAHE-equalised face crops at 3 scales
# Webcam-to-webcam same person: 0.40-0.80 | different person: 0.05-0.25
IDENT_THRESHOLD         = 0.30   # conservative — avoids false mismatch
IDENTITY_CONFIRM_FRAMES = 6      # consecutive mismatches before alerting
IDENT_MATCH_FRAMES      = 4      # consecutive matches before verified
IDENTITY_COOL           = 120.0
FACE_CHANGE_THRESH      = 0.15
REF_MIN_STD             = 5.0    # minimum pixel std for a valid reference crop

# Gaze — face-position based (eye cascade too unreliable on webcam)
# Alert when face center drifts outside center 40-60% of frame for sustained time
GAZE_CX_AWAY_MIN  = 0.25   # face center X below this = looking left
GAZE_CX_AWAY_MAX  = 0.75   # face center X above this = looking right
GAZE_CY_AWAY_MAX  = 0.30   # face center Y above this = looking up
GAZE_SIZE_MIN     = 0.08   # face area fraction below this = head turned away

SMOOTH_WIN = 5

NO_FACE_THRESH = 10.0;  NO_FACE_COOL  = 60.0
MULTI_THRESH   = 3.0;   MULTI_COOL    = 60.0
GAZE_THRESH    = 5.0;   GAZE_COOL     = 45.0
PHONE_FRAMES   = 2;     PHONE_COOL    = 30.0
SPEECH_THRESH  = 15.0;  SPEECH_COOL   = 90.0
SPEECH_ENERGY  = 0.10


def _iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"


def _preprocess(img):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return clahe.apply(gray)


def _nms(rects, cover):
    if not rects:
        return []
    rects = sorted(rects, key=lambda r: r[2] * r[3], reverse=True)
    kept = []
    for r in rects:
        rx, ry, rw, rh = r
        skip = False
        for k in kept:
            kx, ky, kw, kh = k
            ix = max(0, min(rx + rw, kx + kw) - max(rx, kx))
            iy = max(0, min(ry + rh, ky + kh) - max(ry, ky))
            if rw * rh > 0 and (ix * iy) / (rw * rh) > cover:
                skip = True
                break
        if not skip:
            kept.append(r)
    return kept


def _filter_faces(rects):
    kept = _nms(rects, NMS_COVER)
    if not kept:
        return []
    max_area = kept[0][2] * kept[0][3]
    kept = [r for r in kept if r[2] * r[3] >= max_area * SIZE_RATIO]
    if len(kept) > 1:
        kept = _nms(kept, 0.15)
    return kept


class ProctoringAnalyzer:
    def __init__(self):
        print("[PY] Initializing...", file=sys.stderr)

        self.face_cc    = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        self.profile_cc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_profileface.xml")

        self.yolo = None
        if YOLO_AVAILABLE:
            try:
                try:
                    self.yolo = YOLO(os.path.join(SCRIPT_DIR, "yolov8s.pt"))
                    print("[PY] YOLO yolov8s loaded", file=sys.stderr)
                except Exception:
                    self.yolo = YOLO(os.path.join(SCRIPT_DIR, "yolov8n.pt"))
                    print("[PY] YOLO yolov8n loaded (fallback)", file=sys.stderr)
            except Exception as e:
                print(f"[PY] YOLO load failed: {e}", file=sys.stderr)

        # Identity
        self.ref_crops             = None   # list of crops at 3 scales
        self.ref_user_id           = None
        self.identity_alerted_at   = 0.0
        self.identity_miss_streak  = 0
        self.identity_match_streak = 0
        self.last_face_cx          = None

        # Face smoothing
        self.face_history = deque(maxlen=SMOOTH_WIN)

        # Gaze rolling majority
        self.gaze_away_history = deque(maxlen=5)

        # Timers
        self.no_face_start     = None;  self.no_face_alerted_at = 0.0
        self.multi_start       = None;  self.multi_alerted_at   = 0.0
        self.gaze_start        = None;  self.gaze_alerted_at    = 0.0
        self.phone_consecutive = 0;     self.phone_alerted_at   = 0.0
        self.speech_start      = None;  self.speech_alerted_at  = 0.0
        self.audio_history     = deque(maxlen=30)

        print("[PY] Ready", file=sys.stderr)

    # ── Image decode ──────────────────────────────────────────────────────

    def decode_image(self, b64: str):
        try:
            if b64.startswith("http://") or b64.startswith("https://"):
                with urllib.request.urlopen(b64, timeout=5) as r:
                    data = r.read()
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
            if w != 640:
                img = cv2.resize(img, (640, int(h * 640.0 / w)), interpolation=cv2.INTER_LINEAR)
            return img
        except Exception as e:
            print(f"[PY] decode error: {e}", file=sys.stderr)
            return None

    # ── Face detection ────────────────────────────────────────────────────

    def detect_faces(self, img):
        gray  = _preprocess(img)
        raw   = self.face_cc.detectMultiScale(gray, FACE_SF, FACE_MIN_N, minSize=(FACE_MIN_SIZE, FACE_MIN_SIZE))
        faces = _filter_faces(raw.tolist() if len(raw) > 0 else [])

        if not faces and not self.profile_cc.empty():
            for flip in (False, True):
                g  = cv2.flip(gray, 1) if flip else gray
                pf = self.profile_cc.detectMultiScale(g, FACE_SF, FACE_MIN_N, minSize=(FACE_MIN_SIZE, FACE_MIN_SIZE))
                if len(pf) > 0:
                    pf = pf.tolist()
                    if flip:
                        W  = gray.shape[1]
                        pf = [[W - x - w, y, w, h] for x, y, w, h in pf]
                    faces = _filter_faces(pf)
                    break

        raw_count = len(faces)
        self.face_history.append(raw_count)
        smoothed = int(np.median(list(self.face_history)))

        # display_count: what the UI shows
        # - If smoothed says 1, cap at 1 (single-frame spike of 2 is noise)
        # - If smoothed says >1, use smoothed (sustained multi-face)
        # - raw_count==0 always means no face (immediate)
        if raw_count == 0:
            display_count = 0
        elif smoothed <= 1:
            display_count = 1
        else:
            display_count = smoothed

        print(f"[PY] raw={len(raw) if hasattr(raw, '__len__') else 0} filtered={raw_count} smoothed={smoothed}", file=sys.stderr)
        return faces, raw_count, smoothed, display_count

    # ── Gaze detection ────────────────────────────────────────────────────

    def check_gaze_away(self, img, face_rect):
        """
        Face-position based gaze — reliable on any webcam without eye cascade.
        Away if:
          1. Face center X is outside 25-75% of frame width (looking left/right)
          2. Face center Y is in top 30% of frame (looking up)
          3. Face area is < 8% of frame area (head turned away / too small)
        Rolling majority over last 5 frames to avoid flicker.
        """
        try:
            h_img, w_img = img.shape[:2]
            fx, fy, fw, fh = face_rect

            cx = (fx + fw / 2) / max(w_img, 1)
            cy = (fy + fh / 2) / max(h_img, 1)
            face_area_frac = (fw * fh) / max(w_img * h_img, 1)

            away_lr   = cx < GAZE_CX_AWAY_MIN or cx > GAZE_CX_AWAY_MAX
            away_up   = cy < GAZE_CY_AWAY_MAX
            away_size = face_area_frac < GAZE_SIZE_MIN

            away_frame = away_lr or away_up or away_size

            print(
                f"[PY] gaze: cx={cx:.2f} cy={cy:.2f} area={face_area_frac:.3f} "
                f"lr={away_lr} up={away_up} size={away_size} away={away_frame}",
                file=sys.stderr,
            )

            self.gaze_away_history.append(away_frame)
            return sum(self.gaze_away_history) > len(self.gaze_away_history) / 2

        except Exception as e:
            print(f"[PY] gaze error: {e}", file=sys.stderr)
            return False

    # ── Phone detection ───────────────────────────────────────────────────

    def detect_phone(self, img):
        if self.yolo is None:
            return False
        try:
            h, w = img.shape[:2]
            # Always run at 640px for consistent detection
            img_yolo = cv2.resize(img, (640, int(h * 640.0 / w)), interpolation=cv2.INTER_LINEAR) if w != 640 else img
            results = self.yolo(img_yolo, conf=0.15, verbose=False)
            for result in results:
                if result.boxes is None:
                    continue
                for box in result.boxes:
                    cls  = int(box.cls[0])
                    conf = float(box.conf[0])
                    # 67=cell phone, 65=remote, 73=book, 63=laptop
                    if cls == 67 and conf >= 0.15:   # cell phone — primary
                        print(f"[PY] YOLO phone cls={cls} conf={conf:.2f}", file=sys.stderr)
                        return True
                    if cls == 65 and conf >= 0.20:   # remote control
                        print(f"[PY] YOLO remote cls={cls} conf={conf:.2f}", file=sys.stderr)
                        return True
        except Exception as e:
            print(f"[PY] YOLO error: {e}", file=sys.stderr)
        return False

    # ── Identity ─────────────────────────────────────────────────────────

    def _face_crop_at(self, gray, face_rect, size):
        """Return a normalised face crop at given size."""
        x, y, w, h = face_rect
        pad = int(min(w, h) * 0.10)
        x1 = max(0, x - pad);  y1 = max(0, y - pad)
        x2 = min(gray.shape[1], x + w + pad)
        y2 = min(gray.shape[0], y + h + pad)
        crop = gray[y1:y2, x1:x2]
        if crop.size == 0:
            return None
        crop = cv2.resize(crop, (size, size)).astype(np.float32)
        m, s = crop.mean(), crop.std()
        if s < REF_MIN_STD:
            return None  # blank/black frame — reject
        crop = (crop - m) / s
        return crop

    def _ncc(self, a, b):
        denom = np.linalg.norm(a) * np.linalg.norm(b)
        if denom == 0:
            return 0.0
        return float(np.sum(a * b) / denom)

    def _multi_scale_ncc(self, ref_crops, live_gray, face_rect):
        """Average NCC across 3 scales for robustness."""
        sizes = [32, 64, 96]
        scores = []
        for i, size in enumerate(sizes):
            if i >= len(ref_crops) or ref_crops[i] is None:
                continue
            crop = self._face_crop_at(live_gray, face_rect, size)
            if crop is None:
                continue
            scores.append(self._ncc(ref_crops[i], crop))
        if not scores:
            return 0.0
        return float(np.mean(scores))

    def load_reference_face(self, image_b64, user_id):
        img = self.decode_image(image_b64)
        if img is None:
            print("[PY] load_reference_face: decode failed", file=sys.stderr)
            return False
        gray = _preprocess(img)

        # Try progressively looser detection params
        raw = self.face_cc.detectMultiScale(gray, FACE_SF, FACE_MIN_N, minSize=(FACE_MIN_SIZE, FACE_MIN_SIZE))
        if len(raw) == 0:
            raw = self.face_cc.detectMultiScale(gray, 1.05, 3, minSize=(40, 40))
        if len(raw) == 0:
            raw = self.face_cc.detectMultiScale(gray, 1.1, 2, minSize=(30, 30))
        if len(raw) == 0:
            print("[PY] load_reference_face: no face found", file=sys.stderr)
            return False

        best = max(raw.tolist(), key=lambda r: r[2] * r[3])

        # Build multi-scale crops — reject if any scale is blank
        crops = []
        valid = True
        for size in [32, 64, 96]:
            c = self._face_crop_at(gray, best, size)
            if c is None:
                print(f"[PY] load_reference_face: blank crop at size={size} — frame not ready", file=sys.stderr)
                valid = False
                break
            crops.append(c)

        if not valid:
            return False

        self.ref_crops             = crops
        self.ref_user_id           = user_id
        self.identity_miss_streak  = 0
        self.identity_match_streak = 0
        self.identity_alerted_at   = 0.0
        self.last_face_cx          = None
        print(f"[PY] Reference face loaded (multi-scale NCC) for {user_id}, face={best}", file=sys.stderr)
        return True

    def _face_changed(self, img_w, face_rect):
        cx      = (face_rect[0] + face_rect[2] / 2) / max(img_w, 1)
        changed = self.last_face_cx is not None and abs(cx - self.last_face_cx) > FACE_CHANGE_THRESH
        self.last_face_cx = cx
        return changed

    def compare_identity(self, img, faces):
        if self.ref_crops is None or not faces:
            return None
        try:
            gray         = _preprocess(img)
            best         = max(faces, key=lambda r: r[2] * r[3])
            face_changed = self._face_changed(img.shape[1], best)

            sim = self._multi_scale_ncc(self.ref_crops, gray, best)
            sim = max(0.0, min(1.0, sim))

            if sim >= IDENT_THRESHOLD:
                self.identity_match_streak += 1
                self.identity_miss_streak   = 0
            else:
                self.identity_miss_streak  += 1
                self.identity_match_streak  = 0

            confirm_needed  = 2 if face_changed else IDENTITY_CONFIRM_FRAMES
            confirmed_mismatch = self.identity_miss_streak >= confirm_needed
            confirmed_match    = self.identity_match_streak >= IDENT_MATCH_FRAMES

            print(
                f"[PY] identity sim={sim:.4f} thresh={IDENT_THRESHOLD} "
                f"miss={self.identity_miss_streak} match={self.identity_match_streak} "
                f"changed={face_changed} mismatch={confirmed_mismatch} verified={confirmed_match}",
                file=sys.stderr,
            )

            if not confirmed_mismatch and not confirmed_match:
                return {"similarity": round(sim, 4), "matches": None}

            # Reset streaks after a confirmed result so next frames start fresh
            if confirmed_mismatch:
                self.identity_miss_streak = 0
            if confirmed_match:
                self.identity_match_streak = 0

            return {"similarity": round(sim, 4), "matches": not confirmed_mismatch}
        except Exception as e:
            print(f"[PY] identity error: {e}", file=sys.stderr)
            return None

    # ── Audio ─────────────────────────────────────────────────────────────

    def analyze_audio(self, energy, now):
        alerts = []
        self.audio_history.append(energy)
        if energy > SPEECH_ENERGY:
            if self.speech_start is None:
                self.speech_start = now
            elif now - self.speech_start > SPEECH_THRESH and now - self.speech_alerted_at > SPEECH_COOL:
                alerts.append({
                    "alertType": "SUSTAINED_SPEECH",
                    "description": f"Continuous speech for {int(now - self.speech_start)}s",
                    "confidence": 0.74, "severity": "MEDIUM", "timestamp": _iso(),
                })
                self.speech_alerted_at = now
                self.speech_start      = now
        else:
            self.speech_start = None
        return alerts

    # ── Main analysis ─────────────────────────────────────────────────────

    def analyze_frame(self, frame_data):
        try:
            img = self.decode_image(frame_data.get("imageData", ""))
            if img is None:
                return {"alerts": [], "faceDetected": False, "faceCount": 0}

            alerts = []
            now    = time.time()

            faces, raw_count, smoothed, display_count = self.detect_faces(img)

            # raw_count: present/absent (immediate)
            # display_count: what to show in UI (smoothed-corrected)
            # smoothed: for multi-face alert timer

            # ── No face ───────────────────────────────────────────────────
            if raw_count == 0:
                if self.no_face_start is None:
                    self.no_face_start = now
                else:
                    absent = now - self.no_face_start
                    if absent >= NO_FACE_THRESH and now - self.no_face_alerted_at > NO_FACE_COOL:
                        alerts.append({
                            "alertType": "NO_FACE",
                            "description": "No face detected — please look at the camera",
                            "confidence": 0.88, "severity": "MEDIUM", "timestamp": _iso(),
                        })
                        self.no_face_alerted_at = now
            else:
                self.no_face_start = None

            # ── Multiple faces ────────────────────────────────────────────
            if smoothed > 1:
                if self.multi_start is None:
                    self.multi_start = now
                else:
                    present = now - self.multi_start
                    print(f"[PY] multi_face smoothed={smoothed} {present:.0f}s/{MULTI_THRESH}s", file=sys.stderr)
                    if present >= MULTI_THRESH and now - self.multi_alerted_at > MULTI_COOL:
                        alerts.append({
                            "alertType": "MULTIPLE_FACES",
                            "description": f"{smoothed} faces detected — another person may be present",
                            "confidence": 0.90, "severity": "HIGH", "timestamp": _iso(),
                        })
                        self.multi_alerted_at = now
                        self.multi_start      = now
            else:
                self.multi_start = None

            # ── Gaze ──────────────────────────────────────────────────────
            if raw_count == 1 and len(faces) >= 1:
                away = self.check_gaze_away(img, faces[0])
                if away:
                    if self.gaze_start is None:
                        self.gaze_start = now
                    else:
                        t = now - self.gaze_start
                        print(f"[PY] gaze_away {t:.0f}s/{GAZE_THRESH}s", file=sys.stderr)
                        if t >= GAZE_THRESH and now - self.gaze_alerted_at > GAZE_COOL:
                            alerts.append({
                                "alertType": "GAZE_DEVIATION",
                                "description": f"Looking away from screen for {int(t)}s",
                                "confidence": 0.72, "severity": "MEDIUM", "timestamp": _iso(),
                            })
                            self.gaze_alerted_at = now
                            self.gaze_start      = now
                else:
                    self.gaze_start = None
            else:
                self.gaze_start = None

            # ── Phone ─────────────────────────────────────────────────────
            if self.detect_phone(img):
                self.phone_consecutive += 1
                print(f"[PY] phone {self.phone_consecutive}/{PHONE_FRAMES}", file=sys.stderr)
                if self.phone_consecutive >= PHONE_FRAMES and now - self.phone_alerted_at > PHONE_COOL:
                    alerts.append({
                        "alertType": "PHONE_DETECTED",
                        "description": "Mobile phone detected in frame",
                        "confidence": 0.88, "severity": "HIGH", "timestamp": _iso(),
                    })
                    self.phone_alerted_at  = now
                    self.phone_consecutive = 0
            else:
                self.phone_consecutive = max(0, self.phone_consecutive - 1)

            # ── Identity ──────────────────────────────────────────────────
            identity_result     = self.compare_identity(img, faces) if raw_count >= 1 and len(faces) >= 1 else None
            identity_verified   = None
            identity_similarity = None
            if identity_result is not None:
                identity_similarity = identity_result["similarity"]
                identity_verified   = identity_result["matches"]
                if identity_verified is False and now - self.identity_alerted_at > IDENTITY_COOL:
                    alerts.append({
                        "alertType": "IDENTITY_MISMATCH",
                        "description": f"Face does not match registered student (score {identity_similarity:.2f})",
                        "confidence": round(max(0.0, 1.0 - identity_similarity), 2),
                        "severity": "HIGH", "timestamp": _iso(),
                    })
                    self.identity_alerted_at = now

            # ── Audio ─────────────────────────────────────────────────────
            audio_energy = frame_data.get("audioEnergy")
            if audio_energy is not None:
                alerts.extend(self.analyze_audio(float(audio_energy), now))

            print(f"[PY] RESULT faceDetected={raw_count>0} raw={raw_count} smoothed={smoothed} alerts={len(alerts)}", file=sys.stderr)
            return {
                "alerts":             alerts,
                "faceDetected":       raw_count > 0,
                "faceCount":          display_count,
                "identityVerified":   identity_verified,
                "identitySimilarity": identity_similarity,
                "timestamp":          _iso(),
                "mode":               "yolo" if self.yolo else "cv2",
            }
        except Exception as e:
            import traceback
            print(f"[PY] analyze_frame error: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return {"alerts": [], "faceDetected": False, "faceCount": 0}


def main():
    analyzer = ProctoringAnalyzer()
    print(json.dumps({
        "status":    "READY",
        "mode":      "yolo" if analyzer.yolo else "cv2",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }))
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            t    = data.get("type")

            if t == "VIDEO_FRAME":
                fd     = data.get("data", {})
                result = analyzer.analyze_frame(fd)
                result.update({
                    "meetingId":     fd.get("meetingId"),
                    "userId":        fd.get("userId"),
                    "participantId": fd.get("participantId"),
                })
                print(json.dumps(result))
                sys.stdout.flush()

            elif t == "LOAD_REFERENCE_FACE":
                ok = analyzer.load_reference_face(data.get("imageUrl", ""), data.get("userId"))
                print(json.dumps({
                    "status":    "REFERENCE_FACE_LOADED",
                    "success":   ok,
                    "userId":    data.get("userId"),
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                }))
                sys.stdout.flush()

            elif t in ("START_PROCESSING", "STOP_PROCESSING"):
                s = "PROCESSING_STARTED" if t == "START_PROCESSING" else "PROCESSING_STOPPED"
                print(json.dumps({"status": s, "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}))
                sys.stdout.flush()

        except json.JSONDecodeError as e:
            print(f"[PY] JSON error: {e}", file=sys.stderr)
        except Exception as e:
            print(f"[PY] error: {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
