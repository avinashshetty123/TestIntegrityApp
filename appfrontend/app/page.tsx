"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Calendar,
  FileText,
  Settings,
  Users,
  FolderOpen,
  PlayCircle,
  Apple,
  Video,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";

const dockItems = [
  { icon: Users, label: "meeting", path: "/meeting" },
  { icon: Calendar, label: "Schedule", path: "/schedule" },
  { icon: PlayCircle, label: "Records", path: "/records" },
  { icon: FolderOpen, label: "Files", path: "/files" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function Home() {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showMenu, setShowMenu] = useState(false);

  // ✅ Redirect if not authenticated
  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (!isLoggedIn) {
      router.push("/signIn");
    }
  }, [router]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-black text-white font-[Inter]">
      {/* Top Menu Bar */}
      <div className="fixed top-0 left-0 w-full backdrop-blur-xl bg-white/5 border-b border-white/10 z-50 flex items-center justify-between px-6 py-3 text-sm shadow-lg">
        {/* Left Logo */}
        <div className="flex items-center gap-3">
          <Apple className="w-5 h-5 text-blue-400" />
          <span className="font-semibold tracking-wide">MeetApp</span>
        </div>

        {/* Right Options */}
        <div className="flex items-center gap-6 text-slate-300">
          <span className="font-medium">{currentTime.toLocaleTimeString()}</span>
          <span className="text-slate-400">{currentTime.toLocaleDateString()}</span>

          {/* Profile Avatar */}
          <div className="relative">
            <div
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-purple-400 transition"
            >
              <User className="w-5 h-5" />
            </div>
            {showMenu && (
              <div className="absolute right-0 mt-3 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-lg overflow-hidden text-sm">
                <div
                  onClick={() => {
                    router.push("/profile");
                  }}
                  className="px-4 py-3 hover:bg-white/10 cursor-pointer"
                >
                  Profile
                </div>
                <div
                  onClick={() => {
                    router.push("/setting");
                  }}
                  className="px-4 py-3 hover:bg-white/10 cursor-pointer"
                >
                  Settings
                </div>
                <div
                  onClick={() => {
                    localStorage.removeItem("isLoggedIn");
                    router.push("/signIn");
                  }}
                  className="px-4 py-3 hover:bg-white/10 cursor-pointer flex items-center gap-2 text-red-400"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="pt-24 pb-28 px-8 grid grid-cols-3 gap-6">
        {/* Welcome Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="col-span-2 rounded-2xl p-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 shadow-2xl hover:shadow-[0_0_30px_rgba(59,130,246,0.3)] transition"
        >
          <h2 className="text-3xl font-bold mb-3">Welcome Back 👋</h2>
          <p className="text-slate-300 text-base">
            Ready to start your next secure meeting?
          </p>
          <div className="flex gap-4 mt-6">
            <Link href="/meeting">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(147,51,234,0.5)] flex items-center gap-2"
              >
                <Video className="w-5 h-5" />
                Start Meeting
              </motion.button>
            </Link>
            <Link href="/proctor">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                Proctor Test
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Current Time Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 text-center bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-2">Current Time</h3>
          <div className="text-2xl font-bold">{currentTime.toLocaleTimeString()}</div>
          <p className="text-sm text-slate-400">{currentTime.toLocaleDateString()}</p>
        </motion.div>

        {/* About Us Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-3 rounded-2xl p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-white/10 shadow-lg"
        >
          <h3 className="text-lg font-semibold mb-2">About Us</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            MeetApp is a secure proctoring and meeting platform designed with
            simplicity and trust in mind. Our Apple-inspired UI ensures a smooth,
            distraction-free experience for both educators and professionals.
          </p>
        </motion.div>
      </div>

      {/* Dock */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex space-x-6 px-8 py-4 backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl"
      >
        {dockItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link href={item.path} key={index}>
              <motion.div
                whileHover={{ scale: 1.25, y: -6 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg hover:ring-2 hover:ring-blue-400 transition">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs mt-1">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
