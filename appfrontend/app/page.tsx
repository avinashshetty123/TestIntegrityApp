"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Calendar,
  Clock,
  FileText,
  Settings,
  LogOut,
  Info,
  Video,
  Users,
  FolderOpen,
  PlayCircle,
  Apple,
} from "lucide-react"

const dockItems = [
  { icon: Users, label: "Meet" },
  { icon: Calendar, label: "Schedule" },
  { icon: PlayCircle, label: "Records" },
  { icon: FolderOpen, label: "Files" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
]

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white overflow-hidden">
      {/* Menu Bar (top like macOS) */}
      <div className="fixed top-0 left-0 w-full backdrop-blur-md bg-white/10 border-b border-white/20 z-50 flex items-center justify-between px-6 py-2">
        <div className="flex items-center space-x-4">
          <Apple className="w-5 h-5" />
          <span className="text-sm">MeetApp</span>
        </div>
        <div className="flex items-center space-x-6 text-sm">
          <span>{currentTime.toLocaleTimeString()}</span>
          <span>{currentTime.toLocaleDateString()}</span>
        </div>
      </div>

      {/* Desktop Widgets */}
      <div className="pt-16 pb-24 px-8 grid grid-cols-3 gap-6">
        {/* Welcome Widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="col-span-2 rounded-2xl p-6 backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl"
        >
          <h2 className="text-3xl font-bold mb-2">Welcome Back 👋</h2>
          <p className="text-slate-300">Ready to start your next meeting?</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg"
          >
            <Video className="w-5 h-5 inline-block mr-2" />
            Start Meeting
          </motion.button>
        </motion.div>

        {/* Time Widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl p-6 text-center backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-2">Current Time</h3>
          <div className="text-3xl font-bold">{currentTime.toLocaleTimeString()}</div>
          <p className="text-sm text-slate-300">{currentTime.toLocaleDateString()}</p>
        </motion.div>

        {/* Status Widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-4 text-center">Status</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Active Users</span>
              <span className="px-2 py-1 rounded-full bg-green-500 text-white text-xs">24</span>
            </div>
            <div className="flex justify-between">
              <span>Meetings Today</span>
              <span className="px-2 py-1 rounded-full bg-blue-500 text-white text-xs">12</span>
            </div>
            <div className="flex justify-between">
              <span>Server Status</span>
              <span className="px-2 py-1 rounded-full bg-green-500 animate-pulse text-xs">
                Online
              </span>
            </div>
          </div>
        </motion.div>

        {/* About Widget */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-6 backdrop-blur-xl bg-white/10 border border-white/20 shadow-xl"
        >
          <h3 className="text-lg font-semibold mb-2">About Us</h3>
          <p className="text-slate-300 text-sm">
            We provide seamless meeting solutions with an Apple-like design philosophy.
          </p>
        </motion.div>
      </div>

      {/* Dock (bottom like macOS) */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex space-x-6 px-6 py-3 backdrop-blur-2xl bg-white/20 border border-white/30 rounded-2xl shadow-2xl"
      >
        {dockItems.map((item, index) => {
          const Icon = item.icon
          return (
            <motion.div
              key={index}
              whileHover={{ scale: 1.2 }}
              className="flex flex-col items-center cursor-pointer"
            >
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 shadow-md">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs mt-1">{item.label}</span>
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
