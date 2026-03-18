// components/meeting/MeetingRoomLayout.tsx
import { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface MeetingRoomLayoutProps {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
  controls: ReactNode;
  onBack?: () => void;
}

export function MeetingRoomLayout({
  leftPanel,
  rightPanel,
  controls,
  onBack,
}: MeetingRoomLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex font-['Inter']">
      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar — always visible, contains back button */}
        <div className="flex items-center px-4 pt-3 pb-1 gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-white font-medium bg-white/15 hover:bg-white/25 active:scale-95 transition-all px-4 py-2 rounded-xl border border-white/20 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Leave Meeting
            </button>
          )}
        </div>
        <div className="flex-1 p-6">{leftPanel}</div>
        {controls}
      </div>

      {/* Right panel */}
      {rightPanel && (
        <div className="w-80 bg-black/40 backdrop-blur-sm border-l border-white/20 flex flex-col animate-in slide-in-from-right">
          {rightPanel}
        </div>
      )}
    </div>
  );
}
