"use client";

import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
    <div className="w-80 bg-black/70 backdrop-blur-sm border-l border-white/20 flex flex-col">
      <div className="p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5" />
          Quiz Control
        </h3>
        {/* Connection Status */}
        <div className="text-center mt-2">
          <Badge 
            variant={isSocketConnected ? "default" : "destructive"} 
            className={isSocketConnected ? "bg-green-500" : "bg-red-500"}
          >
            {isSocketConnected ? `Connected` : "Disconnected"}
            {socketRef.current?.id && ` (${socketRef.current.id.slice(-6)})`}
          </Badge>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeQuiz ? (
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                <span>Active Quiz</span>
                <Badge variant="secondary" className="bg-green-500">
                  Live
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-white font-medium mb-2">{activeQuiz.question}</h4>
                {activeQuiz.options && (
                  <div className="space-y-2 mt-2">
                    {activeQuiz.options.map((option, index) => (
                      <div key={index} className="text-sm text-gray-300 bg-white/5 p-2 rounded">
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Timer Display */}
              <div className="flex items-center justify-between text-sm text-gray-300">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className={`font-bold ${
                    activeQuiz.timeRemaining && activeQuiz.timeRemaining <= 10 
                      ? 'text-red-400' 
                      : 'text-white'
                  }`}>
                    {activeQuiz.timeRemaining || activeQuiz.timeLimit}s
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {activeQuiz.responses.length} responses
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  {getCorrectAnswersCount()} correct
                </div>
              </div>

              {/* Progress bar for timer */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${((activeQuiz.timeRemaining || activeQuiz.timeLimit) / activeQuiz.timeLimit) * 100}%` 
                  }}
                />
              </div>

              {activeQuiz.responses.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-2">
                  <h5 className="text-white text-sm font-medium">Responses:</h5>
                  {activeQuiz.responses.map((response, index) => (
                    <div key={index} className="flex items-center justify-between text-xs p-2 bg-white/5 rounded">
                      <span className="text-gray-300 truncate">{response.studentName}</span>
                      <Badge className={response.isCorrect ? "bg-green-500" : "bg-red-500"}>
                        {response.isCorrect ? '✓' : '✗'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                onClick={endActiveQuiz}
                className="w-full bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-4 h-4 mr-2" />
                End Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              <Button 
                onClick={() => setShowCreateForm(true)}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Question
              </Button>

              <Button 
                onClick={async () => {
                  await fetchAllQuizzes();
                  setShowAllQuizzes(true);
                }}
                className="w-full bg-purple-500 hover:bg-purple-600 text-white"
              >
                <List className="w-4 h-4 mr-2" />
                View All Quizzes
              </Button>
              
              {questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-white text-sm font-medium">Quick Start:</h4>
                  {questions.map((question) => (
                    <Card key={question.id} className="bg-white/5 border-white/20 p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium truncate">
                            {question.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {question.type}
                            </Badge>
                            <span className="text-gray-400 text-xs">
                              {question.timeLimit}s
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <Button
                            size="sm"
                            onClick={() => startQuiz(question)}
                            disabled={!isSocketConnected}
                            className="bg-green-500 hover:bg-green-600 text-white h-8 w-8 p-0"
                          >
                            <Play className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                            className="bg-red-500 hover:bg-red-600 text-white h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* All Quizzes Modal */}
            {showAllQuizzes && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-medium">All Quizzes</h4>
                  <Button
                    onClick={() => setShowAllQuizzes(false)}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white"
                  >
                    Close
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allQuizzes.length > 0 ? (
                    allQuizzes.map((quiz) => (
                      <Card key={quiz.id} className="bg-white/5 border-white/20 p-3">
                        <div className="space-y-2">
                          <p className="text-white text-sm font-medium">{quiz.question}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {quiz.type}
                              </Badge>
                              <Badge className={
                                quiz.status === 'ACTIVE' ? 'bg-green-500' :
                                quiz.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-gray-500'
                              }>
                                {quiz.status}
                              </Badge>
                            </div>
                            <span className="text-gray-400 text-xs">
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </Card>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No quizzes found for this meeting
                    </p>
                  )}
                </div>
              </Card>
            )}

            {showCreateForm && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20 p-4">
                <h4 className="text-white font-medium mb-3">Create New Question</h4>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-white text-sm">Question</Label>
                    <Input
                      value={newQuestion.question}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter your question..."
                      className="bg-white/5 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white text-sm">Type</Label>
                    <RadioGroup 
                      value={newQuestion.type} 
                      onValueChange={(value: any) => setNewQuestion(prev => ({ ...prev, type: value }))}
                      className="flex gap-4 mt-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="MCQ" id="mcq" />
                        <Label htmlFor="mcq" className="text-white text-sm">MCQ</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="TRUE_FALSE" id="tf" />
                        <Label htmlFor="tf" className="text-white text-sm">True/False</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="SHORT_ANSWER" id="sa" />
                        <Label htmlFor="sa" className="text-white text-sm">Short Answer</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {newQuestion.type === 'MCQ' && (
                    <div>
                      <Label className="text-white text-sm">Options</Label>
                      <div className="space-y-2 mt-1">
                        {newQuestion.options?.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(newQuestion.options || [])];
                              newOptions[index] = e.target.value;
                              setNewQuestion(prev => ({ ...prev, options: newOptions }));
                            }}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            className="bg-white/5 border-white/20 text-white"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label className="text-white text-sm">Correct Answer</Label>
                    <Input
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                      placeholder="Enter correct answer..."
                      className="bg-white/5 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-white text-sm">Time Limit (seconds)</Label>
                    <Input
                      type="number"
                      value={newQuestion.timeLimit}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 30 }))}
                      className="bg-white/5 border-white/20 text-white mt-1"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={addQuestion}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    >
                      Save Question
                    </Button>
                    <Button 
                      onClick={() => setShowCreateForm(false)}
                      variant="outline"
                      className="flex-1 bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}