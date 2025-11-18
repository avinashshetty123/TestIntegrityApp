"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  MessageSquare, Clock, Users, Trophy, CheckCircle, XCircle,
  Play, Square, Plus, Trash2, List, Send
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface QuizQuestion {
  id: string;
  question: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';
  options?: string[];
  correctAnswer?: string;
  timeLimit: number;
}

interface QuizResponse {
  studentId: string;
  studentName: string;
  answer: string;
  isCorrect: boolean;
  responseTime: number;
  submittedAt: Date;
}

interface ActiveQuiz {
  id: string;
  question: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';
  options?: string[];
  timeLimit: number;
  startedAt: Date;
  responses: QuizResponse[];
  isActive: boolean;
  timeRemaining?: number;
}

interface QuizPanelProps {
  meetingId: string;
  isConnected: boolean;
  onSendQuiz: (quiz: any) => void;
  onEndQuiz: (quizId: string) => void;
  userInfo: any;
}

export default function QuizPanel({ meetingId, isConnected, onSendQuiz, onEndQuiz, userInfo }: QuizPanelProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    {
      id: '1',
      question: 'What is the capital of France?',
      type: 'MCQ',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 'Paris',
      timeLimit: 30
    }
  ]);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<QuizQuestion>>({
    question: '',
    type: 'MCQ',
    options: ['', '', '', ''],
    correctAnswer: '',
    timeLimit: 30
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  
  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Socket.IO connection for real-time quiz updates
  useEffect(() => {
    if (isConnected && userInfo?.role === 'tutor' && userInfo?.id) {
      console.log('🔌 Tutor connecting to quiz WebSocket...');
      
      const socket = io('http://localhost:4000/quiz', {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        timeout: 10000,
      });

      socketRef.current = socket;

      // Connection events
      socket.on('connect', () => {
        console.log('✅ Tutor connected to quiz WebSocket with ID:', socket.id);
        
        // Join the room immediately after connection
        socket.emit('joinRoom', {
          meetingId,
          userId: userInfo.id,
          role: 'tutor'
        });
      });

      socket.on('connected', (data) => {
        console.log('✅ Server connection confirmed:', data);
      });

      socket.on('joinedRoom', (data) => {
        console.log('✅ Tutor successfully joined quiz room:', data);
      });

      // Quiz events
      socket.on('questionSent', (data) => {
        console.log('✅ Question sent successfully:', data);
        handleQuestionSent(data);
      });

      socket.on('newAnswer', (data) => {
        console.log('📥 New answer received:', data);
        handleNewAnswer(data);
      });

      socket.on('quizEnded', (data) => {
        console.log('🛑 Quiz ended:', data);
        handleQuizEnded(data);
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

      // Cleanup on unmount
      return () => {
        console.log('🧹 Cleaning up tutor socket connection');
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isConnected, meetingId, userInfo]);

  const handleQuestionSent = (data: any) => {
    console.log('✅ Question sent confirmation:', data);
    
    const newActiveQuiz: ActiveQuiz = {
      id: data.quizId,
      question: data.question || 'Unknown question',
      type: data.type || 'MCQ',
      options: data.options,
      timeLimit: data.timeLimit || 30,
      startedAt: new Date(),
      responses: [],
      isActive: true,
      timeRemaining: data.timeLimit || 30
    };

    setActiveQuiz(newActiveQuiz);
    startTimer(newActiveQuiz);
    setShowCreateForm(false);

    toast({
      title: "Question Sent!",
      description: "The quiz question has been sent to all students",
      variant: "default",
    });
  };

  const handleNewAnswer = (data: any) => {
    console.log('📥 Handling new answer:', data);
    
    if (activeQuiz) {
      // We need to fetch the actual response data since we only get notification
      fetchQuizResponses(activeQuiz.id);
    }
  };

  const handleQuizEnded = (data: any) => {
    console.log('🛑 Quiz ended confirmation:', data);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setActiveQuiz(null);
    fetchLeaderboard();
    fetchAllQuizzes();

    toast({
      title: "Quiz Ended",
      description: "The quiz has been ended successfully",
      variant: "default",
    });
  };

  const startTimer = (quiz: ActiveQuiz) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const startTime = new Date(quiz.startedAt).getTime();
    const endTime = startTime + (quiz.timeLimit * 1000);

    timerRef.current = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));

      setActiveQuiz(prev => prev ? { ...prev, timeRemaining: remaining } : null);

      if (remaining <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        // Auto-end quiz when time is up
        if (activeQuiz) {
          endActiveQuiz();
        }
      }
    }, 1000);
  };

  const startQuiz = async (question: QuizQuestion) => {
    if (!socketRef.current?.connected) {
      toast({
        title: "Not Connected",
        description: "Please wait for connection to establish",
        variant: "destructive",
      });
      return;
    }

    console.log('📤 Sending question:', question);

    try {
      socketRef.current.emit('sendQuestion', {
        question: question.question,
        type: question.type,
        options: question.options,
        correctAnswer: question.correctAnswer,
        timeLimit: question.timeLimit
      });
    } catch (error) {
      console.error('❌ Error sending question:', error);
      toast({
        title: "Failed to Send Question",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  const endActiveQuiz = () => {
    if (activeQuiz && socketRef.current?.connected) {
      console.log('📤 Ending quiz:', activeQuiz.id);
      
      socketRef.current.emit('endQuiz', {
        quizId: activeQuiz.id
      });
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const fetchQuizResponses = async (quizId: string) => {
    try {
      const response = await fetch(`http://localhost:4000/quiz/results/${quizId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const results = await response.json();
        if (results.responses) {
          setActiveQuiz(prev => prev ? {
            ...prev,
            responses: results.responses
          } : null);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz responses:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`http://localhost:4000/quiz/${meetingId}/leaderboard`, {
        credentials: 'include'
      });
      if (response.ok) {
        const leaderboardData = await response.json();
        setLeaderboard(Array.isArray(leaderboardData) ? leaderboardData : []);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const fetchAllQuizzes = async () => {
    try {
      const response = await fetch(`http://localhost:4000/quiz/${meetingId}/quizes`, {
        credentials: 'include'
      });
      if (response.ok) {
        const quizzes = await response.json();
        setAllQuizzes(Array.isArray(quizzes) ? quizzes : []);
      }
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    }
  };

  const addQuestion = () => {
    if (newQuestion.question && newQuestion.type) {
      const question: QuizQuestion = {
        id: Date.now().toString(),
        question: newQuestion.question!,
        type: newQuestion.type!,
        options: newQuestion.options?.filter(opt => opt.trim() !== ''),
        correctAnswer: newQuestion.correctAnswer,
        timeLimit: newQuestion.timeLimit || 30
      };
      
      setQuestions(prev => [...prev, question]);
      setNewQuestion({
        question: '',
        type: 'MCQ',
        options: ['', '', '', ''],
        correctAnswer: '',
        timeLimit: 30
      });
      setShowCreateForm(false);
    }
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const getCorrectAnswersCount = () => {
    return activeQuiz?.responses.filter(r => r.isCorrect).length || 0;
  };

  const isSocketConnected = socketRef.current?.connected;

  return (
    <div className="w-80 bg-white/60 backdrop-blur-3xl border-l border-orange-200/30 flex flex-col shadow-[0_0_50px_rgba(251,146,60,0.1)] font-['Inter']">
      <div className="p-6 border-b border-orange-200/30">
        <h3 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg shadow-orange-500/30">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          Quiz Control
        </h3>
        {/* Connection Status */}
        <div className="text-center mt-4">
          <div className={`inline-flex items-center px-4 py-2 rounded-full font-semibold text-sm shadow-lg ${
            isSocketConnected 
              ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-green-500/30" 
              : "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-red-500/30"
          }`}>
            {isSocketConnected ? `Connected` : "Disconnected"}
            {socketRef.current?.id && ` (${socketRef.current.id.slice(-6)})`}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              <div>
                <h5 className="text-gray-800 font-bold mb-3 text-lg">{activeQuiz.question}</h5>
                {activeQuiz.options && (
                  <div className="space-y-2 mt-3">
                    {activeQuiz.options.map((option, index) => (
                      <div key={index} className="text-sm font-medium text-gray-700 bg-orange-50 p-3 rounded-xl border border-orange-200/50">
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Timer Display */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="bg-orange-100 p-3 rounded-xl flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className={`font-bold ${
                    activeQuiz.timeRemaining && activeQuiz.timeRemaining <= 10 
                      ? 'text-red-600' 
                      : 'text-orange-800'
                  }`}>
                    {activeQuiz.timeRemaining || activeQuiz.timeLimit}s
                  </span>
                </div>
                <div className="bg-blue-100 p-3 rounded-xl flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-blue-800">{activeQuiz.responses.length}</span>
                </div>
                <div className="bg-green-100 p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-green-800">{getCorrectAnswersCount()}</span>
                </div>
              </div>

              {/* Progress bar for timer */}
              <div className="w-full bg-orange-200 rounded-full h-3 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-1000 shadow-lg"
                  style={{ 
                    width: `${((activeQuiz.timeRemaining || activeQuiz.timeLimit) / activeQuiz.timeLimit) * 100}%` 
                  }}
                />
              </div>

              {activeQuiz.responses.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
                  <h5 className="text-gray-800 text-sm font-bold">Responses:</h5>
                  {activeQuiz.responses.map((response, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-3 bg-white/80 rounded-xl border border-orange-200/50">
                      <span className="text-gray-700 font-medium truncate">{response.studentName}</span>
                      <div className={`px-3 py-1 rounded-full font-bold text-white shadow-lg ${
                        response.isCorrect ? "bg-gradient-to-r from-green-500 to-green-600" : "bg-gradient-to-r from-red-500 to-red-600"
                      }`}>
                        {response.isCorrect ? '✓' : '✗'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button 
                onClick={endActiveQuiz}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_10px_25px_rgba(239,68,68,0.3)] hover:shadow-[0_15px_35px_rgba(239,68,68,0.4)] transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4" />
                End Quiz
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <button 
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_10px_25px_rgba(251,146,60,0.3)] hover:shadow-[0_15px_35px_rgba(251,146,60,0.4)] transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create New Question
              </button>

              <button 
                onClick={async () => {
                  await fetchAllQuizzes();
                  setShowAllQuizzes(true);
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_10px_25px_rgba(147,51,234,0.3)] hover:shadow-[0_15px_35px_rgba(147,51,234,0.4)] transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
              >
                <List className="w-4 h-4" />
                View All Quizzes
              </button>
              
              {questions.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-gray-800 text-sm font-bold">Quick Start:</h4>
                  {questions.map((question) => (
                    <div key={question.id} className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-[0_8px_25px_rgba(251,146,60,0.1)] border border-orange-200/40">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-800 text-sm font-semibold truncate">
                            {question.question}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-medium">
                              {question.type}
                            </div>
                            <span className="text-gray-600 text-xs font-medium">
                              {question.timeLimit}s
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-3">
                          <button
                            onClick={() => startQuiz(question)}
                            disabled={!isSocketConnected}
                            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-8 w-8 rounded-lg shadow-lg shadow-green-500/30 hover:shadow-green-500/40 transform hover:scale-110 transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                          >
                            <Play className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => deleteQuestion(question.id)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-8 w-8 rounded-lg shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transform hover:scale-110 transition-all duration-300 flex items-center justify-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All Quizzes Modal */}
            {showAllQuizzes && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-gray-800 font-bold text-lg">All Quizzes</h4>
                  <button
                    onClick={() => setShowAllQuizzes(false)}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-xl font-semibold text-sm shadow-lg transform hover:scale-105 transition-all duration-300"
                  >
                    Close
                  </button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
                  {allQuizzes.length > 0 ? (
                    allQuizzes.map((quiz) => (
                      <div key={quiz.id} className="bg-white/80 backdrop-blur-xl rounded-xl p-4 shadow-[0_8px_25px_rgba(251,146,60,0.1)] border border-orange-200/40">
                        <div className="space-y-3">
                          <p className="text-gray-800 text-sm font-semibold">{quiz.question}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="bg-orange-100 text-orange-800 px-2 py-1 rounded-lg text-xs font-medium">
                                {quiz.type}
                              </div>
                              <div className={`px-2 py-1 rounded-lg text-xs font-medium text-white ${
                                quiz.status === 'ACTIVE' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                quiz.status === 'COMPLETED' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'
                              }`}>
                                {quiz.status}
                              </div>
                            </div>
                            <span className="text-gray-600 text-xs font-medium">
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600 text-sm text-center py-8 font-medium">
                      No quizzes found for this meeting
                    </p>
                  )}
                </div>
              </div>
            )}

            {showCreateForm && (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-[0_15px_35px_rgba(251,146,60,0.15)] border border-orange-200/40">
                <h4 className="text-gray-800 font-bold mb-4 text-lg">Create New Question</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Question</label>
                    <input
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question..."
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Type</label>
                    <div className="flex gap-4 mt-2">
                      {['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'].map((type) => (
                        <label key={type} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            value={type}
                            checked={newQuestion.type === type}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, type: e.target.value as any }))}
                            className="w-4 h-4 text-orange-600 border-orange-300 focus:ring-orange-500"
                          />
                          <span className="text-gray-700 font-medium text-sm">
                            {type === 'TRUE_FALSE' ? 'True/False' : type === 'SHORT_ANSWER' ? 'Short Answer' : 'MCQ'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {newQuestion.type === 'MCQ' && (
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2 text-sm">Options</label>
                      <div className="space-y-3 mt-2">
                        {newQuestion.options?.map((option, index) => (
                          <input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(newQuestion.options || [])];
                              newOptions[index] = e.target.value;
                              setNewQuestion(prev => ({ ...prev, options: newOptions }));
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Correct Answer</label>
                    <input
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      placeholder="Enter correct answer..."
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-semibold mb-2 text-sm">Time Limit (seconds)</label>
                    <input
                      type="number"
                      value={newQuestion.timeLimit}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 30 }))}
                      className="w-full px-4 py-3 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-[0_8px_25px_rgba(251,146,60,0.1)] focus:shadow-[0_12px_35px_rgba(251,146,60,0.15)] focus:border-orange-300 focus:outline-none transition-all duration-300 text-gray-800 font-medium"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={addQuestion}
                      className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_10px_25px_rgba(34,197,94,0.3)] hover:shadow-[0_15px_35px_rgba(34,197,94,0.4)] transform hover:scale-[1.02] transition-all duration-300"
                    >
                      Save Question
                    </button>
                    <button 
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-4 rounded-xl shadow-[0_10px_25px_rgba(107,114,128,0.3)] hover:shadow-[0_15px_35px_rgba(107,114,128,0.4)] transform hover:scale-[1.02] transition-all duration-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}