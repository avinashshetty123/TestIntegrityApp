"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  PlusCircle,
  PlayCircle,
  Video,
  Calendar,
  Loader2,
  Eye,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function TutorMeetingsPage() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const viewMeeting = (id: string) => {
    router.push(`/tutor/meeting/${id}`);
  };

  const createNewMeeting = () => {
    router.push('/tutor/meeting/create-meeting');
  };

  const startMeeting = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/${id}/start`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to join the meeting as tutor
        const joinUrl = `/tutor/meeting/join/${id}?token=${encodeURIComponent(data.token)}&serverUrl=${encodeURIComponent(data.serverUrl)}`;
        router.push(joinUrl);
      } else {
        console.error("Failed to start meeting");
      }
    } catch (error) {
      console.error("Error starting meeting:", error);
    }
  };

  const joinMeeting = async (id: string) => {
    try {
      const response = await fetch(`http://localhost:4000/meetings/${id}/join`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: "Tutor" }),
      });

      if (response.ok) {
        const data = await response.json();
        const joinUrl = `/tutor/meeting/join/${id}?token=${encodeURIComponent(data.token)}&serverUrl=${encodeURIComponent(data.serverUrl)}`;
        router.push(joinUrl);
      } else {
        console.error("Failed to join meeting");
      }
    } catch (error) {
      console.error("Error joining meeting:", error);
    }
  };
  // Fetch all meetings
  async function fetchMeetings() {
    try {
      const res = await fetch("http://localhost:4000/meetings/visible", {
        credentials: "include",
        headers: {},
      });

      if (!res.ok) {
        console.error("Failed to fetch meetings", res.status);
        return;
      }

      const data = await res.json();
      setMeetings(Array.isArray(data) ? data : []); // safeguard
    } catch (err) {
      console.error("Error fetching meetings:", err);
    }
  }





  useEffect(() => {
    fetchMeetings();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold mb-6 flex items-center gap-2"
      >
        <Video className="w-8 h-8 text-indigo-600" />
        Tutor Meetings
      </motion.h1>

      {/* Create meeting button */}
      <div className="mb-6">
        <Button
          onClick={createNewMeeting}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Meeting
        </Button>
      </div>

      {/* Meetings list */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {meetings.map((m) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="shadow-md hover:shadow-xl transition-all border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{m.title}</span>
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{m.description}</p>
                <p className="text-xs text-gray-400">
                  Scheduled:{" "}
                  {m.scheduledAt
                    ? new Date(m.scheduledAt).toLocaleString()
                    : "Not set"}
                </p>
                <p className="text-xs mt-1">
                  Status:{" "}
                  <span
                    className={`font-semibold ${
                      m.status === "LIVE"
                        ? "text-green-600"
                        : m.status === "SCHEDULED"
                        ? "text-blue-600"
                        : "text-gray-600"
                    }`}
                  >
                    {m.status}
                  </span>
                </p>
                <div className="mt-4 space-y-2">
                  {m.status === "SCHEDULED" && (
                    <Button
                      onClick={() => startMeeting(m.id)}
                      className="flex items-center gap-2 w-full bg-green-600 hover:bg-green-700"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Start Meeting
                    </Button>
                  )}
                  
                  {m.status === "LIVE" && (
                    <Button
                      onClick={() => joinMeeting(m.id)}
                      className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <Video className="w-4 h-4" />
                      Join Meeting
                    </Button>
                  )}
                  
                  <Button
                    onClick={() => viewMeeting(m.id)}
                    variant="outline"
                    className="flex items-center gap-2 w-full"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
