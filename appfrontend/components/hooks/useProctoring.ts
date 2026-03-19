import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface ProctoringAlert {
  id: string;
  alertType: string;
  description: string;
  confidence: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  timestamp: string;
}

interface UseProctoringProps {
  meetingId: string;
  userId?: string;
  isVideoEnabled?: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  localVideoTrack?: any;  // LiveKit LocalTrack — used as reliable "camera is live" signal
  room?: any;
  userInfo?: any;
  electronAvailable?: boolean;
}

const BACKEND_URL = "http://localhost:4000";
const PYTHON_URL = "http://localhost:8000";

export function useProctoring({
  meetingId,
  userId,
  isVideoEnabled,
  localVideoRef,
  localVideoTrack,
  room,
  userInfo,
  electronAvailable = typeof window !== "undefined" && !!window.electronAPI,
}: UseProctoringProps) {
  const [alerts, setAlerts] = useState<ProctoringAlert[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState("Camera disabled");
  const [identityStatus, setIdentityStatus] = useState<"unknown" | "verified" | "mismatch" | "no_ref">("no_ref");
  const [identitySimilarity, setIdentitySimilarity] = useState<number | null>(null);
  const referenceLoadedRef = useRef(false);
  const mismatchStreakRef = useRef(0);

  // Stable refs — never cause useEffect re-runs
  const frameIntervalRef = useRef<NodeJS.Timeout>();
  const analysisListenerSet = useRef(false);
  const sessionCreated = useRef(false);
  const isBusyRef = useRef(false);
  const participantIdRef = useRef(userId || `participant-${Date.now()}`);
  const pythonAvailableRef = useRef<boolean | null>(null);
  const lastFrameRef = useRef<string | null>(null);
  const dedupeRef = useRef<Set<string>>(new Set());
  const browserActivityCooldownRef = useRef<Record<string, number>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Stable function refs — interval callbacks read these so they never go stale
  const sendFrameToElectronRef = useRef<() => Promise<void>>();
  const captureAndAnalyzeRef = useRef<() => Promise<void>>();

  // Keep latest values in refs so interval callbacks never go stale
  const meetingIdRef = useRef(meetingId);
  const userIdRef = useRef(userId);
  const isVideoEnabledRef = useRef(isVideoEnabled);
  const electronAvailableRef = useRef(electronAvailable);
  const resolvedStudentNameRef = useRef("");
  const localVideoTrackRef = useRef(localVideoTrack);

  useEffect(() => { meetingIdRef.current = meetingId; }, [meetingId]);
  useEffect(() => { userIdRef.current = userId; if (userId) participantIdRef.current = userId; }, [userId]);
  useEffect(() => { isVideoEnabledRef.current = isVideoEnabled; }, [isVideoEnabled]);
  useEffect(() => { electronAvailableRef.current = electronAvailable; }, [electronAvailable]);
  useEffect(() => { localVideoTrackRef.current = localVideoTrack; }, [localVideoTrack]);

  useEffect(() => {
    resolvedStudentNameRef.current =
      userInfo?.fullName ||
      userInfo?.fullname ||
      [userInfo?.firstName, userInfo?.lastName].filter(Boolean).join(" ").trim() ||
      "Student";
  }, [userInfo]);

  // ── Wire Electron debug logs → browser console (once) ────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI?.onDebugLog) return;
    window.electronAPI.onDebugLog((msg: string) => console.log(msg));
    // Signal main process that renderer is ready — flushes buffered logs
    window.electronAPI.rendererReady?.();
  }, []);

  // ── Audio energy via real AudioContext analyser ──────────────────────────
  const startAudioCapture = useCallback(async () => {
    try {
      if (audioContextRef.current) return; // already running
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      audioStreamRef.current = stream;
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      audioSourceRef.current = source;
    } catch {
      // mic not available — energy will be 0
    }
  }, []);

  const stopAudioCapture = useCallback(() => {
    try {
      audioSourceRef.current?.disconnect();
      audioContextRef.current?.close();
      audioStreamRef.current?.getTracks().forEach(t => t.stop());
    } catch {}
    audioContextRef.current = null;
    analyserRef.current = null;
    audioSourceRef.current = null;
    audioStreamRef.current = null;
  }, []);

  const getAudioEnergy = useCallback((): number => {
    if (!analyserRef.current) return 0;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const avg = data.reduce((s, v) => s + v, 0) / data.length;
    return avg / 255;
  }, []);

  // ── Deduped alert adder ──────────────────────────────────────────────────
  const addAlert = useCallback((alert: Omit<ProctoringAlert, "id">) => {
    const key = [
      alert.alertType,
      alert.severity,
      Math.round((alert.confidence || 0) * 100),
      Math.floor(new Date(alert.timestamp).getTime() / 60000),
    ].join(":");
    if (dedupeRef.current.has(key)) return;
    dedupeRef.current.add(key);
    const newAlert: ProctoringAlert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    setAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
    // Sonner toast so student sees it immediately
    const toastFn = (alert.severity === "CRITICAL" || alert.severity === "HIGH") ? toast.error : toast.warning;
    toastFn(alert.alertType.replace(/_/g, " "), { description: alert.description, duration: 5000 });
  }, []);

  // ── Session management ───────────────────────────────────────────────────
  const createSession = useCallback(async () => {
    const mid = meetingIdRef.current;
    const uid = userIdRef.current;
    if (!mid || !uid || sessionCreated.current) return;
    try {
      await fetch(`${BACKEND_URL}/proctoring/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: mid,
          participantId: participantIdRef.current,
          userId: uid,
          studentName: resolvedStudentNameRef.current,
          startedAt: new Date().toISOString(),
        }),
      });
      sessionCreated.current = true;
    } catch {}
  }, []);

  const markSessionLeft = useCallback(() => {
    const mid = meetingIdRef.current;
    const uid = userIdRef.current;
    if (!mid || !uid || !sessionCreated.current) return;
    const body = JSON.stringify({
      meetingId: mid,
      participantId: participantIdRef.current,
      userId: uid,
      detections: {},
      browserData: { participantLeft: true },
    });
    navigator.sendBeacon
      ? navigator.sendBeacon(`${BACKEND_URL}/proctoring/analyze-frame`, new Blob([body], { type: "application/json" }))
      : fetch(`${BACKEND_URL}/proctoring/analyze-frame`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
    sessionCreated.current = false;
  }, []);

  // ── Send alerts to backend ───────────────────────────────────────────────
  const sendAlertsToBackend = useCallback(async (
    detectedAlerts: Array<Record<string, any>>,
    detections: Record<string, unknown>,
    browserData: Record<string, unknown> = {},
  ) => {
    const mid = meetingIdRef.current;
    const uid = userIdRef.current;
    if (!mid || !uid) return;

    const base = {
      meetingId: mid,
      participantId: participantIdRef.current,
      userId: uid,
      detections,
      frameSnapshot: lastFrameRef.current,
    };

    const bData = {
      tabSwitch: !!browserData.tabSwitch,
      windowSwitch: !!browserData.windowSwitch,
      copyPaste: !!browserData.copyPaste,
      automatedDetection: !!browserData.automatedDetection,
      participantLeft: !!browserData.participantLeft,
      frameAnalysis: !!browserData.frameAnalysis,
      alertType: typeof browserData.alertType === "string" ? browserData.alertType : undefined,
      description: typeof browserData.description === "string" ? browserData.description : undefined,
      confidence: typeof browserData.confidence === "number" ? browserData.confidence : undefined,
      severity: typeof browserData.severity === "string" ? browserData.severity : undefined,
      timestamp: typeof browserData.timestamp === "string" ? browserData.timestamp : undefined,
      activityType: typeof browserData.activityType === "string" ? browserData.activityType : undefined,
    };

    if (detectedAlerts.length === 0) {
      fetch(`${BACKEND_URL}/proctoring/analyze-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...base, browserData: { ...bData, frameAnalysis: true } }),
      }).catch(() => {});
      return;
    }

    for (const alert of detectedAlerts) {
      fetch(`${BACKEND_URL}/proctoring/analyze-frame`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...base,
          browserData: {
            ...bData,
            automatedDetection: true,
            alertType: alert.alertType,
            description: alert.description,
            confidence: alert.confidence,
            severity: alert.severity,
            timestamp: alert.timestamp || new Date().toISOString(),
          },
        }),
      }).catch(() => {});
    }
  }, []);

  // ── Frame capture ────────────────────────────────────────────────────────
  const captureFrame = useCallback((width = 320, height = 240): string | null => {
    const video = localVideoRef.current;
    if (!video) return null;
    // Use intrinsic dims if available, else fall back to layout size
    const srcW = video.videoWidth || video.offsetWidth || width;
    const srcH = video.videoHeight || video.offsetHeight || height;
    if (srcW === 0 || srcH === 0) return null;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(video, 0, 0, width, height);
    } catch {
      return null;
    }
    const frame = canvas.toDataURL("image/jpeg", 0.6);
    lastFrameRef.current = frame;
    return frame;
  }, [localVideoRef]);

  // ── ELECTRON PATH: send frame → IPC → Python worker → IPC → callback ────
  const sendFrameToElectron = useCallback(async () => {
    if (!localVideoRef.current) {
      console.warn("[Proctor] sendFrameToElectron: no video element");
      return;
    }
    const v = localVideoRef.current;
    // Use 640x480 so YOLO can detect phones reliably (320x240 is too small)
    const imageData = captureFrame(640, 480);
    if (!imageData) {
      console.warn("[Proctor] captureFrame returned null — skipping frame");
      return;
    }
    console.debug(`[Proctor] sending frame to Electron IPC, size=${imageData.length}`);
    try {
      const result = await window.electronAPI.sendVideoFrame({
        imageData,
        audioEnergy: getAudioEnergy(),
        timestamp: Date.now(),
        meetingId: meetingIdRef.current,
        userId: userIdRef.current,
        participantId: participantIdRef.current,
      });
      console.debug(`[Proctor] IPC send-video-frame result: ${result}`);
    } catch (e) {
      console.error("[Proctor] sendVideoFrame IPC failed:", e);
    }
  }, [captureFrame, getAudioEnergy, localVideoRef]);

  // assign synchronously during render so interval callbacks are never stale
  sendFrameToElectronRef.current = sendFrameToElectron;

  // keep ref current so setInterval never captures a stale closure
  useEffect(() => { sendFrameToElectronRef.current = sendFrameToElectron; }, [sendFrameToElectron]);

  // ── Load reference face from profilePic URL or capture from live video ──
  const loadReferenceFace = useCallback(async (uid: string) => {
    if (referenceLoadedRef.current) return;
    if (!electronAvailableRef.current) return;

    // Always capture from live video — profilePic has different lighting/compression
    console.log('[Proctor] Capturing reference face from live video');
    let attempts = 0;
    const tryCapture = () => {
      attempts++;
      const frame = captureFrame(640, 480);
      if (!frame) {
        if (attempts < 10) setTimeout(tryCapture, 1000);
        return;
      }
      window.electronAPI.loadReferenceFace(frame, uid)
        .catch((e: any) => {
          if (attempts < 8) setTimeout(tryCapture, 1500);
          else console.warn('[Proctor] live capture reference failed:', e);
        });
    };
    setTimeout(tryCapture, 2500);
  }, [captureFrame, userInfo]);

  const lastNoFaceToastRef = useRef(0);

  // Called by main.js → preload → onProctoringAnalysis
  const handleElectronAnalysis = useCallback((analysis: any) => {
    console.log("[Proctor] handleElectronAnalysis received:", JSON.stringify(analysis));
    if (analysis.status && !Array.isArray(analysis.alerts)) {
      if (analysis.status === 'REFERENCE_FACE_LOADED') {
        if (analysis.success) {
          referenceLoadedRef.current = true;
          setIdentityStatus('unknown');
          console.log('[Proctor] Reference face confirmed loaded');
        } else {
          // Python rejected frame (blank/no face) — retry after 2s
          console.warn('[Proctor] Reference face rejected by Python — retrying in 2s');
          referenceLoadedRef.current = false;
          setTimeout(() => {
            const uid = userIdRef.current;
            if (uid) {
              const frame = captureFrame(640, 480);
              if (frame) window.electronAPI.loadReferenceFace(frame, uid).catch(() => {});
            }
          }, 2000);
        }
      }
      return;
    }

    const electronAlerts: any[] = Array.isArray(analysis.alerts) ? analysis.alerts : [];

    electronAlerts.forEach((alert: any) =>
      addAlert({
        alertType: alert.alertType,
        description: alert.description,
        confidence: alert.confidence ?? 0.8,
        severity: alert.severity || "MEDIUM",
        timestamp: alert.timestamp || new Date().toISOString(),
      }),
    );

    if (analysis.faceDetected !== undefined) {
      const faceStatus = analysis.faceCount > 1
        ? `${analysis.faceCount} faces detected ⚠️`
        : analysis.faceDetected
          ? "Face detected ✓"
          : "No face detected";
      setFaceDetectionStatus(faceStatus);
      if (!analysis.faceDetected) {
        const now = Date.now();
        if (now - lastNoFaceToastRef.current > 10000) {
          lastNoFaceToastRef.current = now;
          toast.warning("Face not visible", { description: "Please ensure your face is clearly visible to the camera.", duration: 4000 });
        }
      }
    }

    // Update identity status from Python result
    if (analysis.identityVerified === true) {
      setIdentityStatus('verified');
      setIdentitySimilarity(analysis.identitySimilarity ?? null);
      mismatchStreakRef.current = 0;
    } else if (analysis.identityVerified === false) {
      setIdentityStatus('mismatch');
      setIdentitySimilarity(analysis.identitySimilarity ?? null);
      mismatchStreakRef.current += 1;
    } else {
      // identityVerified === null means Python is still building streak
      // Reset UI back to 'unknown' so mismatch doesn't stay stuck
      if (referenceLoadedRef.current) setIdentityStatus('unknown');
      mismatchStreakRef.current = 0;
    }

    void sendAlertsToBackend(electronAlerts, {
      faceDetected: analysis.faceDetected,
      faceCount: analysis.faceCount,
      identityVerified: analysis.identityVerified,
      phoneDetected: electronAlerts.some((a: any) => a.alertType === "PHONE_DETECTED"),
    });
  }, [addAlert, sendAlertsToBackend]);

  // ── BROWSER PATH: send frame → Python HTTP ───────────────────────────────
  const captureAndAnalyze = useCallback(async () => {
    if (isBusyRef.current || !localVideoRef.current) return;
    const v = localVideoRef.current;
    console.debug(`[Proctor] browser captureAndAnalyze: readyState=${v.readyState} videoW=${v.videoWidth} offsetW=${v.offsetWidth} paused=${v.paused}`);
    const imageData = captureFrame(320, 240);
    if (!imageData) {
      console.warn("[Proctor] captureFrame null — video not ready");
      return;
    }
    console.debug(`[Proctor] frame captured size=${imageData.length}, sending to Python HTTP`);
    isBusyRef.current = true;
    const audioEnergy = getAudioEnergy();

    if (pythonAvailableRef.current === null) {
      console.log("[Proctor] checking Python health at", PYTHON_URL);
      try {
        const r = await fetch(`${PYTHON_URL}/health`, { signal: AbortSignal.timeout(2000) });
        pythonAvailableRef.current = r.ok;
        console.log(`[Proctor] Python health: ${r.ok ? 'OK' : 'FAIL'} (${r.status})`);
      } catch (e) {
        pythonAvailableRef.current = false;
        console.warn("[Proctor] Python health check failed:", e);
      }
    }

    if (pythonAvailableRef.current) {
      try {
        const res = await fetch(`${PYTHON_URL}/analyze-frame`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData,
            audioEnergy,
            participantId: participantIdRef.current,
            meetingId: meetingIdRef.current,
            userId: userIdRef.current,
            timestamp: Date.now(),
          }),
          signal: AbortSignal.timeout(3000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const analysis = await res.json();
        console.log(`[Proctor] Python response: faces=${analysis.faceCount} faceDetected=${analysis.faceDetected} alerts=${JSON.stringify(analysis.alerts)}`);
        const pyAlerts: any[] = Array.isArray(analysis.alerts) ? analysis.alerts : [];

        const faceStatus = analysis.faceCount > 1
          ? `${analysis.faceCount} faces detected`
          : analysis.faceDetected
            ? "Face detected ✓"
            : "No face detected";
        setFaceDetectionStatus(faceStatus);
        if (!analysis.faceDetected) {
          toast.warning("Face not visible", { description: "Please ensure your face is clearly visible to the camera.", duration: 4000 });
        }

        pyAlerts.forEach(alert => addAlert({
          alertType: alert.alertType,
          description: alert.description,
          confidence: alert.confidence ?? 0.8,
          severity: alert.severity || "MEDIUM",
          timestamp: alert.timestamp || new Date().toISOString(),
        }));

        await sendAlertsToBackend(pyAlerts, {
          faceDetected: analysis.faceDetected,
          faceCount: analysis.faceCount,
          phoneDetected: pyAlerts.some(a => a.alertType === "PHONE_DETECTED"),
        });
        return;
      } catch (e) {
        console.warn("Python analysis failed:", e);
        pythonAvailableRef.current = false;
      } finally {
        isBusyRef.current = false;
      }
    }

    // Fallback: brightness check only
    setFaceDetectionStatus("Monitoring active (basic)");
    isBusyRef.current = false;
    await sendAlertsToBackend([], {}, { frameAnalysis: true });
  }, [addAlert, captureFrame, getAudioEnergy, localVideoRef, sendAlertsToBackend]);

  // assign synchronously during render
  captureAndAnalyzeRef.current = captureAndAnalyze;

  // keep ref current
  useEffect(() => { captureAndAnalyzeRef.current = captureAndAnalyze; }, [captureAndAnalyze]);

  // ── Browser activity monitoring ──────────────────────────────────────────
  const reportBrowserActivity = useCallback(async (
    activityType: "COPY_PASTE" | "TAB_SWITCH" | "WINDOW_SWITCH",
  ) => {
    const now = Date.now();
    const last = browserActivityCooldownRef.current[activityType] || 0;
    if (now - last < 3000) return;
    browserActivityCooldownRef.current[activityType] = now;

    const alert = {
      alertType: activityType,
      description:
        activityType === "COPY_PASTE" ? "Copy or paste activity detected"
        : activityType === "TAB_SWITCH" ? "Tab switch detected during proctoring"
        : "Window focus lost during proctoring",
      confidence: 0.9,
      severity: (activityType === "WINDOW_SWITCH" ? "HIGH" : "MEDIUM") as "HIGH" | "MEDIUM",
      timestamp: new Date().toISOString(),
    };
    addAlert(alert);
    await sendAlertsToBackend([], {}, {
      copyPaste: activityType === "COPY_PASTE",
      tabSwitch: activityType === "TAB_SWITCH",
      windowSwitch: activityType === "WINDOW_SWITCH",
      activityType,
    });
  }, [addAlert, sendAlertsToBackend]);

  const isStoppedRef = useRef(false);

  // ── Start / Stop ─────────────────────────────────────────────────────────
  const startProctoring = useCallback(async () => {
    const uid = userIdRef.current;
    console.log(`[Proctor] startProctoring called: uid=${uid} electronAvailable=${electronAvailableRef.current} localVideoTrack=${!!localVideoTrackRef.current} isVideoEnabled=${isVideoEnabledRef.current}`);
    if (!uid) {
      console.warn("[Proctor] startProctoring aborted: no userId");
      return;
    }

    setIsActive(true);
    setFaceDetectionStatus("Starting proctoring...");
    await createSession();
    await startAudioCapture();

    if (electronAvailableRef.current) {
      // Register listener ONCE
      if (!analysisListenerSet.current) {
        window.electronAPI.onProctoringAnalysis(handleElectronAnalysis);
        analysisListenerSet.current = true;
      }

      // Load reference face (profilePic URL or live video capture)
      await loadReferenceFace(uid);

      // Start proctoring session in Electron (kiosk mode etc.)
      try {
        await window.electronAPI.startProctoring({
          meetingId: meetingIdRef.current,
          userId: uid,
          participantId: participantIdRef.current,
          studentName: resolvedStudentNameRef.current,
        });
      } catch (e) {
        console.error("startProctoring IPC failed:", e);
      }

      // Poll until video element exists in DOM AND has data
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      isStoppedRef.current = false;
      let pollCount = 0;
      const startFrameLoop = () => {
        if (isStoppedRef.current) return; // meeting ended while polling
        const v = localVideoRef.current;
        if (!v) {
          pollCount++;
          frameIntervalRef.current = setTimeout(startFrameLoop, 300) as any;
          return;
        }
        const ready = v.videoWidth > 0 || v.readyState >= 2;
        pollCount++;
        if (ready) {
          frameIntervalRef.current = setInterval(() => {
            if (!isStoppedRef.current) sendFrameToElectronRef.current?.();
          }, 1000);
          setFaceDetectionStatus("Monitoring active (Electron)");
        } else {
          frameIntervalRef.current = setTimeout(startFrameLoop, 500) as any;
        }
      };
      startFrameLoop();
    } else {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      const startBrowserLoop = () => {
        const v = localVideoRef.current;
        if (!v) {
          frameIntervalRef.current = setTimeout(startBrowserLoop, 300) as any;
          return;
        }
        const ready = v.videoWidth > 0 || v.readyState >= 2;
        console.log(`[Proctor] startBrowserLoop check: videoW=${v.videoWidth} readyState=${v.readyState} ready=${ready}`);
        if (ready) {
          frameIntervalRef.current = setInterval(() => captureAndAnalyzeRef.current?.(), 1500);
          setFaceDetectionStatus("Monitoring active (browser)");
        } else {
          frameIntervalRef.current = setTimeout(startBrowserLoop, 500) as any;
        }
      };
      startBrowserLoop();
    }
  }, [createSession, handleElectronAnalysis, startAudioCapture, userInfo]);

  const stopProctoring = useCallback(() => {
    isStoppedRef.current = true;
    setIsActive(false);
    setFaceDetectionStatus("Camera disabled");
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      clearTimeout(frameIntervalRef.current);
      frameIntervalRef.current = undefined;
    }
    stopAudioCapture();
    markSessionLeft();
    if (electronAvailableRef.current) {
      try { window.electronAPI.stopProctoring(); } catch {}
    }
  }, [markSessionLeft, stopAudioCapture]);

  // ── Lifecycle ────────────────────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("beforeunload", markSessionLeft);
    return () => window.removeEventListener("beforeunload", markSessionLeft);
  }, [markSessionLeft]);

  // Browser activity listeners — only when active
  useEffect(() => {
    if (!isActive || !userIdRef.current) return;
    const onVisibility = () => { if (document.hidden) void reportBrowserActivity("TAB_SWITCH"); };
    const onBlur = () => void reportBrowserActivity("WINDOW_SWITCH");
    const onClipboard = () => void reportBrowserActivity("COPY_PASTE");
    const onKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x"].includes(e.key.toLowerCase()))
        void reportBrowserActivity("COPY_PASTE");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("paste", onClipboard);
    document.addEventListener("cut", onClipboard);
    window.addEventListener("keydown", onKeydown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("paste", onClipboard);
      document.removeEventListener("cut", onClipboard);
      window.removeEventListener("keydown", onKeydown);
    };
  }, [isActive, reportBrowserActivity]);

  // Start proctoring when camera is live. In Electron, also register kiosk on first start.
  // Guard with isActive ref so re-renders don't restart the loop.
  const isProctoringStartedRef = useRef(false);

  useEffect(() => {
    const cameraReady = !!localVideoTrack || !!isVideoEnabled;
    console.log(`[Proctor] lifecycle useEffect: electronAvailable=${electronAvailable} localVideoTrack=${!!localVideoTrack} isVideoEnabled=${isVideoEnabled} userId=${userId} cameraReady=${cameraReady} started=${isProctoringStartedRef.current}`);

    if (!userId || !cameraReady) return;
    if (isProctoringStartedRef.current) return; // already running — don't restart on re-render

    isProctoringStartedRef.current = true;
    void startProctoring();

    return () => {
      isProctoringStartedRef.current = false;
      stopProctoring();
      if (analysisListenerSet.current && typeof window !== "undefined" && window.electronAPI?.removeAllListeners) {
        window.electronAPI.removeAllListeners("proctoring-analysis");
        analysisListenerSet.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localVideoTrack, isVideoEnabled, userId]);

  return { alerts, isActive, faceDetectionStatus, identityStatus, identitySimilarity, addAlert, stopProctoring };
}
