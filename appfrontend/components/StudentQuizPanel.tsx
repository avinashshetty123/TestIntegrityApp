"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  MessageSquare, Clock, CheckCircle, XCircle, Play, Square,
  Send, Award, Users, Timer
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface QuizQuestion {
  id: string;
  question: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';
  options?: string[];
  timeLimit: number;
  startedAt: string;
}

interface StudentQuizPanelProps {
  meetingId: string;
  isConnected: boolean;
  userInfo: any;
}

export default function StudentQuizPanel({ meetingId, isConnected, userInfo }: StudentQuizPanelProps) {
  const [activeQuiz, setActiveQuiz] = useState<QuizQuestion | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { toast } = useToast();

  // Socket.IO connection for real-time quiz updates
  useEffect(() => {
    if (isConnected && userInfo?.id) {
      console.log('🔌 Connecting to quiz WebSocket...');
      
      // Initialize Socket.IO connection
      const socket = io('http://localhost:4000/quiz', {
        transports: ['websocket', 'polling'], // Try both transports
        withCredentials: true,
        timeout: 10000,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('✅ Connected to quiz WebSocket with ID:', socket.id);
        
        // Join the room immediately after connection
        socket.emit('joinRoom', {
          meetingId,
          userId: userInfo.id,
          role: 'student'
        });
      });

      socket.on('connected', (data) => {
        console.log('✅ Server connection confirmed:', data);
      });

      socket.on('joinedRoom', (data) => {
        console.log('✅ Successfully joined quiz room:', data);
      });

      // Quiz events
      socket.on('questionReceived', (data) => {
        console.log('📥 Received question:', data);
        handleNewQuestion(data);
      });

      socket.on('answerSubmitted', (data) => {
        console.log('✅ Answer submission confirmed:', data);
        handleAnswerSubmissionResponse(data);
      });

      socket.on('quizEnded', (data) => {
        console.log('📢 Quiz ended:', data);
        handleQuizEnded(data);
      });

      socket.on('newAnswer', (data) => {
        console.log('👥 New answer from other student:', data);
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        toast({
          title: "Quiz Error",
          description: error.message || "Something went wrong",
          variant: "destructive",
        });
      });

      socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        toast({
          title: "Connection Failed",
          description: "Could not connect to quiz server",
          variant: "destructive",
        });
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 Disconnected:', reason);
        toast({
          title: "Disconnected",
          description: "Lost connection to quiz server",
          variant: "destructive",
        });
      });

      // Cleanup on unmount
      return () => {
        console.log('🧹 Cleaning up socket connection');
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isConnected, meetingId, userInfo]);

  const handleNewQuestion = (data: any) => {
    console.log('🆕 Handling new question:', data);
    
    const newQuiz: QuizQuestion = {
      id: data.id,
      question: data.question,
      type: data.type,
      options: data.options,
      timeLimit: data.timeLimit,
      startedAt: data.startedAt
    };

    setActiveQuiz(newQuiz);
    setSelectedAnswer('');
    setShortAnswer('');
    setHasSubmitted(false);
    setSubmissionResult(null);
    setTimeRemaining(data.timeLimit);
    startTimeRef.current = Date.now();

    // Start timer
    startTimer(data.timeLimit);

    toast({
      title: "New Quiz Question!",
      description: "A new question has been started by the tutor",
    });
  };

  const startTimer = (timeLimit: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let remaining = timeLimit;
    setTimeRemaining(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Auto-submit when time is up
        if (activeQuiz && !hasSubmitted) {
          autoSubmitAnswer();
        }
      }
    }, 1000);
  };

  const autoSubmitAnswer = () => {
    if (!activeQuiz) return;

    let answer = '';
    if (activeQuiz.type === 'MCQ' && selectedAnswer) {
      answer = selectedAnswer;
    } else if (activeQuiz.type === 'SHORT_ANSWER' && shortAnswer) {
      answer = shortAnswer;
    } else if (activeQuiz.type === 'TRUE_FALSE' && selectedAnswer) {
      answer = selectedAnswer;
    } else {
      answer = 'TIME_EXPIRED';
    }

    submitAnswer(answer);
  };

  const submitAnswer = async (customAnswer?: string) => {
    if (!activeQuiz || !socketRef.current || hasSubmitted) {
      console.log('❌ Cannot submit answer:', { activeQuiz, socket: socketRef.current, hasSubmitted });
      return;
    }

    setIsSubmitting(true);

    const answer = customAnswer || 
      (activeQuiz.type === 'SHORT_ANSWER' ? shortAnswer : selectedAnswer);

    if (!answer && activeQuiz.type !== 'SHORT_ANSWER') {
      toast({
        title: "No Answer Selected",
        description: "Please select an answer before submitting",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const responseTime = Math.floor((Date.now() - startTimeRef.current) / 1000);

    console.log('📤 Submitting answer:', {
      quizId: activeQuiz.id,
      answer,
      responseTime
    });

    try {
      socketRef.current.emit('submitAnswer', {
        quizId: activeQuiz.id,
        answer: answer,
        responseTime: responseTime
      });
    } catch (error) {
      console.error('❌ Error emitting submitAnswer:', error);
      setIsSubmitting(false);
      toast({
        title: "Submission Failed",
        description: "Could not submit answer",
        variant: "destructive",
      });
    }
  };

  const handleAnswerSubmissionResponse = (data: any) => {
    console.log('✅ Answer submission response:', data);
    
    setIsSubmitting(false);
    setHasSubmitted(true);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setSubmissionResult({
      submittedAt: data.submittedAt,
      responseId: data.responseId
    });

    toast({
      title: "Answer Submitted!",
      description: "Your answer has been received",
      variant: "default",
    });

    // Fetch updated leaderboard
    fetchLeaderboard();
  };

  const handleQuizEnded = (data: any) => {
    console.log('🛑 Quiz ended:', data);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setActiveQuiz(null);
    setTimeRemaining(0);

    toast({
      title: "Quiz Ended",
      description: "The tutor has ended the quiz",
    });

    // Fetch final leaderboard
    fetchLeaderboard();
    fetchQuizHistory();
  };

  const fetchLeaderboard = async () => {
    try {
      console.log('📊 Fetching leaderboard...');
      const response = await fetch(`http://localhost:4000/quiz/${meetingId}/leaderboard`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const leaderboardData = await response.json();
        console.log('📊 Leaderboard data:', leaderboardData);
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      } else {
        console.error('❌ Failed to fetch leaderboard:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
    }
  };

  const fetchQuizHistory = async () => {
    try {
      // This would need to be implemented in your backend
      const response = await fetch(`http://localhost:4000/quiz/${meetingId}/student-history`, {
        credentials: 'include'
      });
      if (response.ok) {
        const history = await response.json();
        setQuizHistory(Array.isArray(history) ? history : []);
      }
    } catch (error) {
      console.error('Error fetching quiz history:', error);
    }
  };

  const getAnswerButtonText = () => {
    if (isSubmitting) return "Submitting...";
    if (hasSubmitted) return "Submitted ✓";
    return "Submit Answer";
  };

  const getTimerColor = () => {
    if (timeRemaining <= 10) return 'text-red-400';
    if (timeRemaining <= 30) return 'text-orange-400';
    return 'text-green-400';
  };

  const getProgressPercentage = () => {
    if (!activeQuiz) return 100;
    return (timeRemaining / activeQuiz.timeLimit) * 100;
  };

  const isthere = socketRef.current?.connected;

  return (
    <div className="w-80 bg-white/60 backdrop-blur-3xl border-l border-orange-200/30 flex flex-col shadow-[0_0_50px_rgba(251,146,60,0.1)] font-['Inter']">
      <div className="p-6 border-b border-orange-200/30">
        <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          Student Quiz
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection Status */}
        <div className="text-center">
          <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
            isthere 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30" 
              : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30"
          }`}>
            {isthere ? `Connected to Quiz` : "Disconnected"}
            {socketRef.current?.id && ` (${socketRef.current.id.slice(-6)})`}
          </div>
        </div>

        {activeQuiz ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40 hover:shadow-[0_20px_45px_rgba(251,146,60,0.2)] transition-all duration-300">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-bold text-gray-800">Active Quiz</h4>
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg shadow-green-500/30">
                  Live
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {/* Timer Section */}
              <div className="flex items-center justify-between">
                <div className="bg-orange-100 p-3 rounded-xl flex items-center gap-2">
                  <Timer className="w-4 h-4 text-orange-600" />
                  <span className={`font-bold ${
                    timeRemaining <= 10 ? 'text-red-600' : 
                    timeRemaining <= 30 ? 'text-orange-600' : 'text-green-600'
                  }`}>
                    {timeRemaining}s
                  </span>
                </div>
                <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-xl font-semibold text-sm">
                  {activeQuiz.type}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-orange-200 rounded-full h-3 shadow-inner">
                <div 
                  className="h-3 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ 
                    width: `${getProgressPercentage()}%`,
                    background: timeRemaining <= 10 ? 'linear-gradient(to right, #ef4444, #dc2626)' : 
                               timeRemaining <= 30 ? 'linear-gradient(to right, #f97316, #ea580c)' : 'linear-gradient(to right, #f97316, #ea580c)'
                  }}
                />
              </div>

              {/* Question */}
              <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200/50">
                <h4 className="text-gray-800 font-bold text-lg mb-4">
                  {activeQuiz.question}
                </h4>

                {/* Answer Input Based on Question Type */}
                {activeQuiz.type === 'MCQ' && activeQuiz.options && (
                  <div className="space-y-3">
                    {activeQuiz.options.map((option, index) => (
                      <label key={index} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          value={option}
                          checked={selectedAnswer === option}
                          onChange={(e) => setSelectedAnswer(e.target.value)}
                          disabled={hasSubmitted}
                          className="w-4 h-4 text-orange-600 border-orange-300 focus:ring-orange-500"
                        />
                        <div className="flex-1 py-3 px-4 rounded-xl bg-white/80 border border-orange-200/50 hover:bg-white/90 hover:border-orange-300 transition-all duration-300 shadow-[0_4px_15px_rgba(251,146,60,0.1)]">
                          <span className="text-gray-800 font-medium">
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {activeQuiz.type === 'TRUE_FALSE' && (
                  <div className="space-y-3">
                    {['True', 'False'].map((option) => (
                      <label key={option} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          value={option}
                          checked={selectedAnswer === option}
                          onChange={(e) => setSelectedAnswer(e.target.value)}
                          disabled={hasSubmitted}
                          className="w-4 h-4 text-orange-600 border-orange-300 focus:ring-orange-500"
                        />
                        <div className="flex-1 py-3 px-4 rounded-xl bg-white/80 border border-orange-200/50 hover:bg-white/90 hover:border-orange-300 transition-all duration-300 shadow-[0_4px_15px_rgba(251,146,60,0.1)]">
                          <span className="text-gray-800 font-medium">{option}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {activeQuiz.type === 'SHORT_ANSWER' && (
                  <div className="space-y-3">
                    <input
                      value={shortAnswer}
                      onChange={(e) => setShortAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={hasSubmitted}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    />
                    <p className="text-gray-600 text-sm font-medium">
                      Press submit when you're ready
                    </p>
                  </div>
                )}
              </div>

              {/* Submission Button */}
              {!hasSubmitted ? (
                <button 
                  onClick={() => submitAnswer()}
                  disabled={isSubmitting || 
                    (activeQuiz.type !== 'SHORT_ANSWER' && !selectedAnswer) ||
                    (activeQuiz.type === 'SHORT_ANSWER' && !shortAnswer.trim())
                  }
                  className={`w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.15)] hover:shadow-[0_20px_45px_rgba(0,0,0,0.2)] transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                    isSubmitting 
                      ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' 
                      : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/30'
                  }`}
                >
                  <Send className="w-5 h-5" />
                  {getAnswerButtonText()}
                </button>
              ) : (
                <div className="text-center p-6 bg-gradient-to-br from-green-100 to-green-200 border border-green-300 rounded-2xl shadow-[0_10px_25px_rgba(34,197,94,0.2)]">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <p className="text-green-800 font-bold text-lg">Answer Submitted!</p>
                  <p className="text-green-700 text-sm font-medium">
                    Response ID: {submissionResult?.responseId?.slice(-8)}
                  </p>
                </div>
              )}

              {/* Auto-submit warning */}
              {timeRemaining <= 10 && !hasSubmitted && (
                <div className="text-center p-4 bg-gradient-to-br from-red-100 to-red-200 border border-red-300 rounded-2xl shadow-[0_10px_25px_rgba(239,68,68,0.2)]">
                  <p className="text-red-800 font-bold text-sm">
                    ⚠️ Auto-submitting in {timeRemaining} seconds...
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* No Active Quiz State */
          <div className="space-y-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40 text-center">
              <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl inline-block mb-6 shadow-lg shadow-orange-500/30">
                <MessageSquare className="w-12 h-12 text-white" />
              </div>
              <h4 className="text-gray-800 font-bold text-xl mb-3">No Active Quiz</h4>
              <p className="text-gray-600 font-medium">
                Wait for the tutor to start a quiz. You'll see the question here when it begins.
              </p>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40">
                <div className="mb-4">
                  <h4 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                      <Award className="w-5 h-5 text-white" />
                    </div>
                    Leaderboard
                  </h4>
                </div>
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
                  {leaderboard.slice(0, 10).map((student, index) => (
                    <div 
                      key={student.studentId}
                      className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                        student.studentId === userInfo?.id 
                          ? 'bg-gradient-to-r from-blue-100 to-blue-200 border border-blue-300 shadow-[0_8px_25px_rgba(59,130,246,0.2)]' 
                          : 'bg-white/80 border border-orange-200/50 shadow-[0_4px_15px_rgba(251,146,60,0.1)]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                          index === 2 ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white' :
                          'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-gray-800 font-bold">
                            {student.studentName}
                            {student.studentId === userInfo?.id && ' (You)'}
                          </p>
                          <p className="text-gray-600 text-sm font-medium">
                            {student.correctAnswers}/{student.totalAnswers} correct
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-800 font-bold text-lg">
                          {Math.round(student.accuracy)}%
                        </p>
                        <p className="text-gray-600 text-sm font-medium">
                          {Math.round(student.averageTime)}s avg
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz History */}
            {quizHistory.length > 0 && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40">
                <div className="mb-4">
                  <h4 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    Recent Quizzes
                  </h4>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
                  {quizHistory.map((quiz) => (
                    <div key={quiz.id} className="bg-white/80 p-4 rounded-xl border border-orange-200/50 shadow-[0_4px_15px_rgba(251,146,60,0.1)]">
                      <p className="text-gray-800 font-semibold truncate">
                        {quiz.question}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-xs font-medium">
                          {quiz.type}
                        </div>
                        <span className="text-gray-600 text-xs font-medium">
                          {new Date(quiz.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}