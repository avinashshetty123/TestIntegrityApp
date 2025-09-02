"use client";

import React from "react";
import { LogOut, User, Settings, ChevronLeft } from "lucide-react";

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6">
      {/* Navigation */}
      <div className="flex justify-between items-center mb-6">
        <button className="flex items-center text-gray-300 hover:text-white">
          <ChevronLeft className="w-5 h-5 mr-2" />
          Back
        </button>
        <h1 className="text-xl font-bold">Profile</h1>
        <button className="text-gray-300 hover:text-white">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Profile Card */}
      <div className="max-w-md mx-auto bg-[#1e293b] p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-4xl font-bold">
            U
          </div>
          <h2 className="text-2xl font-semibold mt-4">User Name</h2>
          <p className="text-gray-400">user@example.com</p>
        </div>

        {/* Options */}
        <div className="mt-6 space-y-4">
          <button className="w-full flex items-center gap-3 bg-[#334155] hover:bg-[#475569] px-4 py-3 rounded-xl">
            <User className="w-5 h-5" />
            Edit Profile
          </button>

          <button className="w-full flex items-center gap-3 bg-red-600 hover:bg-red-700 px-4 py-3 rounded-xl">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
