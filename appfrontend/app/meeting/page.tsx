"use client";

import { motion } from "framer-motion";
import { Video, Users, Calendar, Plus, Clock } from "lucide-react";

export default function MeetingPage() {
  const upcomingMeetings = [
    { id: 1, title: "Team Sync", time: "Today, 10:00 AM" },
    { id: 2, title: "Client Review", time: "Tomorrow, 2:30 PM" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950 p-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-gray-900 shadow-xl p-6"
      >
        {/* Header */}
        <h1 className="text-xl font-semibold text-center mb-6">Meetings</h1>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <Video className="h-6 w-6 text-green-500 mb-2" />
            <span className="text-sm">Start Meeting</span>
          </button>

          <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition">
            <Users className="h-6 w-6 text-blue-500 mb-2" />
            <span className="text-sm">Join Meeting</span>
          </button>
        </div>

        {/* Upcoming Meetings */}
        <h2 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Upcoming
        </h2>
        <div className="space-y-3">
          {upcomingMeetings.map((meeting) => (
            <div
              key={meeting.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <div>
                <p className="text-sm font-medium">{meeting.title}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {meeting.time}
                </p>
              </div>
              <button className="px-3 py-1 text-xs rounded-full bg-blue-500 text-white hover:bg-blue-600 transition">
                Join
              </button>
            </div>
          ))}
        </div>

        {/* New Meeting */}
        <div className="mt-6">
          <button className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition text-sm font-medium">
            <Plus className="h-4 w-4" /> Schedule New Meeting
          </button>
        </div>
      </motion.div>
    </div>
  );
}
