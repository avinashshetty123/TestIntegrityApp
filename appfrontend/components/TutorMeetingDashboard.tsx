"use client";

import { useState, useEffect } from "react";
import { Plus, Users, Clock, Video, Settings, Eye, AlertTriangle, Bell, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Meeting {
  id: string;
  title: string;
  scheduledTime: string;
  duration: number;
  participants: number;
  maxParticipants: number;
  status: "scheduled" | "live" | "ended";
  subject: string;
  joinCode: string;
}

interface JoinRequest {
  id: string;
  studentName: string;
  requestedAt: string;
  meetingId: string;
}

interface TutorMeetingDashboardProps {
  onCreateMeeting?: () => void;
  onStartMeeting?: (meetingId: string, token: string, serverUrl: string) => void;
}

export default function TutorMeetingDashboard({ onCreateMeeting, onStartMeeting }: TutorMeetingDashboardProps) {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

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
          allRequests.push(...requests.map((req: any) => ({ ...req, meetingId: meeting.id })));
        }
      }
      setJoinRequests(allRequests);
    } catch (error) {
      console.error('Failed to fetch join requests:', error);
    }
  };

  const respondToJoinRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await fetch(`http://localhost:4000/meetings/join-request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      toast({
        title: "Success",
        description: `Join request ${status.toLowerCase()}`,
      });
      fetchJoinRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to respond to join request",
        variant: "destructive",
      });
    }
  };

  const fetchMeetings = async () => {
    try {
      const response = await fetch('http://localhost:4000/meetings/visible', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setMeetings(data.map((meeting: any) => ({
        id: meeting.id,
        title: meeting.title,
        scheduledTime: meeting.scheduledAt,
        duration: 60,
        participants: 0,
        maxParticipants: 10,
        status: meeting.status === 'LIVE' ? 'live' : 'scheduled',
        subject: meeting.subject || meeting.title.split(' ')[0],
        joinCode: meeting.roomName?.replace('room_', '').substring(0, 6).toUpperCase() || meeting.id.substring(0, 6).toUpperCase()
      })));
      fetchJoinRequests();
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings. Please try again.",
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
      case "live": return "bg-green-500";
      case "scheduled": return "bg-blue-500";
      case "ended": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code);
    // You could add a toast notification here
  };

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
            <Button onClick={() => onCreateMeeting?.()} className="bg-green-600 hover:bg-green-700">
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
                      <span className="text-sm text-gray-400 ml-2">wants to join "{meeting?.title}"</span>
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
                <p className="text-xl font-bold">{meetings.filter(m => m.status === "live").length}</p>
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
                <p className="text-xl font-bold">{meetings.filter(m => m.status === "scheduled").length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="bg-white/5 border-white/10 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Participants</p>
                <p className="text-xl font-bold">{meetings.reduce((sum, m) => sum + m.participants, 0)}</p>
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
                    <h3 className="font-semibold text-lg text-white mb-1">{meeting.title}</h3>
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                      {meeting.subject}
                    </Badge>
                  </div>
                  <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                    {meeting.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(meeting.scheduledTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{meeting.participants}/{meeting.maxParticipants} participants</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>{meeting.duration} minutes</span>
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
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const endpoint = meeting.status === "live" 
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
                          throw new Error(errorData.message || `Failed to ${meeting.status === 'live' ? 'join' : 'start'} meeting: ${response.status}`);
                        }
                        
                        const data = await response.json();
                        toast({
                          title: "Success",
                          description: `${meeting.status === 'live' ? 'Joining' : 'Starting'} meeting...`,
                        });
                        onStartMeeting?.(meeting.id, data.token, data.serverUrl);
                        fetchMeetings(); // Refresh meetings
                      } catch (error: any) {
                        console.error('Failed to start/join meeting:', error);
                        toast({
                          title: "Error",
                          description: error.message || `Failed to ${meeting.status === 'live' ? 'join' : 'start'} meeting. Please try again.`,
                          variant: "destructive",
                        });
                      }
                    }}
                    className={`flex-1 ${
                      meeting.status === "live" 
                        ? "bg-green-600 hover:bg-green-700" 
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {meeting.status === "live" ? "Join Live" : "Start Meeting"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      if (confirm('Are you sure you want to delete this meeting?')) {
                        try {
                          const response = await fetch(`http://localhost:4000/meetings/${meeting.id}`, {
                            method: 'DELETE',
                            credentials: 'include'
                          });
                          
                          if (response.ok) {
                            toast({
                              title: "Success",
                              description: "Meeting deleted successfully",
                            });
                            fetchMeetings();
                          } else {
                            throw new Error('Failed to delete meeting');
                          }
                        } catch (error: any) {
                          toast({
                            title: "Error",
                            description: error.message || "Failed to delete meeting",
                            variant: "destructive",
                          });
                        }
                      }
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </Button>
                </div>

                {/* Proctoring Status */}
                {meeting.status === "live" && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <Eye className="w-3 h-3" />
                    <span>AI Proctoring Active</span>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No meetings found</h3>
            <p className="text-gray-400 mb-4">Create your first meeting to get started</p>
            <Button onClick={() => onCreateMeeting?.()} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create Meeting
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}