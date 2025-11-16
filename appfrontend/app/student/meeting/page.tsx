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
  BookOpen,
  UserCheck,
  Clock4,
  CheckCircle2,
  AlertCircle
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
      // In a real app, you might want to poll the backend for status
      // For now, we'll rely on WebSocket updates
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl"
        >
          <div className="text-center space-y-6">
            <div className="relative">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Clock4 className="w-10 h-10 text-blue-600" />
              </motion.div>
              
              <div className="absolute -top-2 -right-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-6 h-6 text-blue-600" />
                </motion.div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-gray-900">
                Waiting for Approval
              </h3>
              <p className="text-gray-600">
                Your request to join{" "}
                <span className="font-semibold text-blue-600">
                  {meeting?.title}
                </span>{" "}
                has been sent to the tutor.
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-500">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Request sent successfully</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <Clock4 className="w-4 h-4 text-blue-500" />
                <span>Waiting for tutor approval</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span>You'll be notified when approved</span>
              </div>
            </div>

            <div className="pt-4 space-y-3">
              <Button
                onClick={() => setShowWaitingRoom(null)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
              <Button
                onClick={() => checkRequestStatus(meetingId)}
                variant="ghost"
                className="w-full"
              >
                Check Status
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-12 h-12 mx-auto text-blue-600" />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-gray-600 text-lg"
          >
            Loading meetings...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Meeting Dashboard
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Discover and join educational meetings. Request access to locked sessions and get real-time approval notifications.
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12 max-w-2xl mx-auto"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search meetings by title, description, subject, or tutor name..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm text-lg bg-white/80 backdrop-blur-sm"
            />
          </div>
        </motion.div>

        {/* Meetings Grid */}
        <AnimatePresence mode="wait">
          {filteredMeetings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-16"
            >
              <Users className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-medium text-gray-900 mb-3">
                {searchQuery ? 'No meetings found' : 'No meetings available'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {searchQuery 
                  ? 'Try adjusting your search terms or check back later for new meetings.'
                  : 'Check back later for scheduled meetings or contact your institution.'
                }
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8"
            >
              {filteredMeetings.map((meeting, index) => {
                const buttonState = getJoinButtonState(meeting);
                const IconComponent = buttonState.icon;
                const isPending = pendingRequests[meeting.id];
                const isApproved = approvedMeetings[meeting.id];
                
                return (
                  <motion.div
                    key={meeting.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card className="overflow-hidden border-2 border-gray-100/80 bg-white/90 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 rounded-3xl h-full flex flex-col">
                      <CardHeader className="pb-4 relative">
                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-4">
                          <Badge 
                            variant={meeting.status === 'LIVE' ? 'destructive' : 'secondary'}
                            className="shrink-0 text-sm px-3 py-1 rounded-full"
                          >
                            {meeting.status === 'LIVE' && (
                              <motion.span
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 bg-white rounded-full mr-2"
                              />
                            )}
                            {meeting.status}
                          </Badge>
                          
                          {/* Request Status Badge */}
                          {isPending && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock4 className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          {isApproved && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                        </div>
                        
                        <CardTitle className="text-xl font-bold line-clamp-2 text-gray-900 leading-tight">
                          {meeting.title}
                        </CardTitle>
                      </CardHeader>

                      <CardContent className="flex-1 space-y-4">
                        {/* Meeting Details */}
                        <div className="space-y-3">
                          {meeting.description && (
                            <p className="text-gray-600 text-sm line-clamp-3 leading-relaxed">
                              {meeting.description}
                            </p>
                          )}
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                                  {meeting.teacher?.fullName?.charAt(0) || 'T'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {meeting.teacher?.fullName || 'Unknown Teacher'}
                                </p>
                                <p className="text-gray-500 text-xs">
                                  Tutor
                                </p>
                              </div>
                            </div>
                            
                            {meeting.subject && (
                              <div className="flex items-center text-gray-600">
                                <BookOpen className="w-4 h-4 mr-3" />
                                <span>{meeting.subject}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center text-gray-600">
                              <Clock className="w-4 h-4 mr-3" />
                              <span>{formatDate(meeting.scheduledAt || '')}</span>
                            </div>
                          </div>
                        </div>

                        {/* Access Information */}
                        <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Access:</span>
                            {meeting.isLocked ? (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <Lock className="w-3 h-3 mr-1" />
                                Locked
                              </Badge>
                            ) : meeting.requireApproval ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                <UserCheck className="w-3 h-3 mr-1" />
                                Approval Required
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Video className="w-3 h-3 mr-1" />
                                Open Access
                              </Badge>
                            )}
                          </div>
                          
                          {isPending && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-xs text-amber-600 text-center"
                            >
                              Waiting for tutor approval...
                            </motion.p>
                          )}
                          
                          {isApproved && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-xs text-green-600 text-center"
                            >
                              Your request has been approved!
                            </motion.p>
                          )}
                        </div>

                        {/* Action Button */}
                        <motion.div whileTap={{ scale: 0.95 }}>
                          <Button
                            onClick={buttonState.onClick}
                            disabled={buttonState.disabled}
                            variant={buttonState.variant}
                            className="w-full py-3 rounded-xl font-semibold transition-all duration-200"
                            size="lg"
                          >
                            <IconComponent className={`w-5 h-5 mr-2 ${
                              joiningMeeting === meeting.id ? 'animate-spin' : ''
                            }`} />
                            {buttonState.text}
                          </Button>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Waiting Room Modal */}
        <AnimatePresence>
          {showWaitingRoom && <WaitingRoom meetingId={showWaitingRoom} />}
        </AnimatePresence>
      </div>
    </div>
  );
}