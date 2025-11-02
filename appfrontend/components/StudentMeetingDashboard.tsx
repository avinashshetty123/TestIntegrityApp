"use client";

import { useState, useEffect } from "react";
import { Search, Video, Clock, Users, Building2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Meeting {
  id: string;
  title: string;
  institution: string;
  tutorName: string;
  scheduledTime: string;
  duration: number;
  participants: number;
  maxParticipants: number;
  status: "upcoming" | "live" | "ended";
  subject: string;
}

interface StudentMeetingDashboardProps {
  onJoinMeeting: (meetingId: string, token: string, serverUrl: string) => void;
}

interface JoinMeetingResponse {
  meeting: any;
  token: string;
  serverUrl: string;
}

export default function StudentMeetingDashboard({ onJoinMeeting }: StudentMeetingDashboardProps) {
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "live">("all");

  // Fetch meetings from API
  useEffect(() => {
    fetchMeetings();
  }, []);

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
        institution: meeting.institution || meeting.teacher?.institutionName || 'Institution',
        tutorName: meeting.teacher ? `${meeting.teacher.firstName || ''} ${meeting.teacher.lastName || ''}`.trim() || meeting.teacher.fullName : 'Tutor',
        scheduledTime: meeting.scheduledAt,
        duration: 60,
        participants: 0,
        maxParticipants: 10,
        status: meeting.status === 'LIVE' ? 'live' : 'upcoming',
        subject: meeting.subject || meeting.title.split(' ')[0]
      })));
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast({
        title: "Error",
        description: "Failed to load meetings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.institution.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.tutorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         meeting.subject.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesInstitution = !institutionFilter || 
                              meeting.institution.toLowerCase().includes(institutionFilter.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || meeting.status === statusFilter;
    
    return matchesSearch && matchesInstitution && matchesStatus;
  });

  const institutions = [...new Set(meetings.map(m => m.institution))];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live": return "bg-green-500";
      case "upcoming": return "bg-blue-500";
      case "ended": return "bg-gray-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Available Meetings</h1>
          <p className="text-slate-300">Join proctored examinations and interviews</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search meetings, institutions, tutors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white"
            >
              <option value="">All Institutions</option>
              {institutions.map(inst => (
                <option key={inst} value={inst} className="text-black">{inst}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2 bg-white/10 border border-white/20 rounded-md text-white"
            >
              <option value="all" className="text-black">All Status</option>
              <option value="live" className="text-black">Live Now</option>
              <option value="upcoming" className="text-black">Upcoming</option>
            </select>
          </div>
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
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <Building2 className="w-4 h-4" />
                      <span>{meeting.institution}</span>
                    </div>
                  </div>
                  <Badge className={`${getStatusColor(meeting.status)} text-white`}>
                    {meeting.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>Tutor: {meeting.tutorName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{formatTime(meeting.scheduledTime)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>{meeting.participants}/{meeting.maxParticipants} participants</span>
                  </div>
                </div>

                {/* Subject Badge */}
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  {meeting.subject}
                </Badge>

                {/* Action Button */}
                <Button
                  onClick={async () => {
                    try {
                      const response = await fetch(`http://localhost:4000/meetings/${meeting.id}/join`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({ displayName: 'Student' })
                      });
                      
                      if (!response.ok) {
                        if (response.status === 403) {
                          throw new Error('Meeting access denied. Please check if the meeting is available.');
                        }
                        const errorData = await response.json().catch(() => ({}));
                        throw new Error(errorData.message || `Failed to join meeting (${response.status})`);
                      }
                      
                      const data = await response.json();
                      toast({
                        title: "Success",
                        description: "Joining meeting...",
                      });
                      onJoinMeeting(meeting.id, data.token, data.serverUrl);
                    } catch (error: any) {
                      console.error('Failed to join meeting:', error);
                      toast({
                        title: "Error",
                        description: error.message || "Failed to join meeting. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={meeting.status === "ended"}
                  className={`w-full ${
                    meeting.status === "live" 
                      ? "bg-green-600 hover:bg-green-700" 
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {meeting.status === "live" ? "Join Now" : "Join Meeting"}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {filteredMeetings.length === 0 && (
          <div className="text-center py-12">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No meetings found</h3>
            <p className="text-gray-400">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}