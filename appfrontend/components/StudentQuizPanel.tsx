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
    <div className="w-80 bg-black/70 backdrop-blur-sm border-l border-white/20 flex flex-col">
      <div className="p-4 border-b border-white/20">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
          <MessageSquare className="w-5 h-5" />
          Student Quiz
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Connection Status */}
        <div className="text-center">
          <Badge 
            variant={isthere ? "default" : "destructive"} 
            className={isthere ? "bg-green-500" : "bg-red-500"}
          >
            {isthere ? `Connected to Quiz` : "Disconnected"}
            {socketRef.current?.id && ` (${socketRef.current.id.slice(-6)})`}
          </Badge>
        </div>

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
              {/* Timer Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-gray-300" />
                  <span className={`text-sm font-bold ${getTimerColor()}`}>
                    {timeRemaining}s
                  </span>
                </div>
                <Badge variant="outline" className="text-white border-white/30">
                  {activeQuiz.type}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="h-2 rounded-full transition-all duration-1000"
                  style={{ 
                    width: `${getProgressPercentage()}%`,
                    backgroundColor: timeRemaining <= 10 ? '#ef4444' : 
                                   timeRemaining <= 30 ? '#f97316' : '#10b981'
                  }}
                />
              </div>

              {/* Question */}
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="text-white font-medium text-sm mb-3">
                  {activeQuiz.question}
                </h4>

                {/* Answer Input Based on Question Type */}
                {activeQuiz.type === 'MCQ' && activeQuiz.options && (
                  <RadioGroup 
                    value={selectedAnswer} 
                    onValueChange={setSelectedAnswer}
                    className="space-y-2"
                  >
                    {activeQuiz.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={option} 
                          id={`option-${index}`}
                          disabled={hasSubmitted}
                          className="text-blue-500 border-white/30"
                        />
                        <Label 
                          htmlFor={`option-${index}`}
                          className="text-white text-sm flex-1 cursor-pointer py-2 px-3 rounded bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          {String.fromCharCode(65 + index)}. {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}

                {activeQuiz.type === 'TRUE_FALSE' && (
                  <RadioGroup 
                    value={selectedAnswer} 
                    onValueChange={setSelectedAnswer}
                    className="space-y-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="True" id="true" disabled={hasSubmitted} />
                      <Label htmlFor="true" className="text-white text-sm cursor-pointer py-2 px-3 rounded bg-white/5 hover:bg-white/10 transition-colors flex-1">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="False" id="false" disabled={hasSubmitted} />
                      <Label htmlFor="false" className="text-white text-sm cursor-pointer py-2 px-3 rounded bg-white/5 hover:bg-white/10 transition-colors flex-1">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                )}

                {activeQuiz.type === 'SHORT_ANSWER' && (
                  <div className="space-y-2">
                    <Input
                      value={shortAnswer}
                      onChange={(e) => setShortAnswer(e.target.value)}
                      placeholder="Type your answer here..."
                      disabled={hasSubmitted}
                      className="bg-white/5 border-white/20 text-white placeholder-gray-400"
                    />
                    <p className="text-gray-400 text-xs">
                      Press submit when you're ready
                    </p>
                  </div>
                )}
              </div>

              {/* Submission Button */}
              {!hasSubmitted ? (
                <Button 
                  onClick={() => submitAnswer()}
                  disabled={isSubmitting || 
                    (activeQuiz.type !== 'SHORT_ANSWER' && !selectedAnswer) ||
                    (activeQuiz.type === 'SHORT_ANSWER' && !shortAnswer.trim())
                  }
                  className={`w-full ${
                    isSubmitting ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {getAnswerButtonText()}
                </Button>
              ) : (
                <div className="text-center p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 text-sm font-medium">Answer Submitted!</p>
                  <p className="text-green-300 text-xs">
                    Response ID: {submissionResult?.responseId?.slice(-8)}
                  </p>
                </div>
              )}

              {/* Auto-submit warning */}
              {timeRemaining <= 10 && !hasSubmitted && (
                <div className="text-center p-2 bg-red-500/20 border border-red-500/30 rounded">
                  <p className="text-red-400 text-xs">
                    ⚠️ Auto-submitting in {timeRemaining} seconds...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          /* No Active Quiz State */
          <div className="space-y-4">
            <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
              <CardContent className="p-6 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-white font-medium mb-2">No Active Quiz</h4>
                <p className="text-gray-400 text-sm">
                  Wait for the tutor to start a quiz. You'll see the question here when it begins.
                </p>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Award className="w-5 h-5" />
                    Leaderboard
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                  {leaderboard.slice(0, 10).map((student, index) => (
                    <div 
                      key={student.studentId}
                      className={`flex items-center justify-between p-2 rounded ${
                        student.studentId === userInfo?.id 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-yellow-500 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-gray-600 text-white'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {student.studentName}
                            {student.studentId === userInfo?.id && ' (You)'}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {student.correctAnswers}/{student.totalAnswers} correct
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-bold">
                          {Math.round(student.accuracy)}%
                        </p>
                        <p className="text-gray-400 text-xs">
                          {Math.round(student.averageTime)}s avg
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quiz History */}
            {quizHistory.length > 0 && (
              <Card className="bg-white/10 backdrop-blur-sm border border-white/20">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Recent Quizzes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                  {quizHistory.map((quiz) => (
                    <div key={quiz.id} className="bg-white/5 p-3 rounded">
                      <p className="text-white text-sm font-medium truncate">
                        {quiz.question}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <Badge variant="outline" className="text-xs text-gray-300">
                          {quiz.type}
                        </Badge>
                        <span className="text-gray-400 text-xs">
                          {new Date(quiz.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}