"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MessageSquare,
  MonitorUp,
  LogOut,
  Maximize,
  Minimize,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as faceapi from "face-api.js";

export default function MeetingRoom() {
  const [isMuted, setIsMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [time, setTime] = useState(0);
  const [inMeeting, setInMeeting] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load FaceAPI models
  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceExpressionNet.loadFromUri("/models");
    };
    loadModels();
  }, []);

  // Meeting timer
  useEffect(() => {
    if (!inMeeting) return;
    const timer = setInterval(() => setTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [inMeeting]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const handleLeave = () => {
    setInMeeting(false);
    setTime(0);
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const startMeeting = async (host = false) => {
    setInMeeting(true);
    setIsHost(host);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // 🔹 For participants, run face detection
      if (!host) {
        runFaceDetection();
      }
    } catch (err) {
      console.error("Error accessing camera/microphone:", err);
    }
  };

  // Face Detection (Participants only)
  const runFaceDetection = async () => {
    if (!remoteVideoRef.current || !canvasRef.current) return;

    const video = remoteVideoRef.current;
    const canvas = canvasRef.current;
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      if (!video.paused && !video.ended) {
        const detections = await faceapi
          .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks()
          .withFaceExpressions();

        const resized = faceapi.resizeResults(detections, displaySize);
        canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceExpressions(canvas, resized);
      }
    }, 1000);
  };

  // If no meeting started
  if (!inMeeting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-10 max-w-lg"
        >
          <h1 className="text-3xl font-bold mb-4">No Active Meeting</h1>
          <p className="text-lg text-gray-600 mb-6">
            Start a new meeting or join one.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => startMeeting(true)}
              className="px-8 py-3 text-lg rounded-xl bg-black text-white hover:bg-gray-900"
            >
              Start as Host
            </Button>
            <Button
              onClick={() => startMeeting(false)}
              className="px-8 py-3 text-lg rounded-xl bg-blue-600 text-white hover:bg-blue-700"
            >
              Join as Participant
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Meeting UI
  return (
    <div className="min-h-screen w-screen flex flex-col bg-gray-100">
      {/* Top bar */}
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between px-8 py-5 border-b bg-white shadow-sm text-xl"
      >
        <h1 className="font-bold text-2xl">Meeting Room</h1>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{formatTime(time)}</span>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl flex gap-2">
            <MonitorUp className="w-5 h-5" /> Share Screen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl flex gap-2"
            onClick={toggleFullScreen}
          >
            {isFullScreen ? (
              <>
                <Minimize className="w-5 h-5" /> Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize className="w-5 h-5" /> Fullscreen
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl flex gap-2"
            onClick={handleLeave}
          >
            <LogOut className="w-5 h-5" /> Leave
          </Button>
        </div>
      </motion.div>

      {/* Video area */}
      <div className="flex-1 grid md:grid-cols-2 gap-4 p-6 bg-black">
        {/* Host / Your Video */}
        <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover rounded-2xl"
          />
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-lg">
            {isHost ? "Host (You)" : "You"}
          </div>
        </div>

        {/* Remote Participant */}
        {!isHost && (
          <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-lg">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover rounded-2xl"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full"
            />
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-lg text-lg">
              Other Participant
            </div>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-center gap-8 py-5 bg-white border-t shadow-md"
      >
        <Button
          variant={isMuted ? "destructive" : "outline"}
          className="rounded-full w-16 h-16 flex items-center justify-center"
          onClick={() => setIsMuted(!isMuted)}
        >
          {isMuted ? <MicOff className="w-7 h-7" /> : <Mic className="w-7 h-7" />}
        </Button>

        <Button
          variant={cameraOn ? "outline" : "destructive"}
          className="rounded-full w-16 h-16 flex items-center justify-center"
          onClick={() => setCameraOn(!cameraOn)}
        >
          {cameraOn ? <Video className="w-7 h-7" /> : <VideoOff className="w-7 h-7" />}
        </Button>

        <Button
          variant="destructive"
          className="rounded-full w-16 h-16 flex items-center justify-center"
          onClick={handleLeave}
        >
          <PhoneOff className="w-7 h-7" />
        </Button>

        <Button
          variant={showChat ? "destructive" : "outline"}
          className="rounded-full w-16 h-16 flex items-center justify-center"
          onClick={() => setShowChat(!showChat)}
        >
          <MessageSquare className="w-7 h-7" />
        </Button>
      </motion.div>
    </div>
  );
}
