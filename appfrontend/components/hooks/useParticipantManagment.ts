// hooks/useParticipantManagement.ts
import { useState, useCallback, useEffect } from 'react';
import { RemoteParticipant, Track, TrackEvent } from 'livekit-client';

export interface ParticipantData {
  participant: RemoteParticipant;
  flagCount: number;
  isSpeaking: boolean;
  lastActivity: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  alerts: any[];
  displayName: string;
  identity: string;
  videoEnabled?: boolean;
  audioEnabled?: boolean;
  screenSharing?: boolean;
}

function getMediaState(rp: RemoteParticipant) {
  let videoEnabled = false;
  let audioEnabled = false;
  let screenSharing = false;
  rp.trackPublications.forEach((pub) => {
    if (pub.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
      videoEnabled = true; // published = enabled; muted state handled separately
      if (pub.isMuted) videoEnabled = false;
    }
    if (pub.kind === Track.Kind.Audio) {
      audioEnabled = true;
      if (pub.isMuted) audioEnabled = false;
    }
    if (pub.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) screenSharing = true;
  });
  return { videoEnabled, audioEnabled, screenSharing };
}

export function useParticipantManagement(remoteParticipants: RemoteParticipant[]) {
  const [participants, setParticipants] = useState<ParticipantData[]>([]);

  // Sync with remoteParticipants list — add new, remove gone
  useEffect(() => {
    setParticipants(prev => {
      const liveIds = new Set(remoteParticipants.map(rp => rp.identity));
      const prevMap = new Map(prev.map(p => [p.identity, p]));

      remoteParticipants.forEach(rp => {
        if (!prevMap.has(rp.identity)) {
          prevMap.set(rp.identity, {
            participant: rp,
            flagCount: 0,
            isSpeaking: false,
            lastActivity: Date.now(),
            riskLevel: 'LOW',
            riskScore: 0,
            alerts: [],
            displayName: rp.name || rp.identity,
            identity: rp.identity,
            ...getMediaState(rp),
          });

          // Listen for track mute/unmute to update media state
          const refresh = () => {
            setParticipants(p2 => p2.map(p =>
              p.identity === rp.identity ? { ...p, ...getMediaState(rp) } : p
            ));
          };
          rp.on(TrackEvent.TrackMuted, refresh);
          rp.on(TrackEvent.TrackUnmuted, refresh);
          rp.on(TrackEvent.TrackSubscribed, refresh);
          rp.on(TrackEvent.TrackUnsubscribed, refresh);
        }
      });

      return Array.from(prevMap.values()).filter(p => liveIds.has(p.identity));
    });
  }, [remoteParticipants]);

  const updateParticipantAfterAlert = useCallback((participantId: string, alert: any) => {
    setParticipants(prev => prev.map(p => {
      if (p.identity !== participantId) return p;
      const newFlagCount = p.flagCount + 1;
      const newAlerts = [alert, ...p.alerts];
      const highCount = newAlerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length;
      let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      let riskScore = 0;
      if (newFlagCount > 10 || highCount > 3) { riskLevel = 'CRITICAL'; riskScore = 1.0; }
      else if (newFlagCount > 5 || highCount > 1) { riskLevel = 'HIGH'; riskScore = 0.8; }
      else if (newFlagCount > 2 || highCount > 0) { riskLevel = 'MEDIUM'; riskScore = 0.6; }
      else if (newFlagCount > 0) { riskLevel = 'LOW'; riskScore = 0.3; }
      return { ...p, flagCount: newFlagCount, riskLevel, riskScore, alerts: newAlerts };
    }));
  }, []);

  const updateParticipantState = useCallback((stateData: any) => {
    setParticipants(prev => prev.map(p => 
      p.identity === stateData.participantId
        ? {
            ...p,
            videoEnabled: stateData.videoEnabled ?? p.videoEnabled,
            audioEnabled: stateData.audioEnabled ?? p.audioEnabled,
            screenSharing: stateData.screenSharing ?? p.screenSharing,
            lastActivity: Date.now(),
          }
        : p
    ));
  }, []);

  const setSpeaking = useCallback((speakers: any[]) => {
    setParticipants(prev => prev.map(p => ({
      ...p,
      isSpeaking: speakers.some(s => s.identity === p.identity),
      lastActivity: speakers.some(s => s.identity === p.identity) ? Date.now() : p.lastActivity,
    })));
  }, []);

  const flagParticipantLocally = useCallback((participantId: string) => {
    updateParticipantAfterAlert(participantId, {
      alertType: 'MANUAL_FLAG',
      severity: 'MEDIUM',
      description: 'Manual flag by tutor',
    });
  }, [updateParticipantAfterAlert]);

  const removeParticipant = useCallback((participantId: string) => {
    setParticipants(prev => prev.filter(p => p.identity !== participantId));
  }, []);

  return {
    participants,
    updateParticipantAfterAlert,
    updateParticipantState,
    setSpeaking,
    flagParticipantLocally,
    removeParticipant,
  };
}
