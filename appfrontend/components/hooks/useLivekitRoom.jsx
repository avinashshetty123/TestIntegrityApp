"use client";

import { useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";

export function LiveKitWrapper({ token, serverUrl, children }) {
  const [connected, setConnected] = useState(false);

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onConnected={() => setConnected(true)}
      onDisconnected={() => setConnected(false)}
      style={{ height: "100vh", width: "100vw" }}
    >
      {connected ? children : <p>Connecting...</p>}
    </LiveKitRoom>
  );
}
