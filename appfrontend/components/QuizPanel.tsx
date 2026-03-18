"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  MessageSquare, Clock, Users, Trophy, CheckCircle,
  Play, Square, Plus, Trash2, List
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
  submittedAt: string;
}

interface ActiveQuiz {
  id: string;
  question: string;
  type: 'MCQ' | 'SHORT_ANSWER' | 'TRUE_FALSE';
  options?: string[];
  timeLimit: number;
  startedAt: Date;
  responses: QuizResponse[];
  timeRemaining: number;
}

interface QuizPanelProps {
  meetingId: string;
  isConnected: boolean;
  onSendQuiz?: (quiz: any) => void;
  onEndQuiz?: (quizId: string) => void;
  userInfo: any;
}

export default function QuizPanel({ meetingId, isConnected, userInfo }: QuizPanelProps) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([
    { id: '1', question: 'What is the capital of France?', type: 'MCQ', options: ['London', 'Berlin', 'Paris', 'Madrid'], correctAnswer: 'Paris', timeLimit: 30 }
  ]);
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuiz | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<QuizQuestion>>({ question: '', type: 'MCQ', options: ['', '', '', ''], correctAnswer: '', timeLimit: 30 });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<any[]>([]);
  const [showAllQuizzes, setShowAllQuizzes] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeQuizRef = useRef<ActiveQuiz | null>(null);
  const { toast } = useToast();

  // Keep ref in sync for use inside timer callbacks
  useEffect(() => { activeQuizRef.current = activeQuiz; }, [activeQuiz]);

  const fetchResponses = useCallback(async (quizId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/quiz/responses/${quizId}`, { credentials: 'include' });
      if (res.ok) {
        const data: QuizResponse[] = await res.json();
        setActiveQuiz(prev => prev ? { ...prev, responses: data } : null);
      }
    } catch {}
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:4000/quiz/${meetingId}/leaderboard`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, [meetingId]);

  const fetchAllQuizzes = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:4000/quiz/${meetingId}/quizes`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAllQuizzes(Array.isArray(data) ? data : []);
      }
    } catch {}
  }, [meetingId]);

  const startTimer = useCallback((quiz: ActiveQuiz) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const endTime = new Date(quiz.startedAt).getTime() + quiz.timeLimit * 1000;

    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setActiveQuiz(prev => prev ? { ...prev, timeRemaining: remaining } : null);
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current);
      }
    }, 1000);
  }, []);

  useEffect(() => {
    if (!isConnected || !userInfo?.id) return;

    const socket = io('http://localhost:4000/quiz', {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('joinRoom', { meetingId, userId: userInfo.id, role: 'tutor' });
    });

    socket.on('disconnect', () => setSocketConnected(false));
    socket.on('connect_error', () => setSocketConnected(false));

    // questionSent now includes full quiz data
    socket.on('questionSent', (data: any) => {
      const quiz: ActiveQuiz = {
        id: data.quizId,
        question: data.question,
        type: data.type,
        options: data.options,
        timeLimit: data.timeLimit,
        startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
        responses: [],
        timeRemaining: data.timeLimit,
      };
      setActiveQuiz(quiz);
      startTimer(quiz);
      setShowCreateForm(false);
      toast({ title: "Question Sent!", description: "Quiz sent to all students" });
    });

    socket.on('newAnswer', (data: any) => {
      // Fetch full responses from backend
      if (activeQuizRef.current) {
        fetchResponses(activeQuizRef.current.id);
      }
    });

    socket.on('quizEnded', () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setActiveQuiz(null);
      fetchLeaderboard();
      fetchAllQuizzes();
      toast({ title: "Quiz Ended" });
    });

    socket.on('error', (err: any) => {
      toast({ title: "Quiz Error", description: err.message, variant: "destructive" });
    });

    // Load leaderboard on mount
    fetchLeaderboard();

    return () => {
      socket.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isConnected, meetingId, userInfo?.id]);

  const startQuiz = (question: QuizQuestion) => {
    if (!socketRef.current?.connected) {
      toast({ title: "Not Connected", variant: "destructive" });
      return;
    }
    socketRef.current.emit('sendQuestion', {
      question: question.question,
      type: question.type,
      options: question.options,
      correctAnswer: question.correctAnswer,
      timeLimit: question.timeLimit,
    });
  };

  const endActiveQuiz = () => {
    if (!activeQuiz || !socketRef.current?.connected) return;
    socketRef.current.emit('endQuiz', { quizId: activeQuiz.id });
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const addQuestion = () => {
    if (!newQuestion.question?.trim()) return;
    const q: QuizQuestion = {
      id: Date.now().toString(),
      question: newQuestion.question!,
      type: newQuestion.type!,
      options: newQuestion.options?.filter(o => o.trim()),
      correctAnswer: newQuestion.correctAnswer,
      timeLimit: newQuestion.timeLimit || 30,
    };
    setQuestions(prev => [...prev, q]);
    setNewQuestion({ question: '', type: 'MCQ', options: ['', '', '', ''], correctAnswer: '', timeLimit: 30 });
    setShowCreateForm(false);
  };

  const correctCount = activeQuiz?.responses.filter(r => r.isCorrect).length ?? 0;
  const topScorer = leaderboard[0];

  return (
    <div className="w-80 bg-white/60 backdrop-blur-3xl border-l border-orange-200/30 flex flex-col font-['Inter']">
      <div className="p-4 border-b border-orange-200/30">
        <h3 className="text-lg font-bold text-orange-800 flex items-center gap-2">
          <MessageSquare className="w-5 h-5" /> Quiz Control
        </h3>
        <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${socketConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {socketConnected ? '● Connected' : '● Disconnected'}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Top Scorer */}
        {topScorer && !activeQuiz && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-800">Top Scorer</span>
            </div>
            <p className="text-yellow-900 font-semibold">{topScorer.studentName}</p>
            <p className="text-yellow-700 text-xs">{topScorer.correctAnswers}/{topScorer.totalAnswers} correct · {Math.round(topScorer.accuracy)}% accuracy</p>
          </div>
        )}

        {activeQuiz ? (
          <div className="bg-white/80 rounded-2xl p-4 border border-orange-200/40 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-gray-800">Active Quiz</h4>
              <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">Live</span>
            </div>

            <p className="text-gray-700 text-sm font-medium">{activeQuiz.question}</p>

            {activeQuiz.options && (
              <div className="space-y-1">
                {activeQuiz.options.map((opt, i) => (
                  <div key={i} className="text-xs text-gray-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100">
                    {String.fromCharCode(65 + i)}. {opt}
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-orange-100 rounded-lg p-2 text-center">
                <Clock className="w-3 h-3 text-orange-600 mx-auto mb-0.5" />
                <span className={`font-bold ${activeQuiz.timeRemaining <= 10 ? 'text-red-600' : 'text-orange-800'}`}>
                  {activeQuiz.timeRemaining}s
                </span>
              </div>
              <div className="bg-blue-100 rounded-lg p-2 text-center">
                <Users className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
                <span className="font-bold text-blue-800">{activeQuiz.responses.length}</span>
              </div>
              <div className="bg-green-100 rounded-lg p-2 text-center">
                <CheckCircle className="w-3 h-3 text-green-600 mx-auto mb-0.5" />
                <span className="font-bold text-green-800">{correctCount}</span>
              </div>
            </div>

            {/* Timer bar */}
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${(activeQuiz.timeRemaining / activeQuiz.timeLimit) * 100}%` }}
              />
            </div>

            {/* Responses list */}
            {activeQuiz.responses.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1">
                <p className="text-xs font-bold text-gray-700">Responses ({activeQuiz.responses.length}):</p>
                {activeQuiz.responses.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white/80 rounded-lg px-3 py-1.5 border border-orange-100">
                    <span className="text-gray-700 font-medium truncate flex-1">{r.studentName}</span>
                    <span className="text-gray-500 mx-2">{r.answer}</span>
                    <span className={`font-bold ${r.isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                      {r.isCorrect ? '✓' : '✗'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={endActiveQuiz}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Square className="w-4 h-4" /> End Quiz
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Question
            </button>

            <button
              onClick={async () => { await fetchAllQuizzes(); setShowAllQuizzes(v => !v); }}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <List className="w-4 h-4" /> {showAllQuizzes ? 'Hide' : 'View'} All Quizzes
            </button>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="bg-white/80 rounded-xl p-3 border border-orange-200/40">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1 mb-2">
                  <Trophy className="w-4 h-4 text-yellow-500" /> Leaderboard
                </h4>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {leaderboard.slice(0, 10).map((s, i) => (
                    <div key={s.studentId} className="flex items-center justify-between text-xs bg-orange-50 rounded-lg px-2 py-1.5">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2 ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-500'}`}>{i + 1}</span>
                      <span className="flex-1 text-gray-800 font-medium truncate">{s.studentName}</span>
                      <span className="text-gray-600 ml-2">{s.correctAnswers}/{s.totalAnswers}</span>
                      <span className="text-orange-700 font-bold ml-2">{Math.round(s.accuracy)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved questions */}
            {questions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">Quick Start:</p>
                {questions.map(q => (
                  <div key={q.id} className="bg-white/80 rounded-xl p-3 border border-orange-200/40 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{q.question}</p>
                      <span className="text-xs text-orange-600">{q.type} · {q.timeLimit}s</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startQuiz(q)}
                        disabled={!socketConnected}
                        className="bg-green-500 hover:bg-green-600 text-white w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-50 transition-all"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setQuestions(prev => prev.filter(x => x.id !== q.id))}
                        className="bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* All quizzes */}
            {showAllQuizzes && allQuizzes.length > 0 && (
              <div className="bg-white/80 rounded-xl p-3 border border-orange-200/40">
                <p className="text-sm font-bold text-gray-800 mb-2">All Quizzes</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {allQuizzes.map(quiz => (
                    <div key={quiz.id} className="text-xs bg-orange-50 rounded-lg p-2 border border-orange-100">
                      <p className="text-gray-800 font-medium truncate">{quiz.question}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-orange-600">{quiz.type}</span>
                        <span className={`px-1.5 py-0.5 rounded text-white ${quiz.status === 'ACTIVE' ? 'bg-green-500' : quiz.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-gray-400'}`}>
                          {quiz.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create form */}
            {showCreateForm && (
              <div className="bg-white/80 rounded-2xl p-4 border border-orange-200/40 space-y-3">
                <h4 className="font-bold text-gray-800">New Question</h4>

                <input
                  value={newQuestion.question}
                  onChange={e => setNewQuestion(p => ({ ...p, question: e.target.value }))}
                  placeholder="Question text..."
                  className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />

                <div className="flex gap-3">
                  {(['MCQ', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map(t => (
                    <label key={t} className="flex items-center gap-1 cursor-pointer text-xs">
                      <input type="radio" value={t} checked={newQuestion.type === t} onChange={() => setNewQuestion(p => ({ ...p, type: t }))} />
                      {t === 'TRUE_FALSE' ? 'T/F' : t === 'SHORT_ANSWER' ? 'Short' : 'MCQ'}
                    </label>
                  ))}
                </div>

                {newQuestion.type === 'MCQ' && (
                  <div className="space-y-2">
                    {newQuestion.options?.map((opt, i) => (
                      <input
                        key={i}
                        value={opt}
                        onChange={e => {
                          const opts = [...(newQuestion.options || [])];
                          opts[i] = e.target.value;
                          setNewQuestion(p => ({ ...p, options: opts }));
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                      />
                    ))}
                  </div>
                )}

                <input
                  value={newQuestion.correctAnswer}
                  onChange={e => setNewQuestion(p => ({ ...p, correctAnswer: e.target.value }))}
                  placeholder="Correct answer"
                  className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />

                <input
                  type="number"
                  value={newQuestion.timeLimit}
                  onChange={e => setNewQuestion(p => ({ ...p, timeLimit: parseInt(e.target.value) || 30 }))}
                  placeholder="Time limit (seconds)"
                  className="w-full px-3 py-2 border border-orange-200 rounded-xl text-sm focus:outline-none focus:border-orange-400"
                />

                <div className="flex gap-2">
                  <button onClick={addQuestion} className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl text-sm transition-all">Save</button>
                  <button onClick={() => setShowCreateForm(false)} className="flex-1 bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 rounded-xl text-sm transition-all">Cancel</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
