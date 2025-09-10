"use client";

import { useEffect, useState } from "react";
import { LiveKitWrapper } from "@/components/hooks/useLivekitRoom";
import {
  GridLayout,
  ParticipantTile,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

import { useRouter } from "next/navigation";

export default function StudentMeeting({
  params,
}: {
  params: { id: string };
}) {
  const [meetingData, setMeetingData] = useState<any>(null);
  const route=useRouter();

  useEffect(() => {
    async function joinMeeting() {
      const res = await fetch(`http://localhost:4000/meetings/${params.id}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Student User" }),
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

  if (!meetingData) return route.push("/not-found");

  return (
    <LiveKitWrapper token={meetingData.token} serverUrl={meetingData.serverUrl}>
      <div className="grid grid-cols-2 h-screen">
        {/* Left: Tutor video */}
        <div className="bg-black flex items-center justify-center">
          <GridLayout
            tracks={useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])}
            style={{ height: "100%", width: "100%" }}
          >
            <ParticipantTile />
          </GridLayout>
        </div>

        {/* Right: Test UI */}
        <div className="p-6 overflow-y-auto bg-white">
          <h2 className="text-xl font-bold mb-4">Test Questions</h2>
          <div className="space-y-4">
            <div>
              <p>Q1: Explain polymorphism in OOP.</p>
              <textarea className="w-full border p-2 rounded"></textarea>
            </div>
            <div>
              <p>Q2: What is the difference between SQL and NoSQL?</p>
              <textarea className="w-full border p-2 rounded"></textarea>
            </div>
          </div>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
            Submit Answers
          </button>
        </div>
      </div>
    </LiveKitWrapper>
  );
}
