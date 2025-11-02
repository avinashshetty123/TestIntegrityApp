"use client";

import { useState } from "react";
import StudentMeetingDashboard from "@/components/StudentMeetingDashboard";
import MeetingRoom from "@/components/MeetingRoom";

export default function MeetingPage() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'meeting'>('dashboard');
  const [meetingData, setMeetingData] = useState<{
    meetingId: string;
    token: string;
    serverUrl: string;
  } | null>(null);

  const handleJoinMeeting = (meetingId: string, token: string, serverUrl: string) => {
    setMeetingData({ meetingId, token, serverUrl });
    setCurrentView('meeting');
  };

  const handleLeaveMeeting = () => {
    setMeetingData(null);
    setCurrentView('dashboard');
  };

  if (currentView === 'meeting' && meetingData) {
    return (
      <MeetingRoom
        token={meetingData.token}
        serverUrl={meetingData.serverUrl}
        onDisconnect={handleLeaveMeeting}
      />
    );
  }

  return (
    <StudentMeetingDashboard onJoinMeeting={handleJoinMeeting} />
  );
}