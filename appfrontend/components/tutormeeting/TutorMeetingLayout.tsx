// components/tutor/TutorMeetingLayout.tsx
import { ReactNode } from "react";

interface LayoutProps {
  header: ReactNode;
  videoArea: ReactNode;
  controls: ReactNode;
  sidePanel?: ReactNode;
}

export function TutorMeetingLayout({
  header,
  videoArea,
  controls,
  sidePanel,
}: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex font-['Inter']">
      <div className="flex-1 flex flex-col">
        {header}
        <div className="flex-1 p-6">{videoArea}</div>
        {controls}
      </div>
      {sidePanel && (
        <div className="w-80 bg-black/40 backdrop-blur-sm border-l border-white/20 flex flex-col animate-in slide-in-from-right">
          {sidePanel}
        </div>
      )}
    </div>
  );
}
