"use client";

import { useState } from "react";
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center p-6 font-['Inter']">
      <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-3xl shadow-2xl shadow-orange-200/50 p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2 text-gray-800 drop-shadow-sm">Join Meeting</h1>
          <p className="text-gray-600 font-medium">Enter the meeting code provided by your tutor</p>
        </div>

        <div className="space-y-6">
          <div>
            <input
              placeholder="Enter 6-digit code (e.g., ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-4 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 text-center text-lg font-mono placeholder-gray-500"
              maxLength={6}
            />
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handleJoin}
              disabled={loading || !joinCode.trim()}
              className={`flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg ${
                loading || !joinCode.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 shadow-green-200/50'
              }`}
            >
              {loading ? "Joining..." : "Join Meeting"}
            </button>
            <button 
              onClick={onCancel}
              className="flex-1 px-6 py-4 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-semibold hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}