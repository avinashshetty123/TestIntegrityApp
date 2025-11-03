'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Users, Calendar, Settings, Trash2, Play, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  status: string;
  isPublished: boolean;
  requireApproval: boolean;
}

interface JoinRequest {
  id: string;
  studentName: string;
  requestedAt: string;
}

export default function EnhancedTutorDashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinRequests, setJoinRequests] = useState<{ [key: string]: JoinRequest[] }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchJoinRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await fetch('http://localhost:4000/meetings/visible', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
        fetchJoinRequests();
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinRequests = async () => {
    try {
      const requests: { [key: string]: JoinRequest[] } = {};
      
      for (const meeting of meetings) {
        const response = await fetch(`http://localhost:4000/meetings/${meeting.id}/join-requests`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          requests[meeting.id] = await response.json();
        }
      }
      
      setJoinRequests(requests);
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const publishMeeting = async (meetingId: string) => {
    try {
      await fetch(`http://localhost:4000/meetings/${meetingId}/publish`, {
        method: 'POST',
        credentials: 'include'
      });
      fetchMeetings();
    } catch (error) {
      console.error('Failed to publish meeting:', error);
    }
  };

  const respondToJoinRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch(`http://localhost:4000/meetings/join-request/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      fetchJoinRequests();
    } catch (error) {
      console.error('Failed to respond to join request:', error);
    }
  };

  const deleteMeeting = async (meetingId: string) => {
    try {
      await fetch(`http://localhost:4000/meetings/${meetingId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      fetchMeetings();
    } catch (error) {
      console.error('Failed to delete meeting:', error);
    }
  };

  const startMeeting = async (meetingId: string) => {
    try {
      await fetch(`http://localhost:4000/meetings/${meetingId}/start`, {
        method: 'POST',
        credentials: 'include'
      });
      router.push(`/tutor/meeting/${meetingId}`);
    } catch (error) {
      console.error('Failed to start meeting:', error);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Meeting Dashboard</h1>
        <Button onClick={() => router.push('/tutor/meeting/create-meeting')}>
          Create Meeting
        </Button>
      </div>

      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{meeting.title}</h3>
                <p className="text-gray-600">{meeting.description}</p>
                <p className="text-sm text-gray-500">
                  {new Date(meeting.scheduledAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={meeting.status === 'LIVE' ? 'bg-green-500' : 'bg-blue-500'}>
                  {meeting.status}
                </Badge>
                {meeting.isPublished && (
                  <Badge className="bg-purple-500">Published</Badge>
                )}
              </div>
            </div>

            {/* Join Requests */}
            {joinRequests[meeting.id]?.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                <h4 className="font-medium mb-2">Pending Join Requests:</h4>
                <div className="space-y-2">
                  {joinRequests[meeting.id].map((request) => (
                    <div key={request.id} className="flex items-center justify-between">
                      <span className="text-sm">{request.studentName}</span>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToJoinRequest(request.id, 'APPROVED')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => respondToJoinRequest(request.id, 'REJECTED')}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {meeting.status === 'SCHEDULED' && (
                <Button onClick={() => startMeeting(meeting.id)} className="bg-green-600">
                  <Play className="w-4 h-4 mr-2" />
                  Start Meeting
                </Button>
              )}
              
              {meeting.status === 'LIVE' && (
                <Button onClick={() => router.push(`/tutor/meeting/${meeting.id}`)}>
                  <Users className="w-4 h-4 mr-2" />
                  Join Meeting
                </Button>
              )}

              {meeting.status === 'ENDED' && (
                <Button onClick={() => router.push(`/tutor/results/${meeting.id}`)}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Results
                </Button>
              )}

              {!meeting.isPublished && (
                <Button onClick={() => publishMeeting(meeting.id)} className="bg-purple-600">
                  Publish
                </Button>
              )}

              <Button
                onClick={() => deleteMeeting(meeting.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}