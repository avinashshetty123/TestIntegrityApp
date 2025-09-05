"use client";

import { useState, useRef } from "react";

interface ProfileData {
  fullName: string;
  email: string;
  role: "Student" | "Tutor";
  rollNumber?: string;
  institution: string;
  designation?: string;
  department?: string;
  phone: string;
  address: string;
  bio: string;
  skills: string;
  avatar: string | null;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "Vedant Taware",
    email: "vedanttaware24@gmail.com",
    role: "Student",
    rollNumber: "123456",
    institution: "MIT University",
    designation: "",
    department: "Computer Science",
    phone: "+91 9876543210",
    address: "Pune, India",
    bio: "Passionate about AI, Web Development and Cloud technologies.",
    skills: "React, Next.js, Tailwind, Node.js, Python",
    avatar: null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Updated Profile:", profile);
    // 🔗 API call goes here
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar: previewUrl }));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-900 via-black to-gray-900 text-white p-6 font-poppins">
      <div className="w-full max-w-3xl bg-black/50 p-10 rounded-2xl shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-pink-500 shadow-lg">
            <img
              src={profile.avatar || "https://i.pravatar.cc/150?img=32"}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={triggerFileInput}
              className="absolute bottom-0 w-full bg-black/60 text-xs py-1 text-pink-400 hover:text-pink-300"
            >
              Change
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <h2 className="text-3xl font-bold mt-4 bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
            My Profile
          </h2>
          <p className="text-gray-400 text-center mt-1">
            Manage your personal information and account details
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="fullName"
              value={profile.fullName}
              onChange={handleChange}
              placeholder="Full Name"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleChange}
              placeholder="Email"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
          </div>

          {/* Role + Conditional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              name="role"
              value={profile.role}
              onChange={handleChange}
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            >
              <option value="Student">Student</option>
              <option value="Tutor">Tutor</option>
            </select>

            {profile.role === "Student" ? (
              <input
                type="text"
                name="rollNumber"
                value={profile.rollNumber}
                onChange={handleChange}
                placeholder="Roll Number"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
            ) : (
              <input
                type="text"
                name="designation"
                value={profile.designation}
                onChange={handleChange}
                placeholder="Designation"
                className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
              />
            )}
          </div>

          {/* Institution + Department */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="institution"
              value={profile.institution}
              onChange={handleChange}
              placeholder="Institution"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
            <input
              type="text"
              name="department"
              value={profile.department}
              onChange={handleChange}
              placeholder="Department"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
          </div>

          {/* Extra Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              placeholder="Phone Number"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
            <input
              type="text"
              name="address"
              value={profile.address}
              onChange={handleChange}
              placeholder="Address"
              className="px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
            />
          </div>

          {/* Bio */}
          <textarea
            name="bio"
            value={profile.bio}
            onChange={handleChange}
            placeholder="Write a short bio..."
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none resize-none h-24"
          />

          {/* Skills */}
          <input
            type="text"
            name="skills"
            value={profile.skills}
            onChange={handleChange}
            placeholder="Skills (comma separated)"
            className="w-full px-4 py-2 rounded-lg bg-white/10 focus:bg-white/20 outline-none"
          />

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 transition font-semibold shadow-lg"
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
