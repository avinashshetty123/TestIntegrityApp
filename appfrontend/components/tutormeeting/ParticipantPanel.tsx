// components/tutor/ParticipantsPanel.tsx
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flag, UserMinus, Volume2 } from "lucide-react";
import { ParticipantData } from "../hooks/useParticipantManagment";
import { Users } from "lucide-react";

interface Props {
  participants: ParticipantData[];
  onFlag: (id: string) => void;
  onKick: (id: string) => void;
  onFocus: (id: string) => void;
}

export function ParticipantsPanel({
  participants,
  onFlag,
  onKick,
  onFocus,
}: Props) {
  const riskColor = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return "border-red-400 bg-red-500/20";
      case "HIGH":
        return "border-orange-400 bg-orange-500/20";
      case "MEDIUM":
        return "border-yellow-400 bg-yellow-500/20";
      default:
        return "border-white/20";
    }
  };

  return (
    <>
      <div className="p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <Users className="w-5 h-5" /> Participants ({participants.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.map((p) => (
          <Card
            key={p.identity}
            className={`p-3 bg-white/10 backdrop-blur-sm border cursor-pointer hover:bg-white/20 transition-colors ${riskColor(p.riskLevel)}`}
            onClick={() => onFocus(p.identity)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=${p.displayName}`}
                  className="w-8 h-8 rounded-full"
                  alt=""
                />
                <div>
                  <p className="text-sm font-medium text-white">
                    {p.displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {p.isSpeaking && (
                      <Badge className="bg-green-400 text-black text-xs">
                        Speaking
                      </Badge>
                    )}
                    {p.videoEnabled === false && (
                      <Badge className="bg-red-500 text-white">Video Off</Badge>
                    )}
                    {p.audioEnabled === false && (
                      <Badge className="bg-red-500 text-white">Muted</Badge>
                    )}
                    {p.screenSharing && (
                      <Badge className="bg-blue-400 text-black">
                        Screen Share
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.flagCount > 0 && (
                  <div className="flex flex-col items-end gap-1">
                    <Badge className="bg-red-500 text-white flex items-center gap-1">
                      <Flag className="w-3 h-3" /> {p.flagCount}
                    </Badge>
                    <Badge
                      className={`bg-${p.riskLevel === "LOW" ? "green" : p.riskLevel === "MEDIUM" ? "yellow" : p.riskLevel === "HIGH" ? "orange" : "red"}-500 text-white text-xs`}
                    >
                      {p.riskLevel}
                    </Badge>
                  </div>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFlag(p.identity);
                    }}
                    className="bg-red-500 hover:bg-red-600 rounded-full w-8 h-8 p-0"
                  >
                    <Flag className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onKick(p.identity);
                    }}
                    className="bg-orange-500 hover:bg-orange-600 rounded-full w-8 h-8 p-0"
                  >
                    <UserMinus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
