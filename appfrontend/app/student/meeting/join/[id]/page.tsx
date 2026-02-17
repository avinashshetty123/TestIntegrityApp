"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import StreamlinedStudentMeeting from "@/components/StreamlinedStudentMeeting";
import EnhancedStudentMeetingRoom from "@/components/StudentMeeting";

export default function StudentMeetingJoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isConnecting, setIsConnecting] = useState(true);
  const [userIn, setUserIn] = useState({});

  const meetingId = params.id as string;
  const token = searchParams.get("token");
  const serverUrl = searchParams.get("serverUrl");

  // Validate URL params
  useEffect(() => {
    if (!token || !serverUrl) {
      toast({
        title: "Error",
        description: "Missing connection parameters",
        variant: "destructive",
      });
      router.push("/student/meeting");
    } else {
      setIsConnecting(false);
    }
  }, [token, serverUrl, router, toast]);

  // Fetch user info
  async function getUserInfo() {
    try {
      const response = await fetch("http://localhost:4000/user/profile", {
        credentials: "include",
      });

      if (response.ok) {
        const userInfo = await response.json();
        setUserIn(userInfo);
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getUserInfo();
  }, []);

  // UI states
  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 font-['Inter'] flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
          <div className="w-12 h-12 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-blue-300 font-medium">Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 font-['Inter'] flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 shadow-2xl border border-white/20 text-center">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Connection Error</h2>
          <button 
            onClick={() => router.push("/student/meeting")}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-xl hover:scale-105 transition-all duration-300"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 font-['Inter']">
      <EnhancedStudentMeetingRoom
        token={token}
        serverUrl={serverUrl}
        meetingId={meetingId}
        onDisconnect={() => router.push("/student/meeting")}
        userInfo={userIn}
      />
    </div>
  );
}
