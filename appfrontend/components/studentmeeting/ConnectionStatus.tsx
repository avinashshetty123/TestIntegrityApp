// components/meeting/ConnectionStatus.tsx
import { Video } from "lucide-react";

interface ConnectionStatusProps {
  isConnecting: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ConnectionStatus({
  isConnecting,
  error,
  onRetry,
}: ConnectionStatusProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center font-['Inter']">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Video className="w-8 h-8 text-white drop-shadow-sm" />
        </div>
        {error ? (
          <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h1 className="text-xl font-bold mb-4 text-red-400">
              Connection Failed
            </h1>
            <p className="text-gray-300 mb-4 font-medium">{error}</p>
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:scale-105 transition-all duration-300 shadow-xl"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-3xl rounded-3xl p-8 border border-white/20 shadow-2xl">
            <h1 className="text-xl font-bold mb-4 text-blue-300">
              Connecting to Meeting...
            </h1>
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300 font-medium">
              Establishing connection to LiveKit server...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
