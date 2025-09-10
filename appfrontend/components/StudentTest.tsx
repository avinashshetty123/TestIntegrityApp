"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom, GridLayout, ParticipantTile, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuestionType = "short" | "mcq" | "truefalse";

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[];
  mcqMode?: "single" | "multiple";
}

interface TestData {
  name: string;
  description: string;
  questions: Question[];
}

export default function StudentMeetingPage({ params }: { params: { id: string } }) {
  const [meetingData, setMeetingData] = useState<any>(null);
  const [test, setTest] = useState<TestData | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);

  // ✅ Join Meeting
  useEffect(() => {
    async function joinMeeting() {
      const res = await fetch(`http://localhost:4000/meetings/${params.id}/join`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName: "Student" }),
      });
      const data = await res.json();
      setMeetingData(data);

      // Simulate fetching assigned test (replace with API call)
      setTest({
        name: "Sample Test",
        description: "Please answer carefully while being monitored.",
        questions: [
          { id: 1, text: "Explain polymorphism in OOP.", type: "short" },
          {
            id: 2,
            text: "Which are NoSQL databases?",
            type: "mcq",
            options: ["MongoDB", "Postgres", "Cassandra", "MySQL"],
            mcqMode: "multiple",
          },
          {
            id: 3,
            text: "HTTP is stateless.",
            type: "truefalse",
          },
        ],
      });
    }
    joinMeeting();
  }, [params.id]);

  // ✅ Handle MCQ Select
  const handleMCQSelect = (q: Question, index: number) => {
    setAnswers((prev) => {
      if (q.mcqMode === "single") {
        return { ...prev, [q.id]: [index] };
      } else {
        const prevAns = new Set(prev[q.id] || []);
        if (prevAns.has(index)) prevAns.delete(index);
        else prevAns.add(index);
        return { ...prev, [q.id]: Array.from(prevAns) };
      }
    });
  };

  // ✅ Submit answers
  const handleSubmit = async () => {
    setSubmitting(true);
    console.log("Submitting student answers:", answers);

    await fetch(`http://localhost:4000/tests/${params.id}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ answers }),
    });

    setSubmitting(false);
  };

  if (!meetingData) return <p>Joining meeting...</p>;

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);

  return (
    <LiveKitRoom
      token={meetingData.token}
      serverUrl={meetingData.serverUrl}
      connect={true}
      style={{ height: "100vh", width: "100vw" }}
    >
      <div className="grid grid-cols-2 h-screen">
        {/* ✅ Left: Tutor Video */}
        <div className="bg-black flex items-center justify-center">
          <GridLayout tracks={tracks} style={{ height: "100%", width: "100%" }}>
            <ParticipantTile />
          </GridLayout>
        </div>

        {/* ✅ Right: Student Test */}
        <div className="p-6 overflow-y-auto bg-gradient-to-br from-white via-slate-50 to-violet-50">
          {test && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="rounded-2xl shadow-lg border-0 bg-white/90 backdrop-blur-md">
                <CardHeader>
                  <h2 className="text-2xl font-extrabold text-indigo-700">{test.name}</h2>
                  <p className="text-slate-600">{test.description}</p>
                </CardHeader>
              </Card>

              <div className="space-y-5">
                <AnimatePresence>
                  {test.questions.map((q, idx) => (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                    >
                      <Card className="rounded-2xl shadow-sm border bg-white">
                        <CardHeader>
                          <h3 className="text-lg font-semibold text-slate-800">
                            {idx + 1}. {q.text}
                          </h3>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          {q.type === "short" && (
                            <Textarea
                              placeholder="Write your answer..."
                              value={answers[q.id] || ""}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              className="rounded-lg"
                            />
                          )}

                          {q.type === "mcq" && (
                            <div className="space-y-2">
                              {(q.options || []).map((opt, i) => {
                                const selected = (answers[q.id] || []).includes(i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleMCQSelect(q, i)}
                                    className={cn(
                                      "w-full text-left px-4 py-2 rounded-lg border transition",
                                      selected
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white hover:bg-slate-50"
                                    )}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {q.type === "truefalse" && (
                            <div className="flex gap-3">
                              {["True", "False"].map((label, i) => {
                                const selected = (answers[q.id] || []).includes(i);
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleMCQSelect(q, i)}
                                    className={cn(
                                      "flex-1 px-4 py-2 rounded-lg border transition",
                                      selected
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-white hover:bg-slate-50"
                                    )}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-lg"
              >
                {submitting ? "Submitting..." : "Submit Test"}
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </LiveKitRoom>
  );
}
