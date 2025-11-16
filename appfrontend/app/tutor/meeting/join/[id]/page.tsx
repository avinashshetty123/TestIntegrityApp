"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import EnhancedTutorMeetingRoom from "@/components/EnhancedTutorMeetingRooom";

export default function TutorMeetingJoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(true);
  const [userIn, setUserIn] = useState({});

  const meetingId = params.id as string;
  const token = searchParams.get('token');
  const serverUrl = searchParams.get('serverUrl');
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

  useEffect(() => {
    if (!token || !serverUrl) {
      toast({
        title: "Error",
        description: "Missing connection parameters",
        variant: "destructive",
      });
      router.push('/tutor/meeting');
    } else {
      setIsConnecting(false);
    }
  }, [token, serverUrl, router, toast]);

  const handleDisconnect = () => {
    router.push('/tutor/meeting');
  };

  if (isConnecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to meeting...</p>
        </div>
      </div>
    );
  }

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Connection Error</h2>
          <Button onClick={() => router.push('/tutor/meeting')}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black">
      <EnhancedTutorMeetingRoom
        token={token}
        serverUrl={serverUrl}
        meetingId={meetingId}
        onDisconnect={handleDisconnect}
        userInfo={userIn}
      />
    </div>
  );
}