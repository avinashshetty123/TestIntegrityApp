"use client";

import { useEffect, useState } from "react";
import { LiveKitWrapper } from "@/components/hooks/useLivekitRoom";
import {
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

export default function TutorMeeting({
  params,
}: {
  params: { id: string };
}) {
  const [meetingData, setMeetingData] = useState<any>(null);
  const [suspicious, setSuspicious] = useState<string[]>([]);

  useEffect(() => {
    async function joinMeeting() {
      const res = await fetch(`http://localhost:4000/meetings/${params.id}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Tutor" }),
      });

      if (!res.ok) {
        console.error("Failed to join meeting");
        return;
      }

      const data = await res.json();
      setMeetingData(data);
    }
    joinMeeting();
  }, [params.id]);

  // Example suspicious detection
  useEffect(() => {
    const handleBlur = () => {
      setSuspicious((prev) => [...prev, "student-123"]);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  if (!meetingData) return <p>Loading...</p>;

  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: true },
  ]);

  return (
    <LiveKitWrapper token={meetingData.token} serverUrl={meetingData.serverUrl}>
      <div className="h-screen w-full p-4 bg-gray-100">
        <h2 className="text-2xl font-bold mb-4">Students Monitoring</h2>

        {/* Suspicious students */}
        {suspicious.length > 0 && (
          <div className="p-4 bg-red-100 rounded mb-4">
            <h3 className="font-semibold text-red-700">Suspicious Students</h3>
            <div className="flex gap-4 mt-2">
              {suspicious.map((id) => (
                <div
                  key={id}
                  className="border-2 border-red-600 rounded-lg p-2 bg-white"
                >
                  <ParticipantTile />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid of all students */}
        <GridLayout tracks={tracks} style={{ height: "80%", width: "100%" }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    </LiveKitWrapper>
  );
}
