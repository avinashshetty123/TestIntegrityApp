// hooks/useProctoringAlerts.ts
import { useState, useCallback, useEffect, useRef } from 'react';

export interface ProctoringAlert {
  id: string;
  alertType: string;
  description: string;
  confidence: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  participantId?: string;
  participant?: any;
  studentName?: string;
  timestamp: string;
  detectedAt?: string;
}

export function useProctoringAlerts(
  meetingId: string,
  isTutor: boolean,
  sendData?: (data: any) => void,
  onNewAlert?: (alert: ProctoringAlert) => void,
) {
  const [liveAlerts, setLiveAlerts] = useState<ProctoringAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const onNewAlertRef = useRef(onNewAlert);
  useEffect(() => { onNewAlertRef.current = onNewAlert; }, [onNewAlert]);

  const addAlert = useCallback((alert: ProctoringAlert) => {
    if (seenIdsRef.current.has(alert.id)) return;
    seenIdsRef.current.add(alert.id);
    setLiveAlerts(prev => [alert, ...prev.slice(0, 49)]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const markAsRead = useCallback(() => setUnreadCount(0), []);

  // Poll backend for new alerts every 4s (tutor only)
  // Cache-bust with _t param so browser never returns 304
  useEffect(() => {
    if (!isTutor || !meetingId) return;

    const poll = async () => {
      try {
        const res = await fetch(
          `http://localhost:4000/proctoring/live-alerts/${meetingId}?_t=${Date.now()}`,
          { cache: 'no-store' }
        );
        if (!res.ok) return;
        const data: any[] = await res.json();
        if (!Array.isArray(data)) return;

        data.forEach(item => {
          const id = item.id || `${item.participantId}-${item.detectedAt || item.timestamp}`;
          if (seenIdsRef.current.has(id)) return;

          const alert: ProctoringAlert = {
            id,
            alertType: item.alertType,
            description: item.description,
            confidence: item.confidence ?? 0.8,
            severity: item.severity ?? 'MEDIUM',
            participantId: item.participantId,
            studentName: item.studentName || item.participantId,
            timestamp: item.detectedAt || item.timestamp || new Date().toISOString(),
          };

          seenIdsRef.current.add(id);
          setLiveAlerts(prev => [alert, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);
          onNewAlertRef.current?.(alert);
        });
      } catch {
        // ignore network errors silently
      }
    };

    poll();
    const interval = setInterval(poll, 4000);
    return () => clearInterval(interval);
  }, [isTutor, meetingId]);

  return {
    liveAlerts,
    unreadCount,
    // keep meetingFlags as alias so header badge still works
    meetingFlags: liveAlerts,
    addAlert,
    markAsRead,
  };
}
