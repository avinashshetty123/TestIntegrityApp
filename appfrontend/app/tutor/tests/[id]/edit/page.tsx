"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
      const questionsData = test.questions.map((q: Question) => ({
        ...q,
        options: q.type === 'MCQ' || q.type === 'TRUE_FALSE' ? (q.options || []) : null,
        correctAnswers: q.type === 'MCQ' || q.type === 'TRUE_FALSE' || q.type === 'SHORT' ? (q.correctAnswers || []) : null
      }));

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

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl" style={{ boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25)' }}>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-600 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 p-6" style={{ backdropFilter: 'blur(30px)' }}>
      <div className="max-w-4xl mx-auto space-y-8">
        <button 
          onClick={() => router.back()}
          className="mb-6 px-6 py-3 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
          style={{ 
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 20px 40px rgba(255, 255, 255, 0.4), 0 5px 15px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          Back
        </button>
        
        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
            style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}>
          Edit Test
        </h1>

        <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <h2 className="text-2xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Basic Info</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Test Title</label>
              <input
                value={test.title}
                onChange={(e) => setTest({ ...test, title: e.target.value })}
                placeholder="Test title"
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Description</label>
              <textarea
                value={test.description}
                onChange={(e) => setTest({ ...test, description: e.target.value })}
                placeholder="Test description"
                rows={4}
                className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none"
                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
              />
            </div>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Questions</h2>
            <button 
              onClick={addQuestion}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 flex items-center gap-2"
              style={{ 
                fontFamily: 'Inter, system-ui, sans-serif',
                boxShadow: '0 20px 40px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <Plus className="w-5 h-5" /> Add Question
            </button>
          </div>

          <div className="space-y-6">
            {test.questions.map((q: Question, index: number) => (
              <div
                key={index}
                className="p-6 rounded-2xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
                style={{ 
                  boxShadow: '0 25px 50px rgba(251, 146, 60, 0.2), 0 10px 25px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                  filter: 'drop-shadow(0 15px 30px rgba(251, 146, 60, 0.15))'
                }}
              >
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Question {index + 1}</h3>
                  <button 
                    onClick={() => deleteQuestion(index)}
                    className="px-3 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-red-500/25 hover:scale-105 transition-all duration-300"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Question Text</label>
                    <textarea
                      value={q.questionText}
                      onChange={(e) => updateQuestion(index, "questionText", e.target.value)}
                      placeholder="Enter question text"
                      rows={3}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Question Type</label>
                      <select
                        value={q.type}
                        onChange={(e) => updateQuestion(index, "type", e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        <option value="SHORT">Short Answer</option>
                        <option value="MCQ">Multiple Choice</option>
                        <option value="TRUE_FALSE">True/False</option>
                        <option value="ESSAY">Essay</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Marks</label>
                      <input
                        type="number"
                        value={q.marks}
                        onChange={(e) => updateQuestion(index, "marks", Number(e.target.value))}
                        placeholder="Marks"
                        min="1"
                        className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                    </div>
                  </div>

                  {(q.type === 'MCQ' || q.type === 'TRUE_FALSE') && (
                    <div className="space-y-4 p-6 bg-orange-50/50 rounded-xl border border-orange-200/30">
                      <label className="block text-sm font-bold text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Options:</label>
                      {(q.options || []).map((option: string, optIndex: number) => (
                        <div key={optIndex} className="flex gap-3 items-center">
                          <input
                            value={option}
                            onChange={(e) => updateQuestionOption(index, optIndex, e.target.value)}
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-4 py-2 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          />
                          <button
                            onClick={() => removeQuestionOption(index, optIndex)}
                            className="px-3 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addQuestionOption(index)}
                        className="px-4 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        Add Option
                      </button>
                    </div>
                  )}

                  {q.type === 'SHORT' && (
                    <div className="space-y-4 p-6 bg-orange-50/50 rounded-xl border border-orange-200/30">
                      <label className="block text-sm font-bold text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Expected Answers:</label>
                      {(q.correctAnswers || []).map((answer: string, ansIndex: number) => (
                        <div key={ansIndex} className="flex gap-3 items-center">
                          <input
                            value={answer}
                            onChange={(e) => updateCorrectAnswer(index, ansIndex, e.target.value)}
                            placeholder={`Expected answer ${ansIndex + 1}`}
                            className="flex-1 px-4 py-2 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          />
                          <button
                            onClick={() => removeCorrectAnswer(index, ansIndex)}
                            className="px-3 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addCorrectAnswer(index)}
                        className="px-4 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        Add Expected Answer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <button 
            onClick={saveTest}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300"
            style={{ 
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
            }}
          >
            Save Test
          </button>
        </div>
      </div>
    </div>
  );
}