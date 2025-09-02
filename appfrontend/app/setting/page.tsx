"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Moon,
  Lock,
  Globe,
  LogOut,
  ChevronRight,
} from "lucide-react";

export default function SettingPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  return (
    <div
      className={`flex min-h-screen items-center justify-center ${
        darkMode ? "bg-gray-950" : "bg-gray-100"
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className={`w-full max-w-sm rounded-2xl ${
          darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-800"
        } shadow-lg p-4`}
      >
        {/* Header */}
        <h1 className="text-lg font-semibold text-center mb-4">⚙️ Settings</h1>

        {/* Settings List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
          {/* Account */}
          <div className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 cursor-pointer">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-500" />
              <span>Account</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-green-500" />
              <span>Notifications</span>
            </div>
            <input
              type="checkbox"
              checked={notifications}
              onChange={() => setNotifications(!notifications)}
              className="h-4 w-4 accent-green-500"
            />
          </div>

          {/* Dark Mode */}
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center space-x-2">
              <Moon className="h-4 w-4 text-purple-500" />
              <span>Dark Mode</span>
            </div>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="h-4 w-4 accent-purple-500"
            />
          </div>

          {/* Change Password */}
          <div className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Lock className="h-4 w-4 text-yellow-500" />
              <span>Change Password</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          {/* Language */}
          <div className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-2 cursor-pointer">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-indigo-500" />
              <span>Language</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </div>

          {/* Logout */}
          <div className="flex items-center justify-between py-3 px-2">
            <div className="flex items-center space-x-2">
              <LogOut className="h-4 w-4 text-red-500" />
              <span className="text-red-500">Log Out</span>
            </div>
            <button className="text-xs text-red-500 hover:text-black">
              Sign Out
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
