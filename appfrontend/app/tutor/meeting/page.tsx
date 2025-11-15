"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Clock, Video, Settings, Eye, AlertTriangle, Bell, CheckCircle, XCircle, Lock, Unlock, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration: number;
  participants: number;
  maxParticipants: number;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  subject: string;
  joinCode: string;
  isLocked: boolean;
  requireApproval: boolean;
  teacher: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface JoinRequest {
  id: string;
  studentName: string;
  requestedAt: string;
  meetingId: string;
  studentId: string;
}

export default function TutorMeetingDashboard() {
  const router = useRouter();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch tutor's meetings from API
  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchJoinRequests, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchJoinRequests = async () => {
    try {
      const allRequests: JoinRequest[] = [];
      for (const meeting of meetings) {
        const response = await fetch(`http://localhost:4000/meetings/${meeting.id}/join-requests`, {
          credentials: 'include'
        });
        if (response.ok) {
          const requests = await response.json();
          allRequests.push(...requests.map((req: any) => ({ 
            ...req, 
            meetingId: meeting.id,
            requestedAt: req.requestedAt
          })));
        }
      }
      setJoinRequests(allRequests);
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/meetings/visible', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const formattedMeetings = data.map((meeting: any) => ({
        id: meeting.id,
        title: meeting.title,
        description: meeting.description,
        scheduledAt: meeting.scheduledAt,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        duration: 60,
        participants: meeting.participantCount || 0,
        maxParticipants: 50,
        status: meeting.status,
        subject: meeting.subject || meeting.title.split(' ')[0],
        joinCode: meeting.roomName?.replace('room_', '').substring(0, 6).toUpperCase() || meeting.id.substring(0, 6).toUpperCase(),
        isLocked: meeting.isLocked || false,
        requireApproval: meeting.requireApproval || false,
        teacher: meeting.teacher || { id: '', fullName: '', email: '' }
      }));
      setMeetings(formattedMeetings);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const respondToJoinRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/join-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error('Failed to respond to join request');
      }

      toast({
        title: "Success",
        description: `Join request ${status.toLowerCase()}`,
      });
      
      setJoinRequests(prev => prev.filter(req => req.id !== requestId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to join request",
        variant: "destructive",
      });
    }
  };

  const toggleMeetingLock = async (meetingId: string, currentLockStatus: boolean) => {
    try {
      const endpoint = currentLockStatus ? 'unlock' : 'lock';
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/${endpoint}`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to ${currentLockStatus ? 'unlock' : 'lock'} meeting`);
      }

      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, isLocked: !currentLockStatus }
          : meeting
      ));

      toast({
        title: "Success",
        description: `Meeting ${currentLockStatus ? 'unlocked' : 'locked'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${currentLockStatus ? 'unlock' : 'lock'} meeting`,
        variant: "destructive",
      });
    }
  };

  const startOrJoinMeeting = async (meeting: Meeting) => {
    try {
      const endpoint = meeting.status === "LIVE" 
        ? `http://localhost:4000/meetings/${meeting.id}/join`
        : `http://localhost:4000/meetings/${meeting.id}/start`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ displayName: 'Tutor' })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to ${meeting.status === 'LIVE' ? 'join' : 'start'} meeting: ${response.status}`);
      }
      
      const data = await response.json();
      toast({
        title: "Success",
        description: `${meeting.status === 'LIVE' ? 'Joining' : 'Starting'} meeting...`,
      });
      
      // Redirect to meeting room with token and server URL
      router.push(`/tutor/meeting/join/${meeting.id}?token=${encodeURIComponent(data.token)}&serverUrl=${encodeURIComponent(data.serverUrl)}`);
      
      fetchMeetings();
    } catch (error: any) {
      console.error('Failed to start/join meeting:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${meeting.status === 'LIVE' ? 'join' : 'start'} meeting. Please try again.`,
        variant: "destructive",
      });
    }
  };

  const endMeeting = async (meetingId: string) => {
    if (!confirm('Are you sure you want to end this meeting?')) return;

    try {
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/end`, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Meeting ended successfully",
        });
        fetchMeetings();
      } else {
        throw new Error('Failed to end meeting');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end meeting",
        variant: "destructive",
      });
    }
  };

  const filteredMeetings = meetings.filter(meeting =>
    meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meeting.joinCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "LIVE": return "bg-green-500";
      case "SCHEDULED": return "bg-blue-500";
      case "ENDED": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "LIVE": return "Live";
      case "SCHEDULED": return "Scheduled";
      case "ENDED": return "Ended";
      default: return status;
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Join code copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Meeting Management</h1>
            <p className="text-slate-300">Create and manage proctored examinations</p>
          </div>
          <div className="flex gap-3">
            {joinRequests.length > 0 && (
              <div className="relative">
                <Button className="bg-yellow-600 hover:bg-yellow-700">
                  <Bell className="w-4 h-4 mr-2" />
                  Join Requests ({joinRequests.length})
                </Button>
              </div>
            )}
            <Button onClick={() => router.push('/tutor/meeting/create-meeting')} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Meeting
            </Button>
          </div>
        </div>

        {/* Join Requests Notifications */}
        {joinRequests.length > 0 && (
          <Card className="bg-yellow-500/10 border-yellow-500/20 p-4 mb-6">
            <h3 className="font-semibold mb-3 text-yellow-300">Pending Join Requests</h3>
            <div className="space-y-2">
              {joinRequests.map((request) => {
                const meeting = meetings.find(m => m.id === request.meetingId);
                return (
                  <div key={request.id} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                    <div>
                      <span className="font-medium">{request.studentName}</span>
                      <span className="text-sm text-gray-400 ml-2">
                        wants to join "{meeting?.title}"
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        Requested: {formatTime(request.requestedAt)}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToJoinRequest(request.id, 'APPROVED')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => respondToJoinRequest(request.id, 'REJECTED')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Search */}
        <div className="mb-6">
          <Input
            placeholder="Search meetings by title, subject, or join code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Meetings</p>
                <p className="text-xl font-bold">{meetings.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Live Now</p>
                <p className="text-xl font-bold">{meetings.filter(m => m.status === "LIVE").length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Scheduled</p>
                <p className="text-xl font-bold">{meetings.filter(m => m.status === "SCHEDULED").length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending Requests</p>
                <p className="text-xl font-bold">{joinRequests.length}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Meetings Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((meeting) => (
            <Card key={meeting.id} className="bg-white/5 border-white/10 p-6 hover:bg-white/10 transition-colors">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-white mb-1 line-clamp-2">{meeting.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                        {meeting.subject}
                      </Badge>
                      {meeting.requireApproval && (
                        <Badge variant="secondary" className="bg-orange-500/20 text-orange-300">
                          Approval Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                      {getStatusText(meeting.status)}
                    </Badge>
                    {meeting.status === "LIVE" && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {meeting.isLocked ? (
                            <Lock className="w-3 h-3 text-red-400" />
                          ) : (
                            <Unlock className="w-3 h-3 text-green-400" />
                          )}
                          <span className="text-xs text-gray-400">
                            {meeting.isLocked ? 'Locked' : 'Unlocked'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {meeting.description && (
                  <p className="text-sm text-gray-300 line-clamp-2">{meeting.description}</p>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {meeting.status === "SCHEDULED" 
                        ? `Scheduled: ${formatTime(meeting.scheduledAt)}`
                        : meeting.status === "LIVE"
                        ? `Started: ${meeting.startedAt ? formatTime(meeting.startedAt) : 'Recently'}`
                        : `Ended: ${meeting.endedAt ? formatTime(meeting.endedAt) : 'Unknown'}`
                      }
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{meeting.participants} participants</span>
                  </div>
                </div>

                {/* Join Code */}
                <div className="bg-white/5 p-3 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Join Code</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-white">{meeting.joinCode}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyJoinCode(meeting.joinCode)}
                      className="text-xs"
                    >
                      Copy
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {meeting.status === "LIVE" && (
                      <Button
                        onClick={() => toggleMeetingLock(meeting.id, meeting.isLocked)}
                        variant="outline"
                        className="flex-1"
                      >
                        {meeting.isLocked ? (
                          <>
                            <Unlock className="w-4 h-4 mr-2" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Lock
                          </>
                        )}
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => startOrJoinMeeting(meeting)}
                      className={`flex-1 ${
                        meeting.status === "LIVE" 
                          ? "bg-green-600 hover:bg-green-700" 
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                      disabled={meeting.status === "ENDED"}
                    >
                      {meeting.status === "LIVE" 
                        ? "Join Live" 
                        : meeting.status === "SCHEDULED"
                        ? "Start Meeting"
                        : "Ended"
                      }
                    </Button>

                    {meeting.status === "LIVE" && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => endMeeting(meeting.id)}
                      >
                        End
                      </Button>
                    )}
                  </div>

                  {/* View Report Button for Ended Meetings */}
                  {meeting.status === "ENDED" && (
                    <Button
                      onClick={() => router.push(`/tutor/meeting/${meeting.id}`)}
                      variant="outline"
                      className="w-full"
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      View Full Report
                    </Button>
                  )}
                </div>

                {/* Proctoring Status */}
                {meeting.status === "LIVE" && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-green-400">
                      <Eye className="w-3 h-3" />
                      <span>AI Proctoring Active</span>
                    </div>
                    <div className={`text-xs ${meeting.isLocked ? 'text-red-400' : 'text-green-400'}`}>
                      {meeting.isLocked ? 'New joins blocked' : 'Joins allowed'}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredMeetings.length === 0 && !loading && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No meetings found</h3>
            <p className="text-gray-400 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Create your first meeting to get started"}
            </p>
            {!searchTerm && (
              <Button onClick={() => router.push('/tutor/meeting/create-meeting')} className="bg-green-600 hover:bg-green-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Meeting
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}