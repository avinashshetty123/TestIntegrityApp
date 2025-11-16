"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Connecting to meeting...</p>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Connection Error</h2>
          <Button onClick={() => router.push("/tutor/meeting")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
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
