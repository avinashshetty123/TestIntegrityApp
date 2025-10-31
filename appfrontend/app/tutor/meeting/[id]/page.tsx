"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Video, Users, Calendar, Clock, Play, Copy, ExternalLink } from "lucide-react";
import VideoCall from "../../../../components/VideoCall";

interface Meeting {
  id: string;
  title: string;
  description: string;
  status: string;
  scheduledAt: string;
  roomName: string;
  maxParticipants: number;
}

export default function MeetingDetails() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id as string;
  
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [meetingData, setMeetingData] = useState<{token: string; serverUrl: string} | null>(null);

  useEffect(() => {
    fetchMeeting();
  }, [meetingId]);

  const fetchMeeting = async () => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}`, {
        credentials: "include",
        headers: {},
      });

      if (response.ok) {
        const data = await response.json();
        setMeeting(data);
      }
    } catch (error) {
      console.error("Error fetching meeting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startMeeting = async () => {
    setIsStarting(true);
    try {
      const response = await fetch(`http://localhost:4000/meetings/${meetingId}/start`, {
        method: "POST",
        credentials: "include",
        headers: {},
      });

      if (response.ok) {
        const data = await response.json();
        setMeetingData({
          token: data.token,
          serverUrl: data.serverUrl,
        });
        setMeeting(prev => prev ? { ...prev, status: "LIVE" } : null);
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const copyJoinLink = () => {
    if (meetingData) {
      const joinUrl = `${window.location.origin}/tutor/meeting/join/${meetingId}?token=${encodeURIComponent(meetingData.token)}&serverUrl=${encodeURIComponent(meetingData.serverUrl)}`;
      navigator.clipboard.writeText(joinUrl);
      // You could add a toast notification here
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Meeting Not Found</h1>
          <button 
            onClick={() => router.push('/tutor')}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // If meeting is live and we have meeting data, show video call
  if (meeting.status === "LIVE" && meetingData) {
    return (
      <VideoCall 
        token={meetingData.token}
        serverUrl={meetingData.serverUrl}
        onDisconnect={() => {
          setMeetingData(null);
          setMeeting(prev => prev ? { ...prev, status: "SCHEDULED" } : null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Video className="w-8 h-8 text-blue-400" />
          <h1 className="text-3xl font-bold">{meeting.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm ${
            meeting.status === "LIVE" ? "bg-green-600" : 
            meeting.status === "SCHEDULED" ? "bg-yellow-600" : "bg-gray-600"
          }`}>
            {meeting.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Meeting Details</h2>
              
              {meeting.description && (
                <div className="mb-4">
                  <p className="text-gray-300">{meeting.description}</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-400" />
                  <span>
                    {meeting.scheduledAt 
                      ? new Date(meeting.scheduledAt).toLocaleString()
                      : "No scheduled time"
                    }
                  </span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Max {meeting.maxParticipants} participants</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Meeting Controls</h2>
              
              {meeting.status === "SCHEDULED" && (
                <button
                  onClick={startMeeting}
                  disabled={isStarting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {isStarting ? "Starting..." : "Start Meeting"}
                </button>
              )}

              {meeting.status === "LIVE" && meetingData && (
                <div className="space-y-3">
                  <button
                    onClick={copyJoinLink}
                    className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    Copy Join Link
                  </button>
                  
                  <p className="text-sm text-gray-400 text-center">
                    Share this link with participants to join the meeting
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Participants</h2>
            <div className="text-gray-400 text-center py-8">
              {meeting.status === "LIVE" 
                ? "Participants will appear here when they join"
                : "Meeting not started yet"
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}