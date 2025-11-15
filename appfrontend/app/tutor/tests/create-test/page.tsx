'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';

export default function CreateTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120); // Default 2 hours
  const [scheduledAt, setScheduledAt] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        type: 'MCQ',      // MCQ | TRUE_FALSE | SHORT | LONG
        options: [''],
        correctAnswers: [],
        mcqMode: 'single',
        marks: 1,
      },
    ]);
  };

  const updateQuestion = (index: number, key: string, value: any) => {
    const updated = [...questions];
    updated[index][key] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex: number) => {
    const updated = [...questions];
    updated[qIndex].options.push('');
    setQuestions(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = value;
    setQuestions(updated);
  };

  const toggleCorrectAnswer = (qIndex: number, answer: string) => {
    const updated = [...questions];
    
    if (updated[qIndex].mcqMode === 'single') {
      updated[qIndex].correctAnswers = [answer];
    } else {
      if (updated[qIndex].correctAnswers.includes(answer)) {
        updated[qIndex].correctAnswers = updated[qIndex].correctAnswers.filter((a: string) => a !== answer);
      } else {
        updated[qIndex].correctAnswers.push(answer);
      }
    }

    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // Set default scheduled time to 1 hour from now
  const getDefaultScheduledTime = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    return now.toISOString().slice(0, 16);
  };

  // Initialize scheduled time when component mounts
  useState(() => {
    setScheduledAt(getDefaultScheduledTime());
  });

  const submitTest = async () => {
    try {
      const payload = {
        title,
        description,
        durationMinutes: parseInt(durationMinutes as any),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        questions,
      };

      console.log("Sending payload:", payload);

      const res = await fetch('http://localhost:4000/tests/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to create test");

      router.push('/tutor/tests');
    } catch (error) {
      console.error(error);
      alert('Failed to create test. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Create a New Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Test Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Test Title</Label>
                <Input 
                  id="title"
                  placeholder="Enter test title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description"
                  placeholder="Enter test description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>

              {/* Duration and Schedule Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duration">Test Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    placeholder="Duration in minutes"
                    min="1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    How long students have to complete the test
                  </p>
                </div>

                <div>
                  <Label htmlFor="scheduledAt">Scheduled Start Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    When the test will become available
                  </p>
                </div>
              </div>

              {/* Test Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Test Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                  <div>Duration: <strong>{durationMinutes} minutes</strong></div>
                  <div>Questions: <strong>{questions.length}</strong></div>
                  <div>Total Marks: <strong>{questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</strong></div>
                  <div>
                    Starts: <strong>
                      {scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Not set'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Questions</h3>
                <Button onClick={addQuestion}>
                  <Plus className="w-4 h-4 mr-2" /> Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <p className="text-gray-500">No questions added yet.</p>
                  <Button onClick={addQuestion} className="mt-2">
                    <Plus className="w-4 h-4 mr-2" /> Add First Question
                  </Button>
                </div>
              ) : (
                questions.map((q, index) => (
                  <Card key={index} className="p-4 border mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold">Question {index + 1}</h4>
                      <Button variant="destructive" size="sm" onClick={() => removeQuestion(index)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor={`question-${index}`}>Question Text</Label>
                        <Textarea
                          id={`question-${index}`}
                          placeholder="Enter question text"
                          value={q.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
                          className="mt-1"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`type-${index}`}>Question Type</Label>
                          <Select
                            value={q.type}
                            onValueChange={(v) => updateQuestion(index, 'type', v)}
                          >
                            <SelectTrigger className="mt-1" id={`type-${index}`}>
                              <span>{q.type}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MCQ">Multiple Choice</SelectItem>
                              <SelectItem value="TRUE_FALSE">True / False</SelectItem>
                              <SelectItem value="SHORT">Short Answer</SelectItem>
                              <SelectItem value="ESSAY">Essay</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor={`marks-${index}`}>Marks</Label>
                          <Input
                            id={`marks-${index}`}
                            type="number"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestion(index, 'marks', parseInt(e.target.value) || 1)
                            }
                            min="1"
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* MCQ OPTIONS */}
                      {q.type === 'MCQ' && (
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                          <div>
                            <Label>MCQ Mode</Label>
                            <Select
                              value={q.mcqMode}
                              onValueChange={(v) => updateQuestion(index, 'mcqMode', v)}
                            >
                              <SelectTrigger className="mt-1">
                                <span>{q.mcqMode === 'single' ? 'Single Correct' : 'Multiple Correct'}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">Single Correct</SelectItem>
                                <SelectItem value="multiple">Multiple Correct</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Options</Label>
                            <div className="space-y-2 mt-2">
                              {q.options.map((opt: string, optIndex: number) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <Input
                                    value={opt}
                                    placeholder={`Option ${optIndex + 1}`}
                                    onChange={(e) =>
                                      updateOption(index, optIndex, e.target.value)
                                    }
                                    className="flex-1"
                                  />

                                  <Button
                                    size="sm"
                                    type="button"
                                    variant={
                                      q.correctAnswers.includes(opt) ? "default" : "secondary"
                                    }
                                    onClick={() => toggleCorrectAnswer(index, opt)}
                                  >
                                    {q.correctAnswers.includes(opt)
                                      ? "Correct"
                                      : "Mark"}
                                  </Button>
                                </div>
                              ))}
                            </div>

                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => addOption(index)}
                              className="mt-2"
                            >
                              Add Option
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* TRUE / FALSE */}
                      {q.type === 'TRUE_FALSE' && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <Label>Correct Answer</Label>
                          <Select
                            value={q.correctAnswers[0] || ''}
                            onValueChange={(v) => updateQuestion(index, 'correctAnswers', [v])}
                          >
                            <SelectTrigger className="mt-1">
                              <span>{q.correctAnswers[0] || 'Choose correct answer'}</span>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* SHORT ANSWER */}
                      {q.type === 'SHORT' && (
                        <div className="p-4 bg-gray-50 rounded-lg">
                          <Label>Expected Answers</Label>
                          <div className="space-y-2 mt-2">
                            {(q.correctAnswers || []).map((answer: string, ansIndex: number) => (
                              <div key={ansIndex} className="flex gap-2">
                                <Input
                                  value={answer}
                                  placeholder={`Expected answer ${ansIndex + 1}`}
                                  onChange={(e) => {
                                    const updated = [...questions];
                                    const newAnswers = [...(updated[index].correctAnswers || [])];
                                    newAnswers[ansIndex] = e.target.value;
                                    updated[index].correctAnswers = newAnswers;
                                    setQuestions(updated);
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const updated = [...questions];
                                    updated[index].correctAnswers = 
                                      (updated[index].correctAnswers || []).filter((_:number, i:number) => i !== ansIndex);
                                    setQuestions(updated);
                                  }}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const updated = [...questions];
                                updated[index].correctAnswers = [
                                  ...(updated[index].correctAnswers || []),
                                  ''
                                ];
                                setQuestions(updated);
                              }}
                            >
                              Add Expected Answer
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* ESSAY - No correct answers needed */}
                      {q.type === 'ESSAY' && (
                        <div className="p-4 bg-yellow-50 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            Essay questions are manually graded. No correct answers needed.
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-4 pt-6 border-t">
              <Button variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button onClick={submitTest} className="flex-1">
                Create Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}