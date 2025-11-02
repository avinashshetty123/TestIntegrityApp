"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface JoinByCodeProps {
  onJoinMeeting: (meetingId: string, token: string, serverUrl: string) => void;
  onCancel: () => void;
}

export default function JoinByCode({ onJoinMeeting, onCancel }: JoinByCodeProps) {
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a join code",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:4000/meetings/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          joinCode: joinCode.trim(),
          displayName: 'Student'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid join code');
      }

      const { meeting, token, serverUrl } = await response.json();
      toast({
        title: "Success",
        description: `Joining ${meeting.title}...`,
      });
      
      onJoinMeeting(meeting.id, token, serverUrl);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join meeting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white flex items-center justify-center p-6">
      <Card className="bg-white/5 border-white/10 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Join Meeting</h1>
          <p className="text-gray-300">Enter the meeting code provided by your tutor</p>
        </div>

        <div className="space-y-4">
          <div>
            <Input
              placeholder="Enter 6-digit code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="bg-white/10 border-white/20 text-white text-center text-lg font-mono"
              maxLength={6}
            />
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? "Joining..." : "Join Meeting"}
            </Button>
            <Button 
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}