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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6 flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3)] border border-orange-200/50">
          <div className="w-12 h-12 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-800">Loading meetings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 mb-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-orange-800 drop-shadow-sm">Meeting Management</h1>
              <p className="text-orange-600">Create and manage proctored examinations</p>
            </div>
            <div className="flex gap-3">
              {joinRequests.length > 0 && (
                <button className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2 drop-shadow-lg">
                  <Bell className="w-4 h-4" />
                  Join Requests ({joinRequests.length})
                </button>
              )}
              <button 
                onClick={() => router.push('/tutor/meeting/create-meeting')} 
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2 drop-shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Create Meeting
              </button>
            </div>
          </div>
        </div>

        {/* Join Requests Notifications */}
        {joinRequests.length > 0 && (
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 mb-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <h3 className="font-semibold mb-4 text-orange-800 text-lg">Pending Join Requests</h3>
            <div className="space-y-3">
              {joinRequests.map((request) => {
                const meeting = meetings.find(m => m.id === request.meetingId);
                return (
                  <div key={request.id} className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-orange-800">{request.studentName}</span>
                        <span className="text-sm text-orange-600 ml-2">
                          wants to join "{meeting?.title}"
                        </span>
                        <div className="text-xs text-orange-500 mt-1">
                          Requested: {formatTime(request.requestedAt)}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => respondToJoinRequest(request.id, 'APPROVED')}
                          className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 px-4 rounded-xl shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:shadow-[0_12px_40px_rgba(34,197,94,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-1 text-sm"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => respondToJoinRequest(request.id, 'REJECTED')}
                          className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-2 px-4 rounded-xl shadow-[0_8px_30px_rgba(239,68,68,0.4)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-1 text-sm"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <input
            placeholder="Search meetings by title, subject, or join code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Meetings</p>
                <p className="text-2xl font-bold text-orange-800">{meetings.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)]">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Live Now</p>
                <p className="text-2xl font-bold text-orange-800">{meetings.filter(m => m.status === "LIVE").length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(147,51,234,0.4)]">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Scheduled</p>
                <p className="text-2xl font-bold text-orange-800">{meetings.filter(m => m.status === "SCHEDULED").length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(251,191,36,0.4)]">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Pending Requests</p>
                <p className="text-2xl font-bold text-orange-800">{joinRequests.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Meetings Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((meeting) => (
            <div key={meeting.id} className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-orange-800 mb-2 line-clamp-2">{meeting.title}</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-3 py-1 rounded-xl text-xs font-medium shadow-[0_4px_15px_rgba(147,51,234,0.3)]">
                        {meeting.subject}
                      </span>
                      {meeting.requireApproval && (
                        <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-xl text-xs font-medium shadow-[0_4px_15px_rgba(251,146,60,0.3)]">
                          Approval Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-xl text-white text-xs font-medium shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${
                      meeting.status === "LIVE" ? "bg-gradient-to-r from-green-500 to-green-600" :
                      meeting.status === "SCHEDULED" ? "bg-gradient-to-r from-blue-500 to-blue-600" :
                      "bg-gradient-to-r from-gray-500 to-gray-600"
                    }`}>
                      {getStatusText(meeting.status)}
                    </span>
                    {meeting.status === "LIVE" && (
                      <div className="flex items-center gap-1">
                        {meeting.isLocked ? (
                          <Lock className="w-3 h-3 text-red-500" />
                        ) : (
                          <Unlock className="w-3 h-3 text-green-500" />
                        )}
                        <span className="text-xs text-orange-600 font-medium">
                          {meeting.isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {meeting.description && (
                  <p className="text-sm text-orange-600 line-clamp-2">{meeting.description}</p>
                )}

                {/* Details */}
                <div className="space-y-2 text-sm text-orange-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
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
                    <Users className="w-4 h-4 text-orange-500" />
                    <span>{meeting.participants} participants</span>
                  </div>
                </div>

                {/* Join Code */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                  <p className="text-xs text-orange-600 font-medium mb-2">Join Code</p>
                  <div className="flex items-center justify-between">
                    <code className="text-sm font-mono text-orange-800 font-semibold">{meeting.joinCode}</code>
                    <button
                      onClick={() => copyJoinCode(meeting.joinCode)}
                      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-1 px-3 rounded-xl shadow-[0_4px_15px_rgba(251,146,60,0.3)] hover:shadow-[0_6px_20px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300 text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2">
                    {meeting.status === "LIVE" && (
                      <button
                        onClick={() => toggleMeetingLock(meeting.id, meeting.isLocked)}
                        className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl py-3 px-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 text-orange-700 font-medium flex items-center justify-center gap-2"
                      >
                        {meeting.isLocked ? (
                          <>
                            <Unlock className="w-4 h-4" />
                            Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            Lock
                          </>
                        )}
                      </button>
                    )}
                    
                    <button
                      onClick={() => startOrJoinMeeting(meeting)}
                      disabled={meeting.status === "ENDED"}
                      className={`flex-1 font-semibold py-3 px-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 text-white drop-shadow-lg ${
                        meeting.status === "LIVE" 
                          ? "bg-gradient-to-r from-green-500 to-green-600" 
                          : meeting.status === "SCHEDULED"
                          ? "bg-gradient-to-r from-blue-500 to-blue-600"
                          : "bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {meeting.status === "LIVE" 
                        ? "Join Live" 
                        : meeting.status === "SCHEDULED"
                        ? "Start Meeting"
                        : "Ended"
                      }
                    </button>

                    {meeting.status === "LIVE" && (
                      <button 
                        onClick={() => endMeeting(meeting.id)}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-[0_8px_30px_rgba(239,68,68,0.4)] hover:shadow-[0_12px_40px_rgba(239,68,68,0.5)] hover:scale-105 transition-all duration-300"
                      >
                        End
                      </button>
                    )}
                  </div>

                  {/* View Report Button for Ended Meetings */}
                  {meeting.status === "ENDED" && (
                    <button
                      onClick={() => router.push(`/tutor/meeting/${meeting.id}`)}
                      className="w-full bg-white/80 backdrop-blur-xl rounded-2xl py-3 px-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 text-orange-700 font-medium flex items-center justify-center gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      View Full Report
                    </button>
                  )}
                </div>

                {/* Proctoring Status */}
                {meeting.status === "LIVE" && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-green-600 font-medium">
                      <Eye className="w-3 h-3" />
                      <span>AI Proctoring Active</span>
                    </div>
                    <div className={`text-xs font-medium ${meeting.isLocked ? 'text-red-600' : 'text-green-600'}`}>
                      {meeting.isLocked ? 'New joins blocked' : 'Joins allowed'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredMeetings.length === 0 && !loading && (
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-12 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
            <Video className="w-16 h-16 mx-auto mb-4 text-orange-400" />
            <h3 className="text-xl font-semibold mb-2 text-orange-800">No meetings found</h3>
            <p className="text-orange-600 mb-6">
              {searchTerm ? "Try adjusting your search terms" : "Create your first meeting to get started"}
            </p>
            {!searchTerm && (
              <button 
                onClick={() => router.push('/tutor/meeting/create-meeting')} 
                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Meeting
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}