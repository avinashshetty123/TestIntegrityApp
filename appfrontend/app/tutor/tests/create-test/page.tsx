'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';

export default function CreateTestPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [scheduledAt, setScheduledAt] = useState('');
  const [questions, setQuestions] = useState<any[]>([]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionText: '',
        type: 'MCQ',
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

  const submitTest = async () => {
    try {
      const payload = {
        title,
        description,
        durationMinutes: parseInt(durationMinutes as any),
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : new Date().toISOString(),
        questions,
      };

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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 p-6" style={{ backdropFilter: 'blur(30px)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl mb-8"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl mb-8"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}>
            Create a New Test
          </h1>

          <div className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Test Title</label>
                <input 
                  placeholder="Enter test title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Description</label>
                <textarea 
                  placeholder="Enter test description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Test Duration (minutes)</label>
                  <input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    placeholder="Duration in minutes"
                    min="1"
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Scheduled Start Time</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-orange-50/80 backdrop-blur-xl border border-orange-200/50 shadow-lg">
                <h4 className="font-black text-orange-600 mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Test Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm font-semibold text-orange-700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  <div>Duration: <span className="font-black">{durationMinutes} minutes</span></div>
                  <div>Questions: <span className="font-black">{questions.length}</span></div>
                  <div>Total Marks: <span className="font-black">{questions.reduce((acc, q) => acc + (q.marks || 1), 0)}</span></div>
                  <div>
                    Starts: <span className="font-black">
                      {scheduledAt ? new Date(scheduledAt).toLocaleString() : 'Not set'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-orange-200/30 pt-8">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Questions</h3>
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

              {questions.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-orange-200/50 rounded-2xl bg-orange-50/30">
                  <p className="text-gray-500 font-medium mb-4" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>No questions added yet.</p>
                  <button 
                    onClick={addQuestion}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-2xl hover:shadow-orange-500/50 hover:scale-110 transition-all duration-300 flex items-center gap-2 mx-auto"
                    style={{ 
                      fontFamily: 'Inter, system-ui, sans-serif',
                      boxShadow: '0 20px 40px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <Plus className="w-5 h-5" /> Add First Question
                  </button>
                </div>
              ) : (
                questions.map((q, index) => (
                  <div key={index} className="p-6 rounded-2xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl mb-6"
                       style={{ 
                         boxShadow: '0 25px 50px rgba(251, 146, 60, 0.2), 0 10px 25px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                         filter: 'drop-shadow(0 15px 30px rgba(251, 146, 60, 0.15))'
                       }}>
                    <div className="flex justify-between items-center mb-6">
                      <h4 className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Question {index + 1}</h4>
                      <button 
                        onClick={() => removeQuestion(index)}
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
                          placeholder="Enter question text"
                          value={q.questionText}
                          onChange={(e) => updateQuestion(index, 'questionText', e.target.value)}
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
                            onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            <option value="MCQ">Multiple Choice</option>
                            <option value="TRUE_FALSE">True/False</option>
                            <option value="SHORT">Short Answer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Marks</label>
                          <input
                            type="number"
                            value={q.marks}
                            onChange={(e) =>
                              updateQuestion(index, 'marks', parseInt(e.target.value) || 1)
                            }
                            min="1"
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          />
                        </div>
                      </div>

                      {q.type === 'MCQ' && (
                        <div className="space-y-4 p-6 bg-orange-50/50 rounded-xl border border-orange-200/30">
                          <div>
                            <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>MCQ Mode</label>
                            <select
                              value={q.mcqMode}
                              onChange={(e) => updateQuestion(index, 'mcqMode', e.target.value)}
                              className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              <option value="single">Single Correct</option>
                              <option value="multiple">Multiple Correct</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Options</label>
                            <div className="space-y-3 mt-2">
                              {q.options.map((opt: string, optIndex: number) => (
                                <div key={optIndex} className="flex items-center gap-3">
                                  <input
                                    value={opt}
                                    placeholder={`Option ${optIndex + 1}`}
                                    onChange={(e) =>
                                      updateOption(index, optIndex, e.target.value)
                                    }
                                    className="flex-1 px-4 py-2 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => toggleCorrectAnswer(index, opt)}
                                    className={`px-4 py-2 font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 ${
                                      q.correctAnswers.includes(opt)
                                        ? 'bg-green-500 text-white'
                                        : 'bg-white/60 text-orange-600 border border-orange-200/50'
                                    }`}
                                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                                  >
                                    {q.correctAnswers.includes(opt) ? "Correct" : "Mark"}
                                  </button>
                                </div>
                              ))}
                            </div>

                            <button 
                              onClick={() => addOption(index)}
                              className="mt-4 px-4 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                            >
                              Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      {q.type === 'TRUE_FALSE' && (
                        <div className="p-6 bg-orange-50/50 rounded-xl border border-orange-200/30">
                          <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Correct Answer</label>
                          <select
                            value={q.correctAnswers[0] || ''}
                            onChange={(e) => updateQuestion(index, 'correctAnswers', [e.target.value])}
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                          >
                            <option value="">Select correct answer</option>
                            <option value="True">True</option>
                            <option value="False">False</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <button 
            onClick={submitTest}
            className="px-12 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300"
            style={{ 
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
            }}
          >
            Create Test
          </button>
        </div>
      </div>

      {/* Floating Add Question Button */}
      <button 
        onClick={addQuestion}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-full shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 flex items-center justify-center z-50"
        style={{ 
          fontFamily: 'Inter, system-ui, sans-serif',
          boxShadow: '0 20px 40px rgba(251, 146, 60, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
        }}
        title="Add Question"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}