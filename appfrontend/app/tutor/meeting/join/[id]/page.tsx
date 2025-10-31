"use client";

import { useSearchParams, useRouter } from "next/navigation";
import VideoCall from "../../../../../components/VideoCall";

export default function JoinMeeting() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const serverUrl = searchParams.get("serverUrl");

  if (!token || !serverUrl) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Meeting Link</h1>
          <p className="text-gray-400 mb-6">Missing token or server URL</p>
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

  return (
    <VideoCall 
      token={token} 
      serverUrl={decodeURIComponent(serverUrl)}
      onDisconnect={() => router.push('/tutor')}
    />
  );
}
