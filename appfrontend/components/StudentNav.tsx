'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Home } from 'lucide-react';

interface StudentNavProps {
  backPath?: string;   // explicit back path; if omitted uses router.back()
  backLabel?: string;
  showHome?: boolean;  // default true
}

export default function StudentNav({ backPath, backLabel = 'Back', showHome = true }: StudentNavProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backPath) {
      router.push(backPath);
    } else if (typeof window !== 'undefined' && (window as any).electronAPI?.navigateBack) {
      (window as any).electronAPI.navigateBack();
    } else {
      router.back();
    }
  };

  const btnCls =
    'flex items-center gap-2 bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_12px_40px_rgba(251,146,60,0.3)] hover:scale-105 transition-all duration-300 text-orange-700 hover:text-orange-800 font-medium text-sm';

  return (
    <div className="flex items-center gap-3 mb-6">
      <button onClick={handleBack} className={btnCls}>
        <ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
      {showHome && (
        <button onClick={() => router.push('/student')} className={btnCls}>
          <Home className="h-4 w-4" />
          Home
        </button>
      )}
    </div>
  );
}
