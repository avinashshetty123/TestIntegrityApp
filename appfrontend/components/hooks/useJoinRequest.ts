// hooks/useJoinRequests.ts
import { useState, useEffect, useCallback } from 'react';

interface JoinRequest {
  id: string;
  studentId: string;
  studentName: string;
  requestedAt: string;
}

export function useJoinRequests(meetingId: string, isTutor: boolean, enabled: boolean) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:4000/meetings/${meetingId}/join-requests`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  }, [meetingId]);

  const respondToRequest = useCallback(async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const res = await fetch(`http://localhost:4000/meetings/join-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== requestId));
        await fetchRequests(); // refresh
      }
    } catch (error) {
      console.error('Failed to respond to request:', error);
    }
  }, [fetchRequests]);

  useEffect(() => {
    if (!isTutor || !enabled) return;
    fetchRequests();
    const interval = setInterval(fetchRequests, 2000);
    return () => clearInterval(interval);
  }, [isTutor, enabled, fetchRequests]);

  return { requests, respondToRequest, refresh: fetchRequests };
}