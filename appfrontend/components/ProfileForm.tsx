"use client";

import { useState, useRef } from "react";
import { Camera, Upload, Save, User } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-6 font-['Inter']">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.15)] border border-orange-200/30 hover:shadow-[0_25px_60px_rgba(251,146,60,0.2)] transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-3">
              {userRole === 'student' ? 'Student Profile' : 'Tutor Profile'}
            </h1>
            <p className="text-gray-600 text-lg font-medium">Complete your profile information</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <div className="w-28 h-28 mb-4 rounded-full shadow-[0_15px_35px_rgba(251,146,60,0.2)] border-4 border-orange-200/50 overflow-hidden">
                  {formData.profilePic ? (
                    <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center">
                      <User className="w-14 h-14 text-orange-600" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-2 -right-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full p-3 shadow-[0_10px_25px_rgba(251,146,60,0.3)] hover:shadow-[0_15px_35px_rgba(251,146,60,0.4)] transform hover:scale-110 transition-all duration-300 disabled:opacity-50"
                >
                  {isUploading ? <Upload className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
                </button>
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
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-gray-700 font-semibold mb-2">First Name *</label>
                <input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-gray-700 font-semibold mb-2">Last Name *</label>
                <input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-gray-700 font-semibold mb-2">Email *</label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full px-4 py-3 bg-gray-100/80 backdrop-blur-xl border border-gray-300/50 rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.05)] text-gray-600 font-medium cursor-not-allowed"
                required
                disabled
              />
            </div>

            <div>
              <label htmlFor="institutionName" className="block text-gray-700 font-semibold mb-2">Institution Name *</label>
              <input
                id="institutionName"
                value={formData.institutionName}
                onChange={(e) => handleInputChange('institutionName', e.target.value)}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                required
              />
            </div>

            {/* Role-specific fields */}
            {userRole === 'student' ? (
              <div>
                <label htmlFor="rollNumber" className="block text-gray-700 font-semibold mb-2">Roll Number</label>
                <input
                  id="rollNumber"
                  value={formData.rollNumber}
                  onChange={(e) => handleInputChange('rollNumber', e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                />
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="designation" className="block text-gray-700 font-semibold mb-2">Designation</label>
                  <input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    placeholder="e.g., Professor, Assistant Professor"
                  />
                </div>
                <div>
                  <label htmlFor="department" className="block text-gray-700 font-semibold mb-2">Department</label>
                  <input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-2xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    placeholder="e.g., Computer Science"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSaving || !formData.firstName || !formData.lastName || !formData.institutionName}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-6 rounded-2xl shadow-[0_15px_35px_rgba(251,146,60,0.3)] hover:shadow-[0_20px_45px_rgba(251,146,60,0.4)] transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 text-lg"
            >
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}