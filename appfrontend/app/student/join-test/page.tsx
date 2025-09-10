"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type QuestionType = "short" | "mcq" | "truefalse";

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswerIndexes?: number[]; // tutor’s data (we don’t show correctness to student)
  mcqMode?: "single" | "multiple";
}

interface TestData {
  name: string;
  description: string;
  questions: Question[];
}

interface StudentTestProps {
  test: TestData; // pass this in from backend
  onSubmit: (answers: Record<number, any>) => void;
}

export default function StudentTest({ test, onSubmit }: StudentTestProps) {
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = () => {
    setSubmitting(true);
    // Simulate submit → replace with fetch to your Nest backend
    console.log("Student answers:", answers);
    onSubmit(answers);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-violet-50 p-4 flex justify-center overflow-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl space-y-6"
      >
        <Card className="rounded-2xl shadow-lg border-0 bg-white/90 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-2xl font-extrabold text-indigo-700">
              {test.name}
            </CardTitle>
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
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        className="rounded-lg"
                      />
                    )}

                    {q.type === "mcq" && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, i) => {
                          const selected =
                            (answers[q.id] || []).includes(i) || false;
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
                              {opt || `Option ${i + 1}`}
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
    </div>
  );
}
