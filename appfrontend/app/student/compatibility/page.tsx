'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera, Mic, Wifi, Server, Shield, Monitor, Brain,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
  RefreshCw, Eye, Globe,
} from 'lucide-react';
import StudentNav from '@/components/StudentNav';

type Status = 'idle' | 'checking' | 'pass' | 'fail' | 'warn';

interface Check {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  status: Status;
  detail?: string;
  detected?: string[];
}

const BACKEND = 'http://localhost:4000';
const PYTHON  = 'http://localhost:8000';
const LIVEKIT = 'ws://localhost:7880';

function initialChecks(): Check[] {
  return [
    { id: 'backend',    label: 'Backend Server',      description: 'NestJS API at localhost:4000',               icon: <Server className="w-5 h-5" />,  status: 'idle' },
    { id: 'python',     label: 'Python AI Service',   description: 'Face/phone/gaze detection at localhost:8000', icon: <Brain className="w-5 h-5" />,   status: 'idle' },
    { id: 'livekit',    label: 'LiveKit Server',       description: 'Video conferencing at localhost:7880',        icon: <Wifi className="w-5 h-5" />,    status: 'idle' },
    { id: 'camera',     label: 'Camera',              description: 'Required for face detection & video',         icon: <Camera className="w-5 h-5" />,  status: 'idle' },
    { id: 'microphone', label: 'Microphone',          description: 'Required for speech detection',               icon: <Mic className="w-5 h-5" />,     status: 'idle' },
    { id: 'browser',    label: 'Browser APIs',        description: 'AudioContext, Canvas, WebSocket, sendBeacon', icon: <Globe className="w-5 h-5" />,   status: 'idle' },
    { id: 'electron',   label: 'Electron / Lockdown', description: 'Full kiosk mode for secure testing',          icon: <Monitor className="w-5 h-5" />, status: 'idle' },
    { id: 'facedetect', label: 'AI Face Detection',   description: 'Live frame analysis via Python service',      icon: <Eye className="w-5 h-5" />,     status: 'idle' },
  ];
}

function StatusBadge({ status }: { status: Status }) {
  const map: Record<Status, { label: string; cls: string }> = {
    idle:     { label: 'Not checked',  cls: 'bg-gray-100 text-gray-500' },
    checking: { label: 'Checking...', cls: 'bg-blue-100 text-blue-700' },
    pass:     { label: 'Pass',        cls: 'bg-green-100 text-green-700' },
    warn:     { label: 'Warning',     cls: 'bg-yellow-100 text-yellow-700' },
    fail:     { label: 'Fail',        cls: 'bg-red-100 text-red-700' },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function StatusIcon({ status }: { status: Status }) {
  const cls: Record<Status, string> = {
    idle: 'bg-gray-100', checking: 'bg-blue-100', pass: 'bg-green-100', warn: 'bg-yellow-100', fail: 'bg-red-100',
  };
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cls[status]}`}>
      {status === 'checking' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />}
      {status === 'pass'     && <CheckCircle2 className="w-5 h-5 text-green-600" />}
      {status === 'fail'     && <XCircle className="w-5 h-5 text-red-600" />}
      {status === 'warn'     && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
      {status === 'idle'     && <Shield className="w-5 h-5 text-gray-400" />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs py-1 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-800">{value}</span>
    </div>
  );
}

export default function ProctoringCompatibilityPage() {
  const router = useRouter();
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [checks,    setChecks]    = useState<Check[]>(initialChecks());
  const [running,   setRunning]   = useState(false);
  const [done,      setDone]      = useState(false);
  const [liveFrame, setLiveFrame] = useState<string | null>(null);
  const [faceResult,setFaceResult]= useState<any>(null);

  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()); }, []);

  const patch = useCallback((id: string, p: Partial<Check>) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, ...p } : c));
  }, []);

  const runChecks = useCallback(async () => {
    setRunning(true);
    setDone(false);
    setLiveFrame(null);
    setFaceResult(null);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setChecks(initialChecks().map(c => ({ ...c, status: 'checking' as Status })));

    // 1. Backend
    try {
      const r = await fetch(`${BACKEND}/user/profile`, { credentials: 'include', signal: AbortSignal.timeout(3000) });
      patch('backend', { status: r.ok ? 'pass' : 'warn', detail: r.ok ? 'Connected — backend is online' : `HTTP ${r.status} — check if backend is running` });
    } catch {
      patch('backend', { status: 'fail', detail: 'Cannot reach backend at localhost:4000 — start the NestJS server' });
    }

    // 2. Python AI
    let pythonOk = false;
    try {
      const r = await fetch(`${PYTHON}/health`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json().catch(() => ({}));
      pythonOk = r.ok;
      patch('python', { status: r.ok ? 'pass' : 'fail', detail: r.ok ? `Online — ${d.service ?? 'TestIntegrity AI'}` : 'Service unhealthy' });
    } catch {
      patch('python', { status: 'warn', detail: 'Not running — basic brightness monitoring only (start simple_main.py for full AI)' });
    }

    // 3. LiveKit
    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(LIVEKIT);
        const t = setTimeout(() => { ws.close(); reject(); }, 3000);
        ws.onopen  = () => { clearTimeout(t); ws.close(); resolve(); };
        ws.onerror = () => { clearTimeout(t); reject(); };
      });
      patch('livekit', { status: 'pass', detail: 'LiveKit server reachable at localhost:7880' });
    } catch {
      patch('livekit', { status: 'fail', detail: 'Cannot reach LiveKit at localhost:7880 — start the LiveKit server' });
    }

    // 4. Camera
    let cameraOk = false;
    let cameraStream: MediaStream | null = null;
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = cameraStream;
      if (videoRef.current) { videoRef.current.srcObject = cameraStream; await videoRef.current.play().catch(() => {}); }
      const track = cameraStream.getVideoTracks()[0];
      const s = track.getSettings();
      cameraOk = true;
      patch('camera', { status: 'pass', detail: `${s.width ?? '?'}×${s.height ?? '?'} @ ${s.frameRate?.toFixed(0) ?? '?'}fps — ${track.label}` });
    } catch (e: any) {
      patch('camera', { status: 'fail', detail: e.name === 'NotAllowedError' ? 'Permission denied — allow camera access in browser settings' : 'No camera found or camera in use by another app' });
    }

    // 5. Microphone
    let audioLevel = 0;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(audioStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      await new Promise(r => setTimeout(r, 800));
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      audioLevel = data.reduce((s, v) => s + v, 0) / data.length / 255;
      audioStream.getTracks().forEach(t => t.stop());
      ctx.close();
      const label = audioStream.getAudioTracks()[0]?.label ?? 'Unknown mic';
      patch('microphone', { status: 'pass', detail: `${label} — energy: ${(audioLevel * 100).toFixed(1)}%` });
    } catch (e: any) {
      patch('microphone', { status: 'fail', detail: e.name === 'NotAllowedError' ? 'Permission denied — allow microphone access' : 'No microphone found' });
    }

    // 6. Browser APIs
    const missing: string[] = [];
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') missing.push('AudioContext');
    if (!document.createElement('canvas').getContext) missing.push('Canvas 2D');
    if (!navigator.sendBeacon) missing.push('sendBeacon');
    if (!window.WebSocket) missing.push('WebSocket');
    patch('browser', missing.length === 0
      ? { status: 'pass', detail: 'AudioContext ✓  Canvas ✓  sendBeacon ✓  WebSocket ✓' }
      : { status: 'warn', detail: `Missing: ${missing.join(', ')}` });

    // 7. Electron
    const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;
    patch('electron', {
      status: isElectron ? 'pass' : 'warn',
      detail: isElectron
        ? 'Running in Electron — full lockdown & kiosk mode available'
        : 'Running in browser — lockdown unavailable (Electron app required for full proctoring)',
    });

    // 8. Face detection
    if (cameraOk && pythonOk && videoRef.current) {
      try {
        await new Promise(r => setTimeout(r, 1200));
        const video = videoRef.current!;
        if (video.videoWidth > 0) {
          const canvas = document.createElement('canvas');
          canvas.width = 320; canvas.height = 240;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(video, 0, 0, 320, 240);
          const imageData = canvas.toDataURL('image/jpeg', 0.8);
          setLiveFrame(imageData);

          const res = await fetch(`${PYTHON}/analyze-frame`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData, audioEnergy: audioLevel, participantId: 'compat-check', meetingId: 'test', userId: 'test' }),
            signal: AbortSignal.timeout(6000),
          });

          if (res.ok) {
            const analysis = await res.json();
            setFaceResult(analysis);
            const detected: string[] = [];
            if (analysis.faceDetected) detected.push(`${analysis.faceCount} face(s) in frame`);
            else detected.push('No face detected');
            analysis.alerts?.forEach((a: any) => detected.push(a.alertType));
            patch('facedetect', {
              status: analysis.faceDetected ? 'pass' : 'warn',
              detail: analysis.faceDetected
                ? `Face detection working — ${analysis.faceCount} face(s) detected`
                : 'No face in frame — sit in front of camera and re-run',
              detected,
            });
          } else {
            patch('facedetect', { status: 'warn', detail: 'AI service returned an error on frame analysis' });
          }
        } else {
          patch('facedetect', { status: 'warn', detail: 'Camera not ready — try re-running the check' });
        }
      } catch {
        patch('facedetect', { status: 'warn', detail: 'Face detection test failed — Python service may be busy' });
      }
    } else if (!pythonOk) {
      patch('facedetect', { status: 'warn', detail: 'Python AI service offline — start simple_main.py to enable face detection' });
    } else {
      patch('facedetect', { status: 'warn', detail: 'Camera unavailable — fix camera first then re-run' });
    }

    setRunning(false);
    setDone(true);
  }, [patch]);

  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;
  const overall   = failCount > 2 ? 'fail' : failCount > 0 || warnCount > 2 ? 'warn' : 'pass';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <StudentNav backPath="/student" backLabel="Back" />
          <div>
            <h1 className="text-3xl font-bold text-orange-800">System Compatibility Check</h1>
            <p className="text-orange-600 mt-1">Verify your system is ready for proctored sessions</p>
          </div>
        </div>

        {/* Overall banner */}
        {done && (
          <div className={`rounded-2xl p-5 mb-6 flex items-center gap-4 shadow-lg border ${
            overall === 'pass' ? 'bg-green-50 border-green-200' :
            overall === 'warn' ? 'bg-yellow-50 border-yellow-200' :
            'bg-red-50 border-red-200'
          }`}>
            {overall === 'pass'
              ? <CheckCircle2 className="w-8 h-8 text-green-600 flex-shrink-0" />
              : overall === 'warn'
              ? <AlertTriangle className="w-8 h-8 text-yellow-600 flex-shrink-0" />
              : <XCircle className="w-8 h-8 text-red-600 flex-shrink-0" />}
            <div className="flex-1">
              <div className={`text-lg font-bold ${
                overall === 'pass' ? 'text-green-800' :
                overall === 'warn' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {overall === 'pass' ? '✅ System Ready for Proctoring' :
                 overall === 'warn' ? '⚠️ Partially Ready — Some Issues Found' :
                 '❌ Not Ready — Critical Issues Found'}
              </div>
              <div className="text-sm mt-1 text-gray-600">
                {passCount} passed · {warnCount} warnings · {failCount} failed out of {checks.length} checks
              </div>
            </div>
            <button
              onClick={runChecks}
              disabled={running}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-700 hover:bg-gray-50 transition-all font-medium shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              Re-run
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">

          {/* Left: checks */}
          <div className="space-y-3">
            {checks.map(check => (
              <div key={check.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-orange-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <StatusIcon status={check.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-gray-800 text-sm">{check.label}</span>
                      <StatusBadge status={check.status} />
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
                    {check.detail && (
                      <p className={`text-xs mt-1.5 font-medium ${
                        check.status === 'pass' ? 'text-green-700' :
                        check.status === 'fail' ? 'text-red-700' :
                        check.status === 'warn' ? 'text-yellow-700' : 'text-gray-600'
                      }`}>{check.detail}</p>
                    )}
                    {check.detected && check.detected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {check.detected.map((d, i) => (
                          <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">{d}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {!running && !done && (
              <button
                onClick={runChecks}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-semibold text-lg hover:scale-[1.02] transition-all shadow-lg shadow-orange-200/50 flex items-center justify-center gap-3"
              >
                <Shield className="w-5 h-5" />
                Run Compatibility Check
              </button>
            )}
            {running && (
              <div className="w-full py-4 bg-orange-100 text-orange-700 rounded-2xl font-semibold text-lg flex items-center justify-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Running checks...
              </div>
            )}
          </div>

          {/* Right: camera + results */}
          <div className="space-y-4">

            {/* Camera preview */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-orange-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-gray-800 text-sm">Camera Preview</span>
              </div>
              <div className="relative bg-gray-900 aspect-video">
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                {!streamRef.current && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Camera preview appears after check</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Captured frame */}
            {liveFrame && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                <div className="p-3 border-b border-orange-100 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-gray-800 text-sm">Captured Frame Sent to AI</span>
                </div>
                <img src={liveFrame} alt="Captured frame" className="w-full" />
              </div>
            )}

            {/* AI detection result */}
            {faceResult && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-gray-800 text-sm">AI Detection Results</span>
                </div>
                <Row label="Face Detected"  value={faceResult.faceDetected ? '✅ Yes' : '❌ No'} />
                <Row label="Face Count"     value={String(faceResult.faceCount ?? 0)} />
                <Row label="Detection Mode" value={faceResult.mode ?? 'simple'} />
                {faceResult.alerts?.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-gray-600">Alerts triggered during check:</p>
                    {faceResult.alerts.map((a: any, i: number) => (
                      <div key={i} className={`text-xs rounded-lg px-3 py-2 font-medium ${
                        a.severity === 'HIGH' || a.severity === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                        a.severity === 'MEDIUM' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-50 text-gray-700'
                      }`}>
                        <span className="font-bold">{a.alertType}</span>: {a.description}
                      </div>
                    ))}
                  </div>
                ) : (
                  <Row label="Alerts" value="✅ None — all clear" />
                )}
              </div>
            )}

            {/* What proctoring monitors */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-orange-600" />
                <span className="font-semibold text-gray-800 text-sm">What Proctoring Monitors</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: '👤', label: 'Face presence' },
                  { icon: '👥', label: 'Multiple faces' },
                  { icon: '📱', label: 'Phone detection' },
                  { icon: '👁️', label: 'Gaze deviation' },
                  { icon: '🔊', label: 'Sustained speech' },
                  { icon: '🔄', label: 'Tab switching' },
                  { icon: '🪟', label: 'Window focus loss' },
                  { icon: '📋', label: 'Copy / paste' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-orange-50 rounded-lg px-3 py-2">
                    <span>{item.icon}</span><span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
