'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Save, Flag, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface Question {
  id: number;
  questionText: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'SHORT' | 'ESSAY';
  options?: string[];
  marks: number;
  testPic?: string;
}

interface Test {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  questions: Question[];
  totalScore: number;
}

interface Answer {
  questionId: number;
  response: string | string[];
}

interface Submission {
  id: number;
  submittedAt: string;
  score: number;
  totalScore: number;
  evaluated: boolean;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);
  
  const [test, setTest] = useState<Test | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [violations, setViolations] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [testAlreadyTaken, setTestAlreadyTaken] = useState(false);
  const [mistakeCount, setMistakeCount] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number>(0);
  const blurCountRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Anti-cheating measures
  useEffect(() => {
    if (!testStarted) return;

    // Disable right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // Disable copy-paste
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      setViolations(prev => prev + 1);
      setShowWarningModal(true);
    };

    // Detect tab/window switch
    const handleVisibilityChange = () => {
      if (document.hidden && testStarted) {
        blurCountRef.current += 1;
        setViolations(prev => prev + 1);
        setShowWarningModal(true);
        
        if (blurCountRef.current >= 3) {
          handleAutoSubmit('Too many tab switches detected');
        }
      }
    };

    // Detect keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'a')) {
        if (testStarted) {
          e.preventDefault();
          setViolations(prev => prev + 1);
          setShowWarningModal(true);
        }
      }
      
      // F12, Ctrl+Shift+I, etc.
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        setViolations(prev => prev + 1);
        setShowWarningModal(true);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('paste', handleCopy);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('paste', handleCopy);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [testStarted]);

  // Load test questions
  useEffect(() => {
    fetchTestQuestions();
  }, [testId]);

  // Timer effect
  useEffect(() => {
    if (!testStarted || timeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleAutoSubmit('Time is up!');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [testStarted, timeLeft]);

  // Auto-save progress
  useEffect(() => {
    if (testStarted && answers.length > 0) {
      const saveKey = `test_${testId}_progress`;
      localStorage.setItem(saveKey, JSON.stringify({
        answers,
        currentQuestion,
        startTime: startTimeRef.current,
        violations
      }));
    }
  }, [answers, currentQuestion, testId, testStarted, violations]);

  const fetchTestQuestions = async () => {
    try {
      const response = await fetch(`http://localhost:4000/tests/${testId}/questions`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Check if it's a 406 error (test already taken)
        if (response.status === 406) {
          setTestAlreadyTaken(true);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch test questions');
      }

      const data = await response.json();
      setTest(data);
      
      // Load saved progress if exists
      const savedProgress = localStorage.getItem(`test_${testId}_progress`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setAnswers(progress.answers || []);
        setCurrentQuestion(progress.currentQuestion || 0);
        setViolations(progress.violations || 0);
        
        // Calculate remaining time
        const elapsed = Math.floor((Date.now() - progress.startTime) / 1000);
        const remaining = (data.durationMinutes * 60) - elapsed;
        setTimeLeft(Math.max(0, remaining));
        setTestStarted(true); // Resume test if progress exists
      } else {
        // Set timer: use provided duration or default to 2 hours (120 minutes)
        const duration = data.durationMinutes || 120;
        setTimeLeft(duration * 60); // Convert minutes to seconds
      }
    } catch (error) {
      console.error('Error fetching test questions:', error);
      // Check if it's a test already taken error
      if (error instanceof Error && error.message.includes('already')) {
        setTestAlreadyTaken(true);
      } else {
        alert('Failed to load test. Please try again.');
        router.push('/student/tests');
      }
    } finally {
      setLoading(false);
    }
  };

  const startTest = () => {
    startTimeRef.current = Date.now();
    setTestStarted(true);
    
    // If no saved progress, set the timer based on test duration
    if (!localStorage.getItem(`test_${testId}_progress`)) {
      const duration = test?.durationMinutes || 120; // Default 2 hours
      setTimeLeft(duration * 60); // Convert to seconds
    }
  };

  const handleAnswerChange = (questionId: number, response: string | string[]) => {
    setAnswers(prev => {
      const existingIndex = prev.findIndex(a => a.questionId === questionId);
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { questionId, response };
        return updated;
      } else {
        return [...prev, { questionId, response }];
      }
    });
  };

  const getCurrentAnswer = (questionId: number) => {
    return answers.find(a => a.questionId === questionId)?.response;
  };

  const handleNext = () => {
    if (currentQuestion < (test?.questions.length || 0) - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleAutoSubmit = async (reason: string) => {
    if (submitting) return;
    
    setSubmitting(true);
    
    // Clear timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Clear saved progress
    localStorage.removeItem(`test_${testId}_progress`);
    
    await submitTest(reason);
    alert(`Test auto-submitted: ${reason}`);
    
    // Redirect to tests page
    router.push('/student/tests');
  };

  const reportProctoringViolation = async (type: string, description: string) => {
    try {
      await fetch('http://localhost:4000/proctoring/test-violation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId,
          violationType: type,
          description,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to report proctoring violation:', error);
    }
  };

  const checkMistakes = async () => {
    try {
      const response = await fetch(`http://localhost:4000/tests/${testId}/mistakes`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setMistakeCount(data.mistakeCount);
        if (data.mistakeCount >= 3) {
          handleAutoSubmit('Three incorrect answers detected');
        }
      }
    } catch (error) {
      console.error('Failed to check mistakes:', error);
    }
  };

  const submitTest = async (autoSubmitReason?: string) => {
    try {
      const response = await fetch(`http://localhost:4000/tests/${testId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answers: answers.map(answer => ({
            questionId: answer.questionId,
            response: answer.response
          })),
          violations: violations,
          autoSubmitted: !!autoSubmitReason,
          autoSubmitReason: autoSubmitReason || null,
          mistakeCount
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit test');
      }

      // Clear saved progress
      localStorage.removeItem(`test_${testId}_progress`);
      
      const result = await response.json();
      router.push(`/student/results`);
      
    } catch (error) {
      console.error('Error submitting test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const exitTest = () => {
    if (window.confirm('Are you sure you want to exit the test? Your progress will be saved.')) {
      setTestStarted(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading test...</p>
        </div>
      </div>
    );
  }

  // Show test already taken screen
  if (testAlreadyTaken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center p-4 font-['Inter']">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/60 backdrop-blur-3xl rounded-2xl shadow-xl shadow-orange-100/50 p-8 max-w-md w-full border border-orange-200/50 text-center"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-200/50">
            <CheckCircle2 className="h-8 w-8 text-white drop-shadow-sm" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Test Already Completed</h1>
          <p className="text-gray-600 mb-6">
            You have already taken this test. You cannot attempt the same test again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/student/tests')}
              className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-200/50"
            >
              Browse More Tests
            </button>
            <button
              onClick={() => router.push('/student/results')}
              className="w-full px-6 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30"
            >
              View My Results
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Test Not Found</h2>
          <button 
            onClick={() => router.push('/student/tests')}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-200/50"
          >
            Back to Tests
          </button>
        </div>
      </div>
    );
  }

  if (!testStarted) {
    return <TestInstructions test={test} onStart={startTest} />;
  }

  const currentQ = test.questions[currentQuestion];
  const isLastQuestion = currentQuestion === test.questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white p-4 font-['Inter']">
      {/* Header with Timer and Progress */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur-3xl rounded-2xl shadow-xl shadow-orange-100/50 p-6 mb-6 border border-orange-200/50"
      >
        <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl shadow-lg ${
              timeLeft < 300 ? 'bg-gradient-to-r from-red-400 to-red-500 text-white shadow-red-200/50' : 'bg-gradient-to-r from-orange-400 to-orange-500 text-white shadow-orange-200/50'
            }`}>
              <Clock className="h-6 w-6 drop-shadow-sm" />
            </div>
            <div>
              <div className={`text-2xl font-bold ${
                timeLeft < 300 ? 'text-red-600' : 'text-gray-800'
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-500">Time Remaining</div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg font-bold text-gray-800">{test.title}</div>
            <div className="text-sm text-gray-500">Question {currentQuestion + 1} of {test.questions.length}</div>
          </div>

          <div className="flex items-center space-x-4">
            {violations > 0 && (
              <span className="px-3 py-1 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Violations: {violations}
              </span>
            )}
            {mistakeCount > 0 && (
              <span className={`px-3 py-1 border rounded-full text-xs font-medium flex items-center gap-1 ${
                mistakeCount >= 3 ? 'bg-red-100 text-red-700 border-red-200' :
                mistakeCount >= 2 ? 'bg-orange-100 text-orange-700 border-orange-200' :
                'bg-yellow-100 text-yellow-700 border-yellow-200'
              }`}>
                <XCircle className="h-3 w-3" />
                Mistakes: {mistakeCount}/3
              </span>
            )}
            <button
              onClick={exitTest}
              className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-red-200/50 text-red-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-red-100/30"
            >
              Exit Test
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 w-full bg-white/40 rounded-full h-3 shadow-inner">
          <div
            className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-300 shadow-lg shadow-orange-200/50"
            style={{ width: `${((currentQuestion + 1) / test.questions.length) * 100}%` }}
          />
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Questions Navigation */}
        <div className="lg:col-span-1 bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50">
          <div className="p-6 border-b border-orange-200/50">
            <h3 className="text-lg font-semibold text-gray-800">Questions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-5 lg:grid-cols-2 gap-2">
              {test.questions.map((q, index) => {
                const isAnswered = answers.some(a => a.questionId === q.id);
                const isCurrent = index === currentQuestion;
                
                return (
                  <button
                    key={q.id}
                    className={`h-10 w-10 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                      isCurrent ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 scale-105' : 
                      isAnswered ? 'bg-green-100 text-green-800 border border-green-200 shadow-green-100/30 hover:scale-105' : 
                      'bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 hover:bg-white/80 hover:scale-105 shadow-orange-100/30'
                    }`}
                    onClick={() => setCurrentQuestion(index)}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="lg:col-span-3 bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl shadow-xl shadow-orange-100/50">
          <div className="p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Question Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="inline-block px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-full text-sm font-medium mb-2">
                      {currentQ.type} • {currentQ.marks} mark{currentQ.marks !== 1 ? 's' : ''}
                    </span>
                    <h2 className="text-xl font-bold text-gray-800">
                      Question {currentQuestion + 1}
                    </h2>
                  </div>
                  <button className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30 flex items-center gap-2">
                    <Flag className="h-4 w-4" />
                    Flag
                  </button>
                </div>

                {/* Question Text */}
                <div className="mb-6">
                  <p className="text-lg text-gray-700 whitespace-pre-wrap">
                    {currentQ.questionText}
                  </p>
                  {currentQ.testPic && (
                    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                      <img 
                        src={currentQ.testPic} 
                        alt="Question diagram" 
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  )}
                </div>

                {/* Answer Input */}
                <div className="space-y-4">
                  {currentQ.type === 'MCQ' && currentQ.options && (
                    <RadioGroup
                      value={getCurrentAnswer(currentQ.id) as string || ''}
                      onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                      className="space-y-3"
                    >
                      {currentQ.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-3 p-4 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl hover:bg-white/60 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-orange-100/20">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer text-gray-700">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {currentQ.type === 'TRUE_FALSE' && (
                    <RadioGroup
                      value={getCurrentAnswer(currentQ.id) as string || ''}
                      onValueChange={(value) => handleAnswerChange(currentQ.id, value)}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-4 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl hover:bg-white/60 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-orange-100/20">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true" className="cursor-pointer text-gray-700">True</Label>
                      </div>
                      <div className="flex items-center space-x-3 p-4 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl hover:bg-white/60 hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-orange-100/20">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false" className="cursor-pointer text-gray-700">False</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {(currentQ.type === 'SHORT' || currentQ.type === 'ESSAY') && (
                    <textarea
                      ref={textareaRef}
                      value={getCurrentAnswer(currentQ.id) as string || ''}
                      onChange={(e) => handleAnswerChange(currentQ.id, e.target.value)}
                      placeholder={currentQ.type === 'SHORT' ? 'Enter your short answer...' : 'Write your essay answer...'}
                      className="w-full min-h-[120px] p-4 bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/20 resize-none text-gray-700"
                      onCopy={(e) => {
                        e.preventDefault();
                        setViolations(prev => prev + 1);
                        setShowWarningModal(true);
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        setViolations(prev => prev + 1);
                        setShowWarningModal(true);
                      }}
                    />
                  )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-orange-200/30">
                  <button
                    onClick={handlePrevious}
                    disabled={currentQuestion === 0}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg flex items-center gap-2 ${
                      currentQuestion === 0 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 hover:bg-white/80 hover:scale-105 shadow-orange-100/30'
                    }`}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const saveKey = `test_${testId}_progress`;
                        localStorage.setItem(saveKey, JSON.stringify({
                          answers,
                          currentQuestion,
                          startTime: startTimeRef.current,
                          violations
                        }));
                        alert('Progress saved!');
                      }}
                      className="px-6 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30 flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>

                    {isLastQuestion ? (
                      <button
                        onClick={() => submitTest()}
                        disabled={submitting}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-green-200/50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {submitting ? 'Submitting...' : 'Submit Test'}
                      </button>
                    ) : (
                      <button
                        onClick={handleNext}
                        className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-200/50 flex items-center gap-2"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Warning Modal for Violations */}
      <AnimatePresence>
        {showWarningModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white/60 backdrop-blur-3xl rounded-2xl p-6 max-w-md mx-4 shadow-xl shadow-orange-100/50 border border-orange-200/50"
            >
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Warning!</h3>
                <p className="text-gray-600 mb-4">
                  {violations >= 3 
                    ? 'Multiple violations detected. Test will be auto-submitted.'
                    : 'Suspicious activity detected. Please focus on the test.'}
                </p>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-red-200/50"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Instructions Component
function TestInstructions({ test, onStart }: { test: Test; onStart: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center p-4 font-['Inter']">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/60 backdrop-blur-3xl rounded-2xl shadow-xl shadow-orange-100/50 p-8 max-w-2xl w-full border border-orange-200/50"
      >
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200/50">
            <AlertTriangle className="h-8 w-8 text-white drop-shadow-sm" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{test.title}</h1>
          <p className="text-gray-600">Please read the instructions carefully before starting</p>
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-bold text-red-800 mb-3 text-lg">⚠️ Strict Rules:</h3>
            <ul className="text-red-700 space-y-2">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>Do NOT switch tabs or windows</strong> - This will be detected and may result in auto-submission</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>Copy-paste is disabled</strong> - All content must be typed</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>Right-click is disabled</strong> - To prevent context menu access</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>Timer is strict</strong> - Test auto-submits when time ends</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span><strong>Multiple violations</strong> will result in automatic submission</span>
              </li>
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/40 backdrop-blur-xl p-4 rounded-xl border border-orange-200/30 shadow-lg shadow-orange-100/20">
              <h4 className="font-semibold text-orange-800 mb-2">Duration</h4>
              <p className="text-orange-700">{test.durationMinutes} minutes</p>
            </div>
            <div className="bg-white/40 backdrop-blur-xl p-4 rounded-xl border border-green-200/30 shadow-lg shadow-green-100/20">
              <h4 className="font-semibold text-green-800 mb-2">Questions</h4>
              <p className="text-green-700">{test.questions.length} questions</p>
            </div>
            <div className="bg-white/40 backdrop-blur-xl p-4 rounded-xl border border-purple-200/30 shadow-lg shadow-purple-100/20">
              <h4 className="font-semibold text-purple-800 mb-2">Total Marks</h4>
              <p className="text-purple-700">{test.totalScore} marks</p>
            </div>
            <div className="bg-white/40 backdrop-blur-xl p-4 rounded-xl border border-blue-200/30 shadow-lg shadow-blue-100/20">
              <h4 className="font-semibold text-blue-800 mb-2">Type</h4>
              <p className="text-blue-700">Proctored Test</p>
            </div>
          </div>

          <div className="bg-white/40 backdrop-blur-xl border border-orange-200/30 rounded-xl p-4 shadow-lg shadow-orange-100/20">
            <h4 className="font-semibold text-orange-800 mb-2">Allowed:</h4>
            <ul className="text-orange-700 space-y-1">
              <li>• Calculator usage (if needed)</li>
              <li>• Rough work on paper</li>
              <li>• Full-screen mode recommended</li>
              <li>• Saving progress automatically</li>
            </ul>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onStart}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-300 shadow-xl shadow-orange-200/50"
          >
            Start Test Now
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Timer starts immediately after clicking "Start Test Now"
          </p>
        </div>
      </motion.div>
    </div>
  );
}