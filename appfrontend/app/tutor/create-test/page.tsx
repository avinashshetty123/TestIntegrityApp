"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

type QuestionType = "short" | "mcq" | "truefalse";

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  // options only used for MCQ (and implicitly for true/false we will present two options)
  options?: string[];
  // correct answers stored as option indexes (numbers).
  // For single-answer MCQ this array will have one number; for multiple it may have many.
  correctAnswerIndexes?: number[];
  // short-answer fallback
  correctAnswerText?: string;
  // MCQ mode: "single" or "multiple"
  mcqMode?: "single" | "multiple";
  marks: number;
}

export default function CreateTest() {
  const [testName, setTestName] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        id: Date.now(),
        text: "",
        type: "short",
        options: [],
        correctAnswerIndexes: [],
        mcqMode: "single",
        marks: 1,
      },
    ]);
  };

  const removeQuestion = (id: number) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const updateQuestionField = (id: number, patch: Partial<Question>) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...patch } : q))
    );
  };

  // Add option (for MCQ)
  const addOption = (id: number) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              options: [...(q.options || []), ""],
              correctAnswerIndexes: q.correctAnswerIndexes ?? [],
            }
          : q
      )
    );
  };

  // Update option text
  const updateOption = (id: number, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id
          ? {
              ...q,
              options: q.options?.map((opt, i) => (i === index ? value : opt)),
            }
          : q
      )
    );
  };

  // Remove option - also update correctAnswerIndexes to remove/shift indexes
  const removeOption = (id: number, indexToRemove: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const newOptions = (q.options || []).filter(
          (_, i) => i !== indexToRemove
        );
        const newCorrect = (q.correctAnswerIndexes || [])
          .filter((idx) => idx !== indexToRemove) // remove references to the removed index
          .map((idx) => (idx > indexToRemove ? idx - 1 : idx)); // shift down indexes greater than removed
        return { ...q, options: newOptions, correctAnswerIndexes: newCorrect };
      })
    );
  };

  // Toggle correct answer by index. Behaves differently for single vs multiple mode.
  const toggleCorrectByIndex = (id: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const mode = q.mcqMode ?? "single";
        const current = new Set(q.correctAnswerIndexes ?? []);
        if (mode === "single") {
          // single => selecting an index replaces the array with that single index
          return { ...q, correctAnswerIndexes: [index] };
        } else {
          // multiple => toggle membership
          if (current.has(index)) {
            current.delete(index);
          } else {
            current.add(index);
          }
          return {
            ...q,
            correctAnswerIndexes: Array.from(current).sort((a, b) => a - b),
          };
        }
      })
    );
  };

  const handleSubmit = () => {
    // Build payload in a stable structure: for MCQ, correct indexes & options; for short, answer text, etc.
    const payload = {
      name: testName,
      description,
      questions: questions.map((q) => {
  if (q.type === "mcq") {
    return {
      text: q.text,
      type: q.type,
      options: q.options ?? [],
      correctAnswerIndexes: q.correctAnswerIndexes ?? [],
      mcqMode: q.mcqMode ?? "single",
      marks: q.marks,   // 👈 include marks
    };
  } else if (q.type === "truefalse") {
    return {
      text: q.text,
      type: q.type,
      options: ["True", "False"],
      correctAnswerIndexes: q.correctAnswerIndexes ?? [],
      marks: q.marks,   // 👈 include marks
    };
  } else {
    return {
      text: q.text,
      type: q.type,
      correctAnswerText: q.correctAnswerText ?? "",
      marks: q.marks,   // 👈 include marks
    };
  }
}),

    };

    console.log("Payload:", payload);
    // TODO: POST payload to your backend /tests/create
    // fetch('/api/tests', { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 p-6 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-6"
      >
        <Card className="rounded-2xl shadow-2xl border-0 bg-white/80 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold text-indigo-700">
              Create New Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <Input
                placeholder="Test title"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                className="rounded-xl p-3"
              />
              <Textarea
                placeholder="Short description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl p-3"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AnimatePresence>
            {questions.map((q, idx) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <Card className="rounded-2xl shadow-md border-0 bg-white">
                  <CardHeader className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">
                        Question {idx + 1}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Drag-style card • lovely spacing
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(q.id)}
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  {/** Marks input */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-slate-600">Marks:</label>
                    <Input
                      type="number"
                      value={q.marks}
                      min={1}
                      className="w-24"
                      onChange={(e) =>
                        updateQuestionField(q.id, {
                          marks: Number(e.target.value),
                        })
                      }
                    />
                  </div>

                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Write the question..."
                      value={q.text}
                      onChange={(e) =>
                        updateQuestionField(q.id, { text: e.target.value })
                      }
                      className="rounded-lg"
                    />

                    {/* Type selector */}
                    <div className="flex flex-col md:flex-row md:items-center md:gap-4 gap-2">
                      <select
                        value={q.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          // When switching types, adjust default fields:
                          if (newType === "mcq") {
                            updateQuestionField(q.id, {
                              type: "mcq",
                              options:
                                q.options && q.options.length > 0
                                  ? q.options
                                  : ["", ""],
                              correctAnswerIndexes:
                                q.correctAnswerIndexes ?? [],
                              mcqMode: q.mcqMode ?? "single",
                            });
                          } else if (newType === "truefalse") {
                            // set options to True/False if not already present
                            updateQuestionField(q.id, {
                              type: "truefalse",
                              options: ["True", "False"],
                              correctAnswerIndexes:
                                q.correctAnswerIndexes ?? [],
                            });
                          } else {
                            // short answer
                            updateQuestionField(q.id, {
                              type: "short",
                              options: [],
                              correctAnswerIndexes: [],
                              correctAnswerText: q.correctAnswerText ?? "",
                            });
                          }
                        }}
                        className="p-2 rounded-lg border"
                      >
                        <option value="short">Short Answer</option>
                        <option value="mcq">Multiple Choice (MCQ)</option>
                        <option value="truefalse">True / False</option>
                      </select>

                      {/* MCQ mode selector (single / multiple) */}
                      {q.type === "mcq" && (
                        <div className="flex gap-2 items-center">
                          <label className="text-sm text-slate-600">
                            Correct answers:
                          </label>
                          <div className="flex gap-2 bg-slate-50 p-1 rounded-md">
                            <button
                              className={cn(
                                "px-3 py-1 rounded-md text-sm",
                                q.mcqMode === "single"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-transparent"
                              )}
                              onClick={() =>
                                updateQuestionField(q.id, {
                                  mcqMode: "single",
                                  correctAnswerIndexes:
                                    q.correctAnswerIndexes &&
                                    q.correctAnswerIndexes.length > 0
                                      ? [q.correctAnswerIndexes[0]]
                                      : [],
                                })
                              }
                              type="button"
                            >
                              Single
                            </button>
                            <button
                              className={cn(
                                "px-3 py-1 rounded-md text-sm",
                                q.mcqMode === "multiple"
                                  ? "bg-indigo-600 text-white"
                                  : "bg-transparent"
                              )}
                              onClick={() =>
                                updateQuestionField(q.id, {
                                  mcqMode: "multiple",
                                })
                              }
                              type="button"
                            >
                              Multiple
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Conditional Rendering Based on Type */}
                    {q.type === "mcq" && (
                      <div className="space-y-3">
                        {(q.options || []).map((opt, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Input
                              placeholder={`Option ${i + 1}`}
                              value={opt}
                              onChange={(e) =>
                                updateOption(q.id, i, e.target.value)
                              }
                              className="flex-1"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCorrectByIndex(q.id, i)}
                                className={cn(
                                  "px-3 py-1 rounded-md border",
                                  q.correctAnswerIndexes?.includes(i)
                                    ? "bg-green-500 text-white border-green-500"
                                    : "bg-white text-slate-700"
                                )}
                                aria-pressed={
                                  q.correctAnswerIndexes?.includes(i)
                                    ? "true"
                                    : "false"
                                }
                                title={
                                  q.mcqMode === "single"
                                    ? "Select as correct (single)"
                                    : "Toggle correct (multiple)"
                                }
                              >
                                {q.correctAnswerIndexes?.includes(i) ? (
                                  <Check />
                                ) : (
                                  <X />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => removeOption(q.id, i)}
                                className="p-2 rounded-md bg-red-50 hover:bg-red-100 text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => addOption(q.id)}
                            className="flex-1"
                          >
                            <PlusCircle className="w-4 h-4 mr-2" /> Add option
                          </Button>
                          <div className="text-sm text-slate-500 self-center">
                            Tip: mark correct option(s) with the check
                          </div>
                        </div>
                      </div>
                    )}

                    {q.type === "truefalse" && (
                      <div className="flex gap-3">
                        {["True", "False"].map((label, i) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => toggleCorrectByIndex(q.id, i)}
                            className={cn(
                              "px-4 py-2 rounded-lg border",
                              q.correctAnswerIndexes?.includes(i)
                                ? "bg-green-600 text-white"
                                : "bg-white text-slate-700"
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {q.type === "short" && (
                      <div className="space-y-2">
                        <Input
                          placeholder="(Optional) correct answer (textual)"
                          value={q.correctAnswerText || ""}
                          onChange={(e) =>
                            updateQuestionField(q.id, {
                              correctAnswerText: e.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex gap-3">
            <Button
              onClick={addQuestion}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusCircle className="w-4 h-4 mr-2" /> Add Question
            </Button>
            <Button
              onClick={() => setQuestions([])}
              variant="outline"
              className="ml-2"
            >
              Clear All
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700"
          >
            Save Test
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
