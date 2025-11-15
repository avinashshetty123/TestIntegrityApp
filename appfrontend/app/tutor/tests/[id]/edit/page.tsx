"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, X } from "lucide-react";

interface Question {
  id?: number;
  questionText: string;
  type: string;
  marks: number;
  options?: string[];
  correctAnswers?: string[];
}

export default function EditTestPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState<any>(null);

  useEffect(() => {
    fetchTest();
  }, [id]);

  async function fetchTest() {
    const res = await fetch(`http://localhost:4000/tests/${id}`, {
      credentials: "include",
    });
    const data = await res.json();
    setTest(data);
  }
  function updateDuration(minutes: number) {
    setTest({ ...test, durationMinutes: minutes });
  }

  // Add function to update scheduled time
  function updateScheduledAt(dateTime: string) {
    setTest({ ...test, scheduledAt: new Date(dateTime).toISOString() });
  }
  function updateQuestion(index: number, field: string, value: any) {
    const updated = [...test.questions];
    updated[index] = { ...updated[index], [field]: value };
    setTest({ ...test, questions: updated });
  }

  function updateQuestionOption(questionIndex: number, optionIndex: number, value: string) {
    const updated = [...test.questions];
    const newOptions = [...(updated[questionIndex].options || [])];
    newOptions[optionIndex] = value;
    updated[questionIndex].options = newOptions;
    setTest({ ...test, questions: updated });
  }

  function addQuestionOption(questionIndex: number) {
    const updated = [...test.questions];
    const currentOptions = updated[questionIndex].options || [];
    updated[questionIndex].options = [...currentOptions, ""];
    setTest({ ...test, questions: updated });
  }

  function removeQuestionOption(questionIndex: number, optionIndex: number) {
    const updated = [...test.questions];
    const currentOptions = [...(updated[questionIndex].options || [])];
    currentOptions.splice(optionIndex, 1);
    updated[questionIndex].options = currentOptions;
    
    // Also remove from correctAnswers if it was selected
    const currentCorrectAnswers = [...(updated[questionIndex].correctAnswers || [])];
    const removedOption = updated[questionIndex].options?.[optionIndex];
    if (removedOption && currentCorrectAnswers.includes(removedOption)) {
      updated[questionIndex].correctAnswers = currentCorrectAnswers.filter(ans => ans !== removedOption);
    }
    
    setTest({ ...test, questions: updated });
  }

  function updateCorrectAnswer(questionIndex: number, answerIndex: number, value: string) {
    const updated = [...test.questions];
    const newCorrectAnswers = [...(updated[questionIndex].correctAnswers || [])];
    newCorrectAnswers[answerIndex] = value;
    updated[questionIndex].correctAnswers = newCorrectAnswers;
    setTest({ ...test, questions: updated });
  }

  function addCorrectAnswer(questionIndex: number) {
    const updated = [...test.questions];
    const currentCorrectAnswers = updated[questionIndex].correctAnswers || [];
    updated[questionIndex].correctAnswers = [...currentCorrectAnswers, ""];
    setTest({ ...test, questions: updated });
  }

  function removeCorrectAnswer(questionIndex: number, answerIndex: number) {
    const updated = [...test.questions];
    const currentCorrectAnswers = [...(updated[questionIndex].correctAnswers || [])];
    currentCorrectAnswers.splice(answerIndex, 1);
    updated[questionIndex].correctAnswers = currentCorrectAnswers;
    setTest({ ...test, questions: updated });
  }

  function deleteQuestion(index: number) {
    const updated = test.questions.filter((_: any, i: number) => i !== index);
    setTest({ ...test, questions: updated });
  }

  function addQuestion() {
    setTest({
      ...test,
      questions: [
        ...test.questions,
        {
          questionText: "",
          type: "SHORT",
          marks: 1,
          options: [],
          correctAnswers: []
        },
      ],
    });
  }

  async function saveTest() {
    try {
      // Prepare questions data for the backend
      const questionsData = test.questions.map((q: Question) => ({
        ...q,
        // Ensure options and correctAnswers are properly formatted
        options: q.type === 'MCQ' || q.type === 'TRUE_FALSE' ? (q.options || []) : null,
        correctAnswers: q.type === 'MCQ' || q.type === 'TRUE_FALSE' || q.type === 'SHORT' ? (q.correctAnswers || []) : null
      }));

      // Update questions
      const updateRes = await fetch(`http://localhost:4000/tests/${id}/questions`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          update: questionsData.filter((q: Question) => q.id),
          add: questionsData.filter((q: Question) => !q.id),
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update questions');
      }

    
      router.push(`/tutor/tests/${id}`);
    } catch (error) {
      console.error('Error saving test:', error);
      alert('Failed to save test. Please try again.');
    }
  }

  if (!test) return <p>Loading...</p>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Edit Test</h1>

      {/* Title + Description */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={test.title}
            onChange={(e) => setTest({ ...test, title: e.target.value })}
            placeholder="Test title"
          />
          <Textarea
            value={test.description}
            onChange={(e) => setTest({ ...test, description: e.target.value })}
            placeholder="Test description"
          />
        </CardContent>
      </Card>

      {/* Questions */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>Questions</CardTitle>
          <Button onClick={addQuestion}>
            <Plus className="mr-2 h-4 w-4" /> Add Question
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {test.questions.map((q: Question, index: number) => (
            <div
              key={index}
              className="border p-4 rounded-lg shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-4">
                  <Input
                    value={q.questionText}
                    onChange={(e) =>
                      updateQuestion(index, "questionText", e.target.value)
                    }
                    placeholder="Enter question text"
                  />

                  <div className="flex gap-4">
                    <select
                      value={q.type}
                      onChange={(e) => updateQuestion(index, "type", e.target.value)}
                      className="border rounded px-3 py-2"
                    >
                      <option value="SHORT">Short Answer</option>
                      <option value="MCQ">Multiple Choice</option>
                      <option value="TRUE_FALSE">True/False</option>
                      <option value="ESSAY">Essay</option>
                    </select>

                    <Input
                      type="number"
                      value={q.marks}
                      onChange={(e) =>
                        updateQuestion(index, "marks", Number(e.target.value))
                      }
                      className="w-24"
                      placeholder="Marks"
                      min="1"
                    />
                  </div>

                  {/* Options for MCQ and True/False */}
                  {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">Options:</label>
                      {(q.options || []).map((option: string, optIndex: number) => (
                        <div key={optIndex} className="flex gap-2 items-center">
                          <Input
                            value={option}
                            onChange={(e) => updateQuestionOption(index, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestionOption(index, optIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestionOption(index)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Option
                      </Button>
                    </div>
                  )}

                  {/* Correct Answers for MCQ, True/False, and Short Answer */}
                  {(q.type === 'MCQ' || q.type === 'TRUE_FALSE' || q.type === 'SHORT') && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        {q.type === 'MCQ' ? 'Correct Answers (select from options):' : 
                         q.type === 'TRUE_FALSE' ? 'Correct Answer:' : 'Expected Answers:'}
                      </label>
                      {(q.correctAnswers || []).map((answer: string, ansIndex: number) => (
                        <div key={ansIndex} className="flex gap-2 items-center">
                          {q.type === 'MCQ' ? (
                            <select
                              value={answer}
                              onChange={(e) => updateCorrectAnswer(index, ansIndex, e.target.value)}
                              className="border rounded px-3 py-2 flex-1"
                            >
                              <option value="">Select an option</option>
                              {(q.options || []).map((option: string, optIndex: number) => (
                                <option key={optIndex} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <Input
                              value={answer}
                              onChange={(e) => updateCorrectAnswer(index, ansIndex, e.target.value)}
                              placeholder={
                                q.type === 'TRUE_FALSE' ? 'Enter True or False' : 'Expected answer'
                              }
                            />
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeCorrectAnswer(index, ansIndex)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addCorrectAnswer(index)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add Correct Answer
                      </Button>
                    </div>
                  )}

                  {/* Info for Essay type */}
                  {q.type === 'ESSAY' && (
                    <div className="text-sm text-gray-500 italic">
                      Essay questions are manually graded. No correct answers needed.
                    </div>
                  )}
                </div>

                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => deleteQuestion(index)}
                  className="ml-4"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={saveTest} className="flex-1">
          Save & Update Test
        </Button>
      </div>
    </div>
  );
}