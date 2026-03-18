// components/tutor/JoinRequestsPanel.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";
import { UserPlus } from "lucide-react";

interface JoinRequest {
  id: string;
  studentId: string;
  studentName: string;
  requestedAt: string;
}

interface JoinRequestsPanelProps {
  requests: JoinRequest[];
  onRespond: (id: string, status: "APPROVED" | "REJECTED") => void;
}

export function JoinRequestsPanel({
  requests,
  onRespond,
}: JoinRequestsPanelProps) {
  return (
    <>
      <div className="p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <UserPlus className="w-5 h-5" />
          Join Requests ({requests.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {requests.map((request) => (
          <Card
            key={request.id}
            className="p-3 bg-white/10 backdrop-blur-sm border border-white/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-white">{request.studentName}</p>
                <p className="text-xs text-gray-400">ID: {request.studentId}</p>
                <p className="text-xs text-gray-500">
                  Requested:{" "}
                  {new Date(request.requestedAt).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => onRespond(request.id, "APPROVED")}
                  className="bg-green-500 hover:bg-green-600 text-white border-none rounded-full w-8 h-8 p-0"
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  onClick={() => onRespond(request.id, "REJECTED")}
                  className="bg-red-500 hover:bg-red-600 text-white border-none rounded-full w-8 h-8 p-0"
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
        {requests.length === 0 && (
          <p className="text-center text-gray-400 py-4">
            No pending join requests
          </p>
        )}
      </div>
    </>
  );
}
