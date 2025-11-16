"use client";

import { useState } from "react";
import { Calendar, Clock, Users, BookOpen, Eye, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface CreateMeetingFormProps {
  onBack: () => void;
  
}

export default function CreateMeetingForm({ onBack }: CreateMeetingFormProps) {
  const router=useRouter();
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
        router.push('/tutor/meeting')
  
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Meeting</h1>
            <p className="text-slate-300">Set up a proctored examination or interview</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Basic Information */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Basic Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title" className="text-white">Meeting Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleInputChange("title", e.target.value)}
                    placeholder="e.g., Physics Viva Examination"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="subject" className="text-white">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => handleInputChange("subject", e.target.value)}
                    placeholder="e.g., Physics, Mathematics"
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="institution" className="text-white">Institution</Label>
                  <Input
                    id="institution"
                    value={formData.institution}
                    onChange={(e) => handleInputChange("institution", e.target.value)}
                    placeholder="e.g., ABC University"
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Meeting description and instructions..."
                    className="bg-white/10 border-white/20 text-white"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            {/* Schedule & Participants */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Schedule & Participants
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="scheduledDate" className="text-white">Date *</Label>
                  <Input
                    id="scheduledDate"
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => handleInputChange("scheduledDate", e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="scheduledTime" className="text-white">Time *</Label>
                  <Input
                    id="scheduledTime"
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => handleInputChange("scheduledTime", e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration" className="text-white">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="15"
                    max="480"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="maxParticipants" className="text-white">Max Participants *</Label>
                  <Input
                    id="maxParticipants"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.maxParticipants}
                    onChange={(e) => handleInputChange("maxParticipants", parseInt(e.target.value))}
                    className="bg-white/10 border-white/20 text-white"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="joinCode" className="text-white">Join Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="joinCode"
                      value={formData.joinCode}
                      onChange={(e) => handleInputChange("joinCode", e.target.value)}
                      placeholder="Auto-generated"
                      className="bg-white/10 border-white/20 text-white"
                    />
                    <Button type="button" onClick={generateJoinCode} variant="outline">
                      Generate
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Proctoring Settings */}
          <Card className="bg-white/5 border-white/10 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Proctoring Settings
            </h3>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableProctoring"
                  checked={formData.enableProctoring}
                  onChange={(e) => handleInputChange("enableProctoring", e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
                <Label htmlFor="enableProctoring" className="text-white">
                  Enable AI Proctoring
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableEyeTracking"
                  checked={formData.enableEyeTracking}
                  onChange={(e) => handleInputChange("enableEyeTracking", e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
                <Label htmlFor="enableEyeTracking" className="text-white">
                  Enable Eye Tracking
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="enableRecording"
                  checked={formData.enableRecording}
                  onChange={(e) => handleInputChange("enableRecording", e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                />
                <Label htmlFor="enableRecording" className="text-white">
                  Record Session
                </Label>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-sm text-blue-300">
                <strong>AI Proctoring Features:</strong> Face detection, multiple person detection, 
                eye tracking, suspicious movement detection, and real-time alerts.
              </p>
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" onClick={onBack} variant="outline">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.subject}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "Creating..." : "Create Meeting"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}