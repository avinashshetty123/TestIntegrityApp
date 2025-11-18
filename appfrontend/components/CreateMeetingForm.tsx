"use client";

import { useState } from "react";
import { Calendar, Clock, Users, BookOpen, Eye, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface CreateMeetingFormProps {
  onBack: () => void;
  onCreateMeeting: (meetingData: any) => void;
}

export default function CreateMeetingForm({ onBack, onCreateMeeting }: CreateMeetingFormProps) {
  const { toast } = useToast();
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
    joinCode: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateJoinCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setFormData(prev => ({ ...prev, joinCode: code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost:4000/meetings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          institution: formData.institution,
          subject: formData.subject,
          scheduledAt: `${formData.scheduledDate}T${formData.scheduledTime}:00Z`
        })
      });
      
      console.log('Response status:', response.status);
      const responseData = await response.json();
      console.log('Response data:', responseData);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Meeting created successfully!",
        });
        onCreateMeeting(formData);
      } else {
        toast({
          title: "Error",
          description: responseData.message || `Failed to create meeting (${response.status})`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      toast({
        title: "Error",
        description: "Network error. Please check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-6 font-['Inter']">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={onBack}
            className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-800 drop-shadow-sm">Create New Meeting</h1>
            <p className="text-gray-600 font-medium">Set up a proctored examination or interview</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                <BookOpen className="w-5 h-5 text-orange-500" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Meeting Title *</label>
                  <input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Physics Viva Examination"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                  <input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="e.g., Physics, Mathematics"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="institution" className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => handleInputChange("institution", e.target.value)}
                    placeholder="e.g., ABC University"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Meeting description and instructions..."
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500 resize-none"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Schedule & Participants */}
            <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50 p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                <Calendar className="w-5 h-5 text-orange-500" />
                Schedule & Participants
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                  <input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700 mb-1">Max Participants *</label>
                  <input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange("maxParticipants", parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-1">Join Code</label>
                  <div className="flex gap-2">
                    <input
                      id="joinCode"
                      value={formData.joinCode}
                      onChange={(e) => handleInputChange("joinCode", e.target.value)}
                      placeholder="Auto-generated"
                      className="flex-1 px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 text-gray-700 placeholder-gray-500"
                    />
                    <button 
                      type="button" 
                      onClick={generateJoinCode}
                      className="px-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30"
                    >
                      Generate
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Proctoring Settings */}
          <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50 p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
              <Eye className="w-5 h-5 text-orange-500" />
              Proctoring Settings
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <label className="flex items-center space-x-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="enableProctoring"
                  checked={formData.enableProctoring}
                  onChange={(e) => handleInputChange("enableProctoring", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-gray-700 font-medium">
                  Enable AI Proctoring
                </span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="enableEyeTracking"
                  checked={formData.enableEyeTracking}
                  onChange={(e) => handleInputChange("enableEyeTracking", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-gray-700 font-medium">
                  Enable Eye Tracking
                </span>
              </label>

              <label className="flex items-center space-x-3 p-3 bg-white/40 backdrop-blur-xl rounded-xl border border-orange-200/20 hover:bg-white/60 transition-all duration-300 cursor-pointer">
                <input
                  type="checkbox"
                  id="enableRecording"
                  checked={formData.enableRecording}
                  onChange={(e) => handleInputChange("enableRecording", e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-gray-700 font-medium">
                  Record Session
                </span>
              </label>
            </div>

            <div className="mt-4 p-4 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl shadow-lg shadow-orange-100/20">
              <p className="text-sm text-gray-700">
                <strong className="text-orange-600">AI Proctoring Features:</strong> Face detection, multiple person detection, 
                eye tracking, suspicious movement detection, and real-time alerts.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button 
              type="button" 
              onClick={onBack}
              className="px-6 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.subject}
              className={`px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 shadow-lg ${
                isSubmitting || !formData.title || !formData.subject
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:scale-105 shadow-green-200/50'
              }`}
            >
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}