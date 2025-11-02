"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  institutionName: string;
  rollNumber?: string;
  designation?: string;
  department?: string;
  profilePic?: string;
}

interface ProfileFormProps {
  userRole: 'student' | 'tutor';
  initialData?: ProfileData;
  onSave: (data: ProfileData) => void;
}

export default function ProfileForm({ userRole, initialData, onSave }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileData>({
    firstName: initialData?.firstName || '',
    lastName: initialData?.lastName || '',
    email: initialData?.email || '',
    institutionName: initialData?.institutionName || '',
    rollNumber: initialData?.rollNumber || '',
    designation: initialData?.designation || '',
    department: initialData?.department || '',
    profilePic: initialData?.profilePic || ''
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const formDataImg = new FormData();
    formDataImg.append('file', file);

    try {
      const response = await fetch('http://localhost:4000/cloudinary/upload', {
        method: 'POST',
        credentials: 'include',
        body: formDataImg
      });
      
      const data = await response.json();
      if (data.secure_url) {
        setFormData(prev => ({ ...prev, profilePic: data.secure_url }));
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-white/5 border-white/10 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">
              {userRole === 'student' ? 'Student Profile' : 'Tutor Profile'}
            </h1>
            <p className="text-gray-300">Complete your profile information</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <Avatar className="w-24 h-24 mb-4">
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                </Avatar>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-2 -right-2 rounded-full p-2"
                >
                  {isUploading ? <Upload className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Basic Information */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName" className="text-white">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-white">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                required
                disabled
              />
            </div>

            <div>
              <Label htmlFor="institutionName" className="text-white">Institution Name *</Label>
              <Input
                id="institutionName"
                value={formData.institutionName}
                onChange={(e) => handleInputChange('institutionName', e.target.value)}
                className="bg-white/10 border-white/20 text-white"
                required
              />
            </div>

            {/* Role-specific fields */}
            {userRole === 'student' ? (
              <div>
                <Label htmlFor="rollNumber" className="text-white">Roll Number</Label>
                <Input
                  id="rollNumber"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="designation" className="text-white">Designation</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="e.g., Professor, Assistant Professor"
                  />
                </div>
                <div>
                  <Label htmlFor="department" className="text-white">Department</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="bg-white/10 border-white/20 text-white"
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={isSaving || !formData.firstName || !formData.lastName || !formData.institutionName}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}