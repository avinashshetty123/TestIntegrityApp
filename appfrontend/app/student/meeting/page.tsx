// app/dashboard/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ElectronLayout from '@/components/ElectronLayout';
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
  BookOpen,
  UserCheck,
  Clock4,
  CheckCircle2,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import axios from 'axios';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';

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

interface JoinRequest {
  id: string;
  studentId: string;
  studentName: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requestedAt: string;
}

export default function StudentMeetingDashboard() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [filteredMeetings, setFilteredMeetings] = useState<Meeting[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [joiningMeeting, setJoiningMeeting] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});
  const [approvedMeetings, setApprovedMeetings] = useState<Record<string, boolean>>({});
  const [showWaitingRoom, setShowWaitingRoom] = useState<string | null>(null);
  const socketRef = useRef<any>(null);
  const router = useRouter();

  // Axios instance with credentials
  const api = axios.create({
    baseURL: 'http://localhost:4000',
    withCredentials: true,
  });

  useEffect(() => {
    // Initialize Socket.io connection
    socketRef.current = io('http://localhost:4000/meeting', {
      withCredentials: true,
      transports: ['websocket', 'polling']
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
      
      // Update state to show approved
      setApprovedMeetings(prev => ({
        ...prev,
        [data.meetingId]: true
      }));
      
      setPendingRequests(prev => ({
        ...prev,
        [data.meetingId]: false
      }));

      toast.success('Your join request has been approved!', {
        description: 'You can now join the meeting',
        action: {
          label: 'Join Now',
          onClick: () => handleJoinAfterApproval(data.meetingId)
        }
      });
    });

    // Listen for join request rejections
    socketRef.current.on('join-request-rejected', (data: any) => {
      console.log('Join request rejected via socket:', data);
      
      setPendingRequests(prev => ({
        ...prev,
        [data.meetingId]: false
      }));

      toast.error('Your join request was rejected', {
        description: 'Please contact the tutor for more information'
      });

      if (showWaitingRoom === data.meetingId) {
        setShowWaitingRoom(null);
      }
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

  const handleJoinAfterApproval = async (meetingId: string) => {
    try {
      setJoiningMeeting(meetingId);
      
      const response = await api.post<JoinResponse>(
        `/meetings/${meetingId}/join`,
        {}
      );

      console.log('Joined meeting after approval:', response.data);
      
      // Store meeting data for the meeting page
      sessionStorage.setItem('currentMeeting', JSON.stringify({
        meeting: response.data.meeting,
        token: response.data.token,
        serverUrl: response.data.serverUrl
      }));

      // Close waiting room and redirect
      setShowWaitingRoom(null);
      router.push(`/student/meeting/join/${meetingId}?token=${encodeURIComponent(response.data.token)}&serverUrl=${encodeURIComponent(response.data.serverUrl)}`);
      
    } catch (err: any) {
      console.error('Error joining meeting after approval:', err);
      toast.error('Failed to join meeting after approval');
    } finally {
      setJoiningMeeting(null);
    }
  };

  const handleDirectJoin = async (meetingId: string) => {
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
          toast.info('Join request already pending approval');
          setPendingRequests(prev => ({ ...prev, [meetingId]: true }));
        } else {
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
      
      await api.post(`/meetings/${meetingId}/join-request`, {});
      
      // Join the meeting room to listen for approval
      if (socketRef.current) {
        socketRef.current.emit('join-meeting-room', { meetingId });
      }
      
      // Show waiting room
      setShowWaitingRoom(meetingId);
      setPendingRequests(prev => ({ ...prev, [meetingId]: true }));
      
      toast.success('Join request sent!', {
        description: 'Waiting for tutor approval...'
      });
      
    } catch (err: any) {
      console.error('Error requesting to join:', err);
      
      if (err.response?.status === 403 && err.response.data?.message === 'Join request already pending') {
        toast.info('Join request already pending approval');
        setPendingRequests(prev => ({ ...prev, [meetingId]: true }));
      } else {
        toast.error('Failed to send join request');
      }
    }
  };

  const checkRequestStatus = async (meetingId: string) => {
    try {
      
      toast.info('Checking request status...');
    } catch (err) {
      console.error('Error checking request status:', err);
    }
  };

  const getJoinButtonState = (meeting: Meeting) => {
    const isPending = pendingRequests[meeting.id];
    const isApproved = approvedMeetings[meeting.id];

    // If already joining, show loading
    if (joiningMeeting === meeting.id) {
      return { 
        text: 'Joining...', 
        icon: Loader2,
        onClick: () => {},
        disabled: true,
        variant: 'default' as const,
        state: 'joining' as const
      };
    }

    // If approved, show join button
    if (isApproved) {
      return { 
        text: 'Join Meeting', 
        icon: Video,
        onClick: () => handleDirectJoin(meeting.id),
        disabled: false,
        variant: 'default' as const,
        state: 'approved' as const
      };
    }

    // If pending approval
    if (isPending) {
      return { 
        text: 'Pending Approval', 
        icon: Clock4,
        onClick: () => checkRequestStatus(meeting.id),
        disabled: false,
        variant: 'outline' as const,
        state: 'pending' as const
      };
    }

    // If meeting requires approval or is locked
    if (meeting.requireApproval || meeting.isLocked) {
      return { 
        text: 'Request to Join', 
        icon: UserCheck,
        onClick: () => requestToJoin(meeting.id),
        disabled: false,
        variant: 'outline' as const,
        state: 'request' as const
      };
    }

    // If no approval needed and not locked, join directly
    return { 
      text: 'Join Meeting', 
      icon: Video,
      onClick: () => handleDirectJoin(meeting.id),
      disabled: false,
      variant: 'default' as const,
      state: 'join' as const
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Flexible timing';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const WaitingRoom = ({ meetingId }: { meetingId: string }) => {
    const meeting = meetings.find(m => m.id === meetingId);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white/90 backdrop-blur-3xl rounded-3xl p-8 max-w-md w-full shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_8px_30px_rgba(251,146,60,0.4)]">
                <Clock4 className="w-10 h-10 text-white" />
              </div>
              
              <div className="absolute -top-2 -right-2">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-orange-800">
                Waiting for Approval
              </h3>
              <p className="text-orange-600">
                Your request to join{" "}
                <span className="font-semibold text-orange-800">
                  {meeting?.title}
                </span>{" "}
                has been sent to the tutor.
              </p>
            </div>

            <div className="space-y-3 text-sm text-orange-700">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>Request sent successfully</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock4 className="w-4 h-4 text-orange-600" />
                <span>Waiting for tutor approval</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <span>You'll be notified when approved</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <button
                onClick={() => setShowWaitingRoom(null)}
                className="w-full bg-white/80 backdrop-blur-xl rounded-2xl py-3 px-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 text-orange-700 font-medium"
              >
                Close
              </button>
              <button
                onClick={() => checkRequestStatus(meetingId)}
                className="w-full text-orange-600 hover:text-orange-700 py-3 px-4 rounded-2xl hover:bg-white/50 transition-all duration-300 font-medium"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-800 font-medium text-lg">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <ElectronLayout 
      title="Available Meetings" 
      showBackButton={true}
      backButtonPath="/student"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-orange-800 drop-shadow-sm mb-4">
              Meeting Dashboard
            </h1>
            <p className="text-orange-600 text-lg max-w-2xl mx-auto">
              Discover and join educational meetings. Request access to locked sessions and get real-time approval notifications.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search meetings by title, description, subject, or tutor name..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400 text-lg"
            />
          </div>
        </div>

        {/* Meetings Grid */}
        {filteredMeetings.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-16 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
            <Users className="w-24 h-24 text-orange-400 mx-auto mb-6" />
            <h3 className="text-2xl font-medium text-orange-800 mb-3">
              {searchQuery ? 'No meetings found' : 'No meetings available'}
            </h3>
            <p className="text-orange-600 max-w-md mx-auto">
              {searchQuery 
                ? 'Try adjusting your search terms or check back later for new meetings.'
                : 'Check back later for scheduled meetings or contact your institution.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredMeetings.map((meeting, index) => {
              const buttonState = getJoinButtonState(meeting);
              const IconComponent = buttonState.icon;
              const isPending = pendingRequests[meeting.id];
              const isApproved = approvedMeetings[meeting.id];
              
              return (
                <div
                  key={meeting.id}
                  className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300 h-full flex flex-col"
                >
                  <div className="pb-4 relative">
                    {/* Status Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-xl text-white text-sm font-medium shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${
                        meeting.status === 'LIVE'
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : meeting.status === 'SCHEDULED'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                          : 'bg-gradient-to-r from-gray-500 to-gray-600'
                      }`}>
                        {meeting.status === 'LIVE' && (
                          <span className="w-2 h-2 bg-white rounded-full mr-2 inline-block animate-pulse" />
                        )}
                        {meeting.status}
                      </span>
                      
                      {/* Request Status Badge */}
                      {isPending && (
                        <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(251,191,36,0.3)] flex items-center gap-1">
                          <Clock4 className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                      {isApproved && (
                        <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(34,197,94,0.3)] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      )}
                    </div>
                    
                    <h3 className="text-xl font-bold line-clamp-2 text-orange-800 leading-tight mb-4">
                      {meeting.title}
                    </h3>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Meeting Details */}
                    <div className="space-y-3">
                      {meeting.description && (
                        <p className="text-orange-600 text-sm line-clamp-3 leading-relaxed">
                          {meeting.description}
                        </p>
                      )}
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-[0_4px_15px_rgba(251,146,60,0.3)]">
                            <span className="text-white text-sm font-semibold">
                              {meeting.teacher?.fullName?.charAt(0) || 'T'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-orange-800">
                              {meeting.teacher?.fullName || 'Unknown Teacher'}
                            </p>
                            <p className="text-orange-600 text-xs">
                              Tutor
                            </p>
                          </div>
                        </div>
                        
                        {meeting.subject && (
                          <div className="flex items-center text-orange-700">
                            <BookOpen className="w-4 h-4 mr-3 text-orange-500" />
                            <span>{meeting.subject}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-orange-700">
                          <Clock className="w-4 h-4 mr-3 text-orange-500" />
                          <span>{formatDate(meeting.scheduledAt || '')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Access Information */}
                    <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-orange-800">Access:</span>
                        {meeting.isLocked ? (
                          <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-xl text-xs font-medium shadow-[0_4px_15px_rgba(239,68,68,0.3)] flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Locked
                          </span>
                        ) : meeting.requireApproval ? (
                          <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-3 py-1 rounded-xl text-xs font-medium shadow-[0_4px_15px_rgba(59,130,246,0.3)] flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            Approval Required
                          </span>
                        ) : (
                          <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-xl text-xs font-medium shadow-[0_4px_15px_rgba(34,197,94,0.3)] flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Open Access
                          </span>
                        )}
                      </div>
                      
                      {isPending && (
                        <p className="text-xs text-yellow-600 text-center font-medium">
                          Waiting for tutor approval...
                        </p>
                      )}
                      
                      {isApproved && (
                        <p className="text-xs text-green-600 text-center font-medium">
                          Your request has been approved!
                        </p>
                      )}
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={buttonState.onClick}
                      disabled={buttonState.disabled}
                      className={`w-full py-3 rounded-2xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                        buttonState.variant === 'default'
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                          : 'bg-white/80 backdrop-blur-xl border border-orange-200/50 text-orange-700 hover:bg-white/90'
                      }`}
                    >
                      <IconComponent className={`w-5 h-5 ${
                        joiningMeeting === meeting.id ? 'animate-spin' : ''
                      }`} />
                      {buttonState.text}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Waiting Room Modal */}
        {showWaitingRoom && <WaitingRoom meetingId={showWaitingRoom} />}
      </div>
    </ElectronLayout>
  );
}