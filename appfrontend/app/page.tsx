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
} from "lucide-react";

const dockItems = [
  { icon: Users, label: "Meet", path: "/meet" },
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
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-hidden font-[Inter]">
      {/* Top Menu Bar */}
      <div className="fixed top-0 left-0 w-full backdrop-blur-2xl bg-white/5 border-b border-white/20 z-50 flex items-center justify-between px-6 py-3 text-sm">
        {/* Left Logo */}
        <div className="flex items-center gap-3">
          <Apple className="w-5 h-5" />
          <span className="font-semibold">MeetApp</span>
        </div>

        {/* Right Options */}
        <div className="flex items-center gap-6 text-slate-300">
          <span>{currentTime.toLocaleTimeString()}</span>
          <span>{currentTime.toLocaleDateString()}</span>

          {/* Profile Avatar */}
          <div className="relative">
            <div
              onClick={() => setShowMenu(!showMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center cursor-pointer"
            >
              <User className="w-5 h-5" />
            </div>
            {showMenu && (
              <div className="absolute right-0 mt-3 w-40 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 hover:bg-white/20 cursor-pointer">Profile</div>
                <div className="p-3 hover:bg-white/20 cursor-pointer">Settings</div>
                <div
                  onClick={() => {
                    localStorage.removeItem("isLoggedIn");
                    router.push("/signIn");
                  }}
                  className="p-3 hover:bg-white/20 cursor-pointer flex items-center gap-2 text-red-400"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="pt-20 pb-28 px-8 grid grid-cols-3 gap-6">
        {/* Welcome Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="col-span-2 rounded-2xl p-8 backdrop-blur-2xl bg-white/10 border border-white/20 shadow-xl hover:shadow-[0_0_30px_rgba(99,102,241,0.3)] transition"
        >
          <h2 className="text-4xl font-extrabold mb-3">Welcome Back 👋</h2>
          <p className="text-slate-300 text-lg">Ready to start your next meeting?</p>
          <Link href="/meet">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="mt-6 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:shadow-[0_0_20px_rgba(147,51,234,0.5)]"
            >
              <Video className="w-5 h-5 inline-block mr-2" />
              Start Meeting
            </motion.button>
          </Link>
        </motion.div>

        {/* Current Time Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 text-center backdrop-blur-2xl bg-white/10 border border-white/20 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-2">Current Time</h3>
          <div className="text-3xl font-bold">{currentTime.toLocaleTimeString()}</div>
          <p className="text-sm text-slate-400">{currentTime.toLocaleDateString()}</p>
        </motion.div>

        {/* About Us Widget */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="col-span-3 rounded-2xl p-6 backdrop-blur-2xl bg-white/10 border border-white/20 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-2">About Us</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            We provide seamless meeting solutions with an Apple-like design philosophy.
          </p>
        </motion.div>
      </div>

      {/* Dock */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex space-x-6 px-8 py-4 backdrop-blur-2xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl"
      >
        {dockItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Link href={item.path} key={index}>
              <motion.div
                whileHover={{ scale: 1.3, y: -8 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="flex flex-col items-center cursor-pointer"
              >
                <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs mt-2">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
