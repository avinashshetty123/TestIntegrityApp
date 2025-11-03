'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, AlertTriangle, Clock, Shield } from 'lucide-react';

interface MeetingSession {
  id: string;
  participantName: string;
  participantType: string;
  joinedAt: string;
  leftAt?: string;
  totalAlerts: number;
  highSeverityAlerts: number;
  mediumSeverityAlerts: number;
  lowSeverityAlerts: number;
  flagged: boolean;
  sessionData?: {
    faceVerificationAttempts: number;
    eyeTrackingScore: number;
    behaviorScore: number;
    deviceViolations: number;
    suspiciousActivities: string[];
  };
}

interface MeetingResults {
  meeting: {
    id: string;
    title: string;
    startedAt: string;
    endedAt: string;
    status: string;
  };
  sessions: MeetingSession[];
  summary: {
    totalParticipants: number;
    totalAlerts: number;
    flaggedParticipants: number;
    duration: number;
  };
}

export default function MeetingResultsPage() {
  const params = useParams();
  const router = useRouter();
  const [results, setResults] = useState<MeetingResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [params.meetingId]);

  const fetchResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/meetings/${params.meetingId}/results`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Failed to fetch results:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black flex items-center justify-center">
        <div className="text-white">Loading results...</div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black flex items-center justify-center">
        <div className="text-white">No results found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button onClick={() => router.back()} className="bg-white/10 hover:bg-white/20">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{results.meeting.title} - Results</h1>
            <p className="text-gray-300">
              {new Date(results.meeting.startedAt).toLocaleString()} - {new Date(results.meeting.endedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{results.summary.totalParticipants}</p>
                <p className="text-sm text-gray-300">Participants</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">{formatDuration(results.summary.duration)}</p>
                <p className="text-sm text-gray-300">Duration</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">{results.summary.totalAlerts}</p>
                <p className="text-sm text-gray-300">Total Alerts</p>
              </div>
            </div>
          </Card>

          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold">{results.summary.flaggedParticipants}</p>
                <p className="text-sm text-gray-300">Flagged</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-white/5 border-white/10 p-6">
          <h2 className="text-xl font-semibold mb-4">Participant Sessions</h2>
          <div className="space-y-4">
            {results.sessions.map((session) => (
              <div
                key={session.id}
                className={`p-4 rounded-lg border ${
                  session.flagged ? 'border-red-500 bg-red-500/10' : 'border-white/10 bg-white/5'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      session.flagged ? 'bg-red-600' : 'bg-blue-600'
                    }`}>
                      {session.participantName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-medium">{session.participantName}</h3>
                      <p className="text-sm text-gray-300 capitalize">{session.participantType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {session.flagged && <Badge className="bg-red-500">Flagged</Badge>}
                    <Badge className="bg-gray-600">{session.totalAlerts} alerts</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Joined</p>
                    <p className="text-sm">{new Date(session.joinedAt).toLocaleTimeString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Left</p>
                    <p className="text-sm">
                      {session.leftAt ? new Date(session.leftAt).toLocaleTimeString() : 'Still active'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">High Alerts</p>
                    <p className="text-sm text-red-400">{session.highSeverityAlerts}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Medium Alerts</p>
                    <p className="text-sm text-yellow-400">{session.mediumSeverityAlerts}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}