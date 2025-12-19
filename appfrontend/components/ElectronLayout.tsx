"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Shield } from "lucide-react";
import ElectronBackButton from "./ElectronBackButton";

interface ElectronLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backButtonPath?: string;
  title?: string;
}

export default function ElectronLayout({ 
  children, 
  showBackButton = true, 
  backButtonPath = "/",
  title 
}: ElectronLayoutProps) {
  const [isElectron, setIsElectron] = useState(false);
  const [isProctoringMode, setIsProctoringMode] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    setIsElectron(typeof window !== 'undefined' && window.electronAPI?.isElectron);
    
    // Check proctoring status
    if (window.electronAPI?.getWindowMode) {
      window.electronAPI.getWindowMode().then((mode: string) => {
        setIsProctoringMode(mode === 'proctoring');
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Electron Header */}
      {isElectron && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {showBackButton && (
              <ElectronBackButton 
                fallbackPath={backButtonPath}
                variant="ghost"
                size="sm"
              />
            )}
            {title && (
              <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isProctoringMode && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                <Shield className="w-4 h-4" />
                <span>Proctoring Active</span>
              </div>
            )}
            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
              <span>TestIntegrity Desktop</span>
            </div>
          </div>
        </div>
      )}

      {/* Proctoring Warning Banner */}
      {isElectron && isProctoringMode && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-red-700">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Proctoring session active - Window cannot be minimized or closed
            </span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={isElectron ? "p-6" : ""}>
        {children}
      </div>
    </div>
  );
}