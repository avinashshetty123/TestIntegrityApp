"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { useToast } from "@/components/ui/use-toast";

export default function TutorProfilePage() {
  const { toast } = useToast();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('http://localhost:4000/user/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        router.push('/signIn');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      router.push('/signIn');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (profileData) => {
    try {
      const response = await fetch('http://localhost:4000/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profileData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully!",
        });
        router.push('/tutor');
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to update profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Network error. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <ProfileForm
      userRole="tutor"
      initialData={userData}
      onSave={handleSaveProfile}
    />
  );
}