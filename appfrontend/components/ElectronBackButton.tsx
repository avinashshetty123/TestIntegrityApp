"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ElectronBackButtonProps {
  fallbackPath?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  label?: string;
}

export default function ElectronBackButton({ 
  fallbackPath = "/", 
  className = "",
  variant = "outline",
  size = "sm",
  label = "Back",
}: ElectronBackButtonProps) {
  const router = useRouter();

  const handleBack = async () => {
    try {
      // In Electron, window.history.length is unreliable — always use fallbackPath
      if (typeof window !== 'undefined' && window.electronAPI?.isElectron) {
        if (window.electronAPI?.navigateBack) {
          const success = await window.electronAPI.navigateBack();
          if (!success) router.push(fallbackPath);
        } else {
          router.push(fallbackPath);
        }
      } else {
        // Browser: use history if available, else fallback
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push(fallbackPath);
        }
      }
    } catch {
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
      <span>{label}</span>
    </Button>
  );
}