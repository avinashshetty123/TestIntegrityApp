// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Search, 
  Video, 
  Clock, 
  Lock, 
  Unlock,
  Loader2,
  Users,
  BookOpen
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';

interface Meeting {
  id: string;
  title: string;
  description?: string;
  institution?: string;
  subject?: string;
  scheduledAt?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  roomName: string;
  teacher: {
    id: string;
    fullName: string;
    email: string;
  };
  teacherId: string;
  isLocked: boolean;
  requireApproval: boolean;
  startedAt?: string;
  endedAt?: string;
}

interface JoinResponse {
  meeting: Meeting;
  token: string;
  serverUrl: string;
}

export default function StudentMeetingDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const router = useRouter();

  // Axios instance with credentials
  const api = axios.create({
    baseURL: 'http://localhost:4000',
    withCredentials: true,
  });

  useEffect(() => {
    // Initialize Socket.io connection with specific origin
    socketRef.current = io('http://localhost:4000/meeting', {
      withCredentials: true,
      transports: ['websocket', 'polling'] // Add explicit transports
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to meeting server');
    });

    socketRef.current.on('connect_error', (error: any) => {
      console.error('Socket connection error:', error);
    });

    // Listen for join request approvals
    socketRef.current.on('join-request-approved', (data: any) => {
      console.log('Join request approved via socket:', data);
      toast.success('Your join request has been approved!');
      
      // Automatically join the meeting after approval
      handleAutoJoinMeeting(data.meetingId);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredMeetings(meetings);
    } else {
      const filtered = meetings.filter(meeting =>
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        meeting.teacher?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMeetings(filtered);
    }
  }, [searchQuery, meetings]);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/meetings/visible');
      console.log('Fetched meetings:', response.data);
      setMeetings(response.data);
      setFilteredMeetings(response.data);
    } catch (err) {
      console.error('Error fetching meetings:', err);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleAutoJoinMeeting = async (meetingId: string) => {
    try {
      console.log('Auto-joining meeting after approval:', meetingId);
      
      const response = await api.post<JoinResponse>(
        `/meetings/${meetingId}/join`,
        {}
      );

      console.log('Auto-joined meeting successfully');
      
      // Store meeting data for the meeting page
      sessionStorage.setItem('currentMeeting', JSON.stringify({
        meeting: response.data.meeting,
        token: response.data.token,
        serverUrl: response.data.serverUrl
      }));

      // Redirect to meeting join page
          router.push(`/student/meeting/join/${meetingId}?token=${encodeURIComponent(response.data.token)}&serverUrl=${encodeURIComponent(response.data.serverUrl)}`);
      
    } catch (err: any) {
      console.error('Error auto-joining meeting:', err);
      if (err.response?.data?.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to join meeting after approval');
      }
    }
  };

  const handleJoinMeeting = async (meetingId: string) => {
    try {
      setJoiningMeeting(meetingId);
      console.log('Attempting to join meeting:', meetingId);
      
      const response = await api.post<JoinResponse>(
        `/meetings/${meetingId}/join`,
        {}
      );

      console.log('Joined meeting successfully:', response.data);
      toast.success('Successfully joined meeting!');
      
      // Store meeting data for the meeting page
      sessionStorage.setItem('currentMeeting', JSON.stringify({
        meeting: response.data.meeting,
        token: response.data.token,
        serverUrl: response.data.serverUrl
      }));

      // Redirect to meeting join page
           router.push(`/student/meeting/join/${meetingId}?token=${encodeURIComponent(response.data.token)}&serverUrl=${encodeURIComponent(response.data.serverUrl)}`);
      
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      
      if (err.response?.status === 403) {
        const errorMessage = err.response.data?.message;
        
        if (errorMessage === 'Join request pending approval') {
          // If there's already a pending request, just show message
          toast.info('Join request already pending approval');
        } else {
          // For other 403 errors, show the actual message
          toast.error(errorMessage || 'Permission denied to join meeting');
        }
      } else {
        toast.error('Failed to join meeting. Please try again.');
      }
    } finally {
      setJoiningMeeting(null);
    }
  };

  const requestToJoin = async (meetingId: string) => {
    try {
      console.log('Requesting to join meeting:', meetingId);
      
      await api.post(
        `/meetings/${meetingId}/join-request`,
        {}
      );
      
      // Join the meeting room to listen for approval
      if (socketRef.current) {
        socketRef.current.emit('join-meeting-room', { meetingId });
      }
      
      toast.success('Join request sent! Waiting for tutor approval...');
      
    } catch (err: any) {
      console.error('Error requesting to join:', err);
      
      if (err.response?.status === 403 && err.response.data?.message === 'Join request already pending') {
        toast.info('Join request already pending approval');
      } else {
        toast.error('Failed to send join request');
      }
    }
  };

  const getJoinButtonState = (meeting: Meeting) => {
    // If already joining, show loading
    if (joiningMeeting === meeting.id) {
      return { 
        text: 'Joining...', 
        icon: Loader2,
        onClick: () => {},
        disabled: true,
        variant: 'default' as const
      };
    }

    // SIMPLE LOGIC: Check if meeting requires approval or is locked
    if (meeting.requireApproval || meeting.isLocked) {
      return { 
        text: 'Request to Join', 
        icon: Unlock,
        onClick: () => requestToJoin(meeting.id),
        disabled: false,
        variant: 'outline' as const
      };
    }

    // If no approval needed and not locked, join directly
    return { 
      text: 'Join Meeting', 
      icon: Video,
      onClick: () => handleJoinMeeting(meeting.id),
      disabled: false,
      variant: 'default' as const
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="mt-2 text-gray-600">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Meeting Dashboard</h1>
          <p className="text-gray-600 mt-2">Join available meetings</p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search meetings..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No meetings found' : 'No meetings available'}
            </h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting) => {
              const buttonState = getJoinButtonState(meeting);
              const IconComponent = buttonState.icon;
              
              return (
                <Card key={meeting.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-3">
                      <CardTitle className="text-lg line-clamp-2">
                        {meeting.title}
                      </CardTitle>
                      <Badge 
                        variant={meeting.status === 'LIVE' ? 'destructive' : 'secondary'}
                        className="shrink-0"
                      >
                        {meeting.status}
                      </Badge>
                    </div>
                    
                    {/* Show meeting restrictions */}
                    <div className="flex flex-wrap gap-2">
                      {meeting.isLocked && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Lock className="w-3 h-3 mr-1" />
                          Locked
                        </Badge>
                      )}
                      {meeting.requireApproval && !meeting.isLocked && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Unlock className="w-3 h-3 mr-1" />
                          Approval Required
                        </Badge>
                      )}
                      {!meeting.isLocked && !meeting.requireApproval && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Video className="w-3 h-3 mr-1" />
                          Join Directly
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {meeting.description && (
                      <p className="text-gray-600 text-sm line-clamp-2">
                        {meeting.description}
                      </p>
                    )}
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Avatar className="w-6 h-6 mr-2">
                          <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                            {meeting.teacher?.fullName?.charAt(0) || 'T'}
                          </AvatarFallback>
                        </Avatar>
                        <span>{meeting.teacher?.fullName || 'Unknown Teacher'}</span>
                      </div>
                      
                      {meeting.subject && (
                        <div className="flex items-center">
                          <BookOpen className="w-4 h-4 mr-2" />
                          <span>{meeting.subject}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>
                          {meeting.scheduledAt 
                            ? formatDate(meeting.scheduledAt)
                            : 'Flexible timing'
                          }
                        </span>
                      </div>
                    </div>

                    {/* Join Button */}
                    <Button
                      onClick={buttonState.onClick}
                      disabled={buttonState.disabled}
                      variant={buttonState.variant}
                      className="w-full mt-4"
                    >
                      <IconComponent className={`w-4 h-4 mr-2 ${joiningMeeting === meeting.id ? 'animate-spin' : ''}`} />
                      {buttonState.text}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}