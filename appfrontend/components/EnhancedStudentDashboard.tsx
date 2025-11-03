'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  status: string;
  teacher: {
    fullName: string;
  };
}

export default function EnhancedStudentDashboard() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinRequests, setJoinRequests] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:4000/meetings/visible', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestToJoin = async (meetingId: string) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:4000/meetings/${meetingId}/join-request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setJoinRequests(prev => ({ ...prev, [meetingId]: true }));
    } catch (error) {
      console.error('Failed to request join:', error);
    }
  };

  const joinMeeting = async (meetingId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: 'Student' })
      });
      
      if (response.ok) {
        router.push(`/student/meeting/${meetingId}`);
      } else {
        // Meeting requires approval or tutor not present
        await requestToJoin(meetingId);
      }
    } catch (error) {
      console.error('Failed to join meeting:', error);
      await requestToJoin(meetingId);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Available Meetings</h1>
        <Badge className="bg-blue-500">
          {meetings.length} Available
        </Badge>
      </div>

      <div className="grid gap-4">
        {meetings.map((meeting) => (
          <Card key={meeting.id} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">{meeting.title}</h3>
                <p className="text-gray-600">{meeting.description}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(meeting.scheduledAt).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(meeting.scheduledAt).toLocaleTimeString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {meeting.teacher.fullName}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={meeting.status === 'LIVE' ? 'bg-green-500' : 'bg-blue-500'}>
                  {meeting.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {meeting.status === 'LIVE' && !joinRequests[meeting.id] && (
                <Button onClick={() => joinMeeting(meeting.id)} className="bg-green-600">
                  Join Meeting
                </Button>
              )}
              
              {meeting.status === 'SCHEDULED' && !joinRequests[meeting.id] && (
                <Button onClick={() => requestToJoin(meeting.id)} className="bg-blue-600">
                  Request to Join
                </Button>
              )}

              {joinRequests[meeting.id] && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Join request sent - waiting for approval</span>
                </div>
              )}
            </div>
          </Card>
        ))}

        {meetings.length === 0 && (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No meetings available</h3>
            <p className="text-gray-500">Check back later for published meetings</p>
          </Card>
        )}
      </div>
    </div>
  );
}