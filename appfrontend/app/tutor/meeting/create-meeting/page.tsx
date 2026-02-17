"use client";

import React, { useState } from "react";
import { Calendar, Users, BookOpen, Eye, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface CreateMeetingFormProps {
  onBack: () => void;
}

export default function CreateMeetingForm() {
  const router = useRouter();
  const { toast } = useToast();
  
  const onBack = () => router.push('/tutor');

  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
    duration: 60,
    maxParticipants: 10,
    enableProctoring: true,
    enableRecording: true,
    enableEyeTracking: true,
    institution: "",
    joinCode: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateJoinCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData((prev) => ({ ...prev, joinCode: code }));
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("http://localhost:4000/meetings/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          institution: formData.institution,
          subject: formData.subject,
          scheduledAt: `${formData.scheduledDate}T${formData.scheduledTime}:00Z`,
        }),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Meeting created successfully!",
        });
        router.push("/tutor/meeting");
      } else {
        toast({
          title: "Error",
          description: responseData?.message || `Failed to create meeting (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Network error. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation easing (framer-motion-friendly cubic-bezier)
  const easeOut = "easeOut";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 mb-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-[0_8px_30px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(251,146,60,0.4)] group"
            >
              <ArrowLeft className="w-5 h-5 text-orange-600 group-hover:text-orange-700" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-orange-800 drop-shadow-sm">Create New Meeting</h1>
              <p className="text-orange-600">Set up a proctored examination or interview</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(251,146,60,0.4)]">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-orange-800">Basic Information</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="text-sm font-semibold text-orange-800 block mb-2">
                    Meeting Title *
                  </label>
                  <input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Physics Viva Examination"
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="text-sm font-semibold text-orange-800 block mb-2">
                    Subject *
                  </label>
                  <input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="e.g., Physics, Mathematics"
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="institution" className="text-sm font-semibold text-orange-800 block mb-2">
                    Institution
                  </label>
                  <input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => handleInputChange("institution", e.target.value)}
                    placeholder="e.g., ABC University"
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="text-sm font-semibold text-orange-800 block mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Meeting description and instructions..."
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400 resize-none"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {/* Schedule & Participants */}
            <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-orange-800">Schedule & Participants</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="scheduledDate" className="text-sm font-semibold text-orange-800 block mb-2">
                    Date *
                  </label>
                  <input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="scheduledTime" className="text-sm font-semibold text-orange-800 block mb-2">
                    Time *
                  </label>
                  <input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="text-sm font-semibold text-orange-800 block mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min={15}
                    max={480}
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", parseInt(e.target.value || "0"))}
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="maxParticipants" className="text-sm font-semibold text-orange-800 block mb-2">
                    Max Participants *
                  </label>
                  <input
                    id="maxParticipants"
                    type="number"
                    min={1}
                    max={50}
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange("maxParticipants", parseInt(e.target.value || "0"))}
                    className="w-full bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="joinCode" className="text-sm font-semibold text-orange-800 block mb-2">
                    Join Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="joinCode"
                      value={formData.joinCode}
                      onChange={(e) => handleInputChange("joinCode", e.target.value)}
                      placeholder="Auto-generated"
                      className="flex-1 bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
                    />
                    <button 
                      type="button" 
                      onClick={generateJoinCode} 
                      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proctoring Settings */}
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)]">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-orange-800">Proctoring Settings</h3>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <input
                  id="enableProctoring"
                  type="checkbox"
                  checked={formData.enableProctoring}
                  onChange={(e) => handleInputChange("enableProctoring", e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-white border-orange-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="enableProctoring" className="text-orange-800 font-medium">
                  Enable AI Proctoring
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="enableEyeTracking"
                  type="checkbox"
                  checked={formData.enableEyeTracking}
                  onChange={(e) => handleInputChange("enableEyeTracking", e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-white border-orange-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="enableEyeTracking" className="text-orange-800 font-medium">
                  Enable Eye Tracking
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  id="enableRecording"
                  type="checkbox"
                  checked={formData.enableRecording}
                  onChange={(e) => handleInputChange("enableRecording", e.target.checked)}
                  className="w-4 h-4 text-orange-600 bg-white border-orange-300 rounded focus:ring-orange-500"
                />
                <label htmlFor="enableRecording" className="text-orange-800 font-medium">
                  Record Session
                </label>
              </div>
            </div>

            <div className="mt-6 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
              <p className="text-sm text-orange-700">
                <strong className="text-orange-800">AI Proctoring Features:</strong> Face detection, multiple person detection,
                eye tracking, suspicious movement detection, and real-time alerts.
              </p>
            </div>
          </div>

          {/* Submit Row */}
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onBack} 
              className="bg-white/80 backdrop-blur-xl rounded-2xl py-3 px-6 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 text-orange-700 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.subject}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-8 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 drop-shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
