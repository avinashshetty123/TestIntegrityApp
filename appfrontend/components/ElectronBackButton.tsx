"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface ElectronBackButtonProps {
  fallbackPath?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
}

export default function ElectronBackButton({ 
  fallbackPath = "/", 
  className = "",
  variant = "outline",
  size = "sm"
}: ElectronBackButtonProps) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    
    // Check if can go back
    if (window.electronAPI?.canGoBack) {
      window.electronAPI.canGoBack().then(setCanGoBack);
    } else {
      setCanGoBack(window.history.length > 1);
    }
  }, []);

  const handleBack = async () => {
    try {
      if (isElectron && window.electronAPI?.navigateBack) {
        const success = await window.electronAPI.navigateBack();
        if (!success) {
          router.push(fallbackPath);
        }
      } else {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackPath);
        }
      }
    } catch (error) {
      console.error('Navigation error:', error);
      router.push(fallbackPath);
    }
  };

  return (
    <Button
      onClick={handleBack}
      variant={variant}
      size={size}
      className={`flex items-center space-x-2 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" />
      <span>Back</span>
    </Button>
  );
}