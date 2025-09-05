"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Peer from "peerjs";
import * as faceapi from "face-api.js";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Maximize,
  Minimize,
  LogOut,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MeetingRoom() {
  const [inMeeting, setInMeeting] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [peers, setPeers] = useState<{ [id: string]: MediaStream }>({});
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [time, setTime] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<{ [id: string]: any }>({});
  const canvasRefs = useRef<{ [id: string]: HTMLCanvasElement }>({});

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri('/models/face_expression_model-weights_manifest.json');
      await faceapi.nets.faceLandmark68Net.loadFromUri('/models/face_landmark_68_model-weights_manifest.json');
      await faceapi.nets.faceExpressionNet.loadFromUri('/models/tiny_face_detector_model-weights_manifest.json');
      console.log("✅ Face-api models loaded");
    };
    loadModels();
  }, []);

  // Meeting timer
  useEffect(() => {
    if (!inMeeting) return;
    const timer = setInterval(() => setTime((t: number) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [inMeeting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Fullscreen toggle
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  // Start / Join Meeting
  const startMeeting = async (host: boolean) => {
    setIsHost(host);
    setInMeeting(true);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    myStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const peer = new Peer();

    peer.on("open", (id: string) => {
      console.log("My peer ID:", id);
      if (host) setRoomId(id);
      else {
        const call = peer.call(roomId, stream);
        call.on("stream", (remoteStream: MediaStream) =>
          addPeerStream(call.peer, remoteStream)
        );
        peersRef.current[call.peer] = call;
      }
    });

    peer.on("call", (call: any) => {
      call.answer(stream);
      call.on("stream", (remoteStream: MediaStream) =>
        addPeerStream(call.peer, remoteStream)
      );
      peersRef.current[call.peer] = call;
    });
  };

  const addPeerStream = (peerId: string, stream: MediaStream) => {
    setPeers((prev) => ({ ...prev, [peerId]: stream }));
    setTimeout(() => runFaceDetection(peerId), 500);
  };

  const runFaceDetection = async (peerId: string) => {
    const canvas = canvasRefs.current[peerId];
    const video = document.getElementById(`video-${peerId}`) as HTMLVideoElement;
    if (!video || !canvas) return;

    video.addEventListener("loadedmetadata", () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    });

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      if (video.paused || video.ended) return;
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      const resized = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resized);
      faceapi.draw.drawFaceExpressions(canvas, resized);
    }, 1000);
  };

  const leaveMeeting = () => {
    myStreamRef.current?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    Object.values(peersRef.current).forEach((call: any) => call.close());
    setInMeeting(false);
    setPeers({});
    setTime(0);
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col items-center p-4">
      {!inMeeting ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-lg"
        >
          <h1 className="text-4xl font-bold mb-6">Multi-User Meeting</h1>
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => startMeeting(true)}
              className="px-6 py-3 bg-black text-white text-lg rounded-xl"
            >
              Start as Host
            </Button>
            <input
              type="text"
              placeholder="Enter Room ID"
              className="px-4 py-2 border rounded-xl text-lg"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <Button
              onClick={() => startMeeting(false)}
              className="px-6 py-3 bg-blue-600 text-white text-lg rounded-xl"
            >
              Join Meeting
            </Button>
          </div>
          {isHost && <p className="mt-2 text-gray-500 text-lg">Room ID: {roomId}</p>}
        </motion.div>
      ) : (
        <>
          {/* Top bar */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center justify-between w-full px-6 py-4 bg-white shadow-md rounded-xl mb-4"
          >
            <h1 className="text-3xl font-bold">Meeting Room</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-600 text-lg">
                <Clock className="w-6 h-6" />
                {formatTime(time)}
              </div>
              <Button onClick={() => {
                if (!document.fullscreenElement) document.documentElement.requestFullscreen();
                else document.exitFullscreen();
                setIsFullScreen(!isFullScreen);
              }} variant="outline" className="text-lg">
                {isFullScreen ? <Minimize /> : <Maximize />}
              </Button>
              <Button onClick={leaveMeeting} variant="destructive" className="text-lg">
                <LogOut /> Leave
              </Button>
            </div>
          </motion.div>

          {/* Videos */}
          <div className="flex flex-wrap gap-6 justify-center w-full">
            {/* Local */}
            <div className="relative w-96 h-72 bg-black rounded-2xl overflow-hidden shadow-lg">
              <video
                ref={localVideoRef}
                autoPlay
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded-lg text-lg">
                You
              </div>
            </div>

            {/* Remote participants */}
            {Object.entries(peers).map(([peerId, stream]) => (
              <div
                key={peerId}
                className="relative w-96 h-72 bg-gray-800 rounded-2xl overflow-hidden shadow-lg"
              >
                <video
                  id={`video-${peerId}`}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  ref={(video) => {
                    if (video) video.srcObject = stream;
                  }}
                />
                <canvas
                  ref={(canvas) => {
                    if (canvas) canvasRefs.current[peerId] = canvas;
                  }}
                  className="absolute top-0 left-0 w-full h-full"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-white px-3 py-1 rounded-lg text-lg">
                  {peerId}
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex gap-6 mt-6"
          >
            <Button
              variant={isMuted ? "destructive" : "outline"}
              className="rounded-full w-16 h-16 flex items-center justify-center"
              onClick={() => {
                (localVideoRef.current?.srcObject as MediaStream | null)
                  ?.getAudioTracks()
                  .forEach((track: MediaStreamTrack) => (track.enabled = !track.enabled));
                setIsMuted(!isMuted);
              }}
            >
              {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
            </Button>

            <Button
              variant={cameraOn ? "outline" : "destructive"}
              className="rounded-full w-16 h-16 flex items-center justify-center"
              onClick={() => {
                (localVideoRef.current?.srcObject as MediaStream | null)
                  ?.getVideoTracks()
                  .forEach((track: MediaStreamTrack) => (track.enabled = !track.enabled));
                setCameraOn(!cameraOn);
              }}
            >
              {cameraOn ? <Video className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
            </Button>

            <Button
              variant="destructive"
              className="rounded-full w-16 h-16 flex items-center justify-center"
              onClick={leaveMeeting}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>
          </motion.div>
        </>
      )}
    </div>
  );
}
