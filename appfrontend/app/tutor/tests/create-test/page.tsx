"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Trash2, Check, X, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner"; // 👈 or your toast lib

type QuestionType = "short" | "mcq" | "truefalse";

interface Question {
  id: number;
  text: string;
  type: QuestionType;
  options?: string[];
  correctAnswerIndexes?: number[];
  correctAnswerText?: string;
  mcqMode?: "single" | "multiple";
  marks: number;
  imageUrl?: string; // 👈 Cloudinary URL
  publicId?: string;
  uploading?: boolean;
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

  const removeOption = (id: number, indexToRemove: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const newOptions = (q.options || []).filter(
          (_, i) => i !== indexToRemove
        );
        const newCorrect = (q.correctAnswerIndexes || [])
          .filter((idx) => idx !== indexToRemove)
          .map((idx) => (idx > indexToRemove ? idx - 1 : idx));
        return { ...q, options: newOptions, correctAnswerIndexes: newCorrect };
      })
    );
  };

  const toggleCorrectByIndex = (id: number, index: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const mode = q.mcqMode ?? "single";
        const current = new Set(q.correctAnswerIndexes ?? []);
        if (mode === "single") {
          return { ...q, correctAnswerIndexes: [index] };
        } else {
          if (current.has(index)) current.delete(index);
          else current.add(index);
          return {
            ...q,
            correctAnswerIndexes: Array.from(current).sort((a, b) => a - b),
          };
        }
      })
    );
  };

  // Cloudinary upload per question
  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    qId: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    updateQuestionField(qId, { uploading: true });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "TestIntegrityApp"); // 👈 replace with your Cloudinary preset
    formData.append("folder", "test_question_pics");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/dizvgbpai/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (data.secure_url && data.public_id) {
        updateQuestionField(qId, {
          imageUrl: data.secure_url,
          publicId: data.public_id,
        });

        toast.success("Upload successful ✅", {
          description: "Question image uploaded.",
        });
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Upload failed", err);
      toast.error("Upload failed ❌", {
        description: "Please try again later.",
      });
    } finally {
      updateQuestionField(qId, { uploading: false });
    }
  };

  const handleSaveLocal = () => {
    const payload = {
      name: testName,
      description,
      questions,
    };
    localStorage.setItem("createdTest", JSON.stringify(payload));
    toast.success("Test saved locally ✅");
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
            <Input
              placeholder="Test title"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
            <Textarea
              placeholder="Short description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                  <CardHeader className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      Question {idx + 1}
                    </h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3">
                      <label className="text-sm">Marks:</label>
                      <Input
                        type="number"
                        value={q.marks}
                        min={1}
                        className="w-20"
                        onChange={(e) =>
                          updateQuestionField(q.id, {
                            marks: Number(e.target.value),
                          })
                        }
                      />
                    </div>

                    <Input
                      placeholder="Write the question..."
                      value={q.text}
                      onChange={(e) =>
                        updateQuestionField(q.id, { text: e.target.value })
                      }
                    />

                    {/* Cloudinary Upload */}
                    <div className="flex flex-col gap-2">
                      <label className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-500/50 rounded-xl p-6 text-gray-400 cursor-pointer hover:border-purple-400 hover:text-purple-400 transition">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleUpload(e, q.id)}
                        />
                        {q.uploading ? (
                          <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                        ) : q.imageUrl ? (
                          <img
                            src={q.imageUrl}
                            alt="Question"
                            className="w-32 h-32 rounded-md object-cover border-2 border-purple-400"
                          />
                        ) : (
                          <>
                            <Upload className="w-10 h-10 mb-2 text-purple-400" />
                            <span className="text-sm">
                              Click to upload question image
                            </span>
                          </>
                        )}
                      </label>

                      {q.publicId && (
                        <p className="text-xs text-gray-500 text-center">
                          Uploaded ✔
                        </p>
                      )}
                    </div>

                    {/* Type selector */}
                    <select
                      value={q.type}
                      onChange={(e) =>
                        updateQuestionField(q.id, {
                          type: e.target.value as QuestionType,
                        })
                      }
                      className="p-2 rounded-lg border"
                    >
                      <option value="short">Short Answer</option>
                      <option value="mcq">Multiple Choice (MCQ)</option>
                      <option value="truefalse">True / False</option>
                    </select>

                    {/* MCQ / TF / Short conditional rendering same as before */}
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
                            />
                            <Button
                              type="button"
                              onClick={() => toggleCorrectByIndex(q.id, i)}
                              className={cn(
                                q.correctAnswerIndexes?.includes(i)
                                  ? "bg-green-500 text-white"
                                  : "bg-gray-200"
                              )}
                            >
                              {q.correctAnswerIndexes?.includes(i)
                                ? "Correct"
                                : "Set"}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => removeOption(q.id, i)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          onClick={() => addOption(q.id)}
                        >
                          <PlusCircle className="w-4 h-4 mr-2" /> Add option
                        </Button>
                      </div>
                    )}

                    {q.type === "truefalse" && (
                      <div className="flex gap-3">
                        {["True", "False"].map((label, i) => (
                          <Button
                            key={label}
                            onClick={() => toggleCorrectByIndex(q.id, i)}
                            className={cn(
                              q.correctAnswerIndexes?.includes(i)
                                ? "bg-green-600 text-white"
                                : "bg-gray-200"
                            )}
                          >
                            {label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {q.type === "short" && (
                      <Input
                        placeholder="(Optional) correct answer text"
                        value={q.correctAnswerText || ""}
                        onChange={(e) =>
                          updateQuestionField(q.id, {
                            correctAnswerText: e.target.value,
                          })
                        }
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            onClick={addQuestion}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusCircle className="w-4 h-4 mr-2" /> Add Question
          </Button>

          <Button
            onClick={handleSaveLocal}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            Save Test to LocalStorage
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
