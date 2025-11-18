'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Award, 
  Clock, 
  Calendar, 
  BookOpen,
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  User,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SubmissionResult {
  submission: {
    id: number;
    submittedAt: string;
    score: number;
    evaluated: boolean;
    totalScore: number;
    violations: number;
    test: {
      id: number;
      title: string;
      description: string;
      institutionName: string;
    };
    student: {
      id: string;
      fullName: string;
      email: string;
    };
    answers: Array<{
      id: number;
      questionId: number;
      response: string[];
      score: number;
      question: {
        id: number;
        questionText: string;
        type: string;
        marks: number;
        correctAnswers?: string[];
      };
    }>;
  };
  result: {
    id: number;
    totalScore: number;
    percentage: number;
    passed: boolean;
    overallFeedback: string;
    gradedAt: string;
    scores: Record<string, number>;
    feedbacks: Record<string, string>;
  };
}

export default function SubmissionResultPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.id;
  
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (submissionId) {
      fetchSubmissionResult();
    }
  }, [submissionId]);

  const fetchSubmissionResult = async () => {
    try {
      const response = await fetch(`http://localhost:4000/tests/submission/${submissionId}/result`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submission result');
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error fetching submission result:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
          <div className="w-16 h-16 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-800 font-medium">Loading result...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-orange-800 mb-4">Result Not Found</h2>
          <button 
            onClick={() => router.push('/student/results')}
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-6 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 drop-shadow-lg"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const { submission, result: submissionResult } = result;

  const getAnswerStatus = (answer: SubmissionResult['submission']['answers'][0]) => {
    const maxMarks = answer.question.marks;
    if (answer.score === maxMarks) return { status: 'correct', icon: CheckCircle, color: 'text-green-600' };
    if (answer.score > 0) return { status: 'partial', icon: AlertTriangle, color: 'text-yellow-600' };
    return { status: 'incorrect', icon: XCircle, color: 'text-red-600' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 mb-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/student/results')}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-[0_8px_30px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:scale-105 transition-all duration-300 hover:shadow-[0_12px_40px_rgba(251,146,60,0.4)] group flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4 text-orange-600 group-hover:text-orange-700" />
              <span className="text-orange-700 font-medium">Back to Results</span>
            </button>
            <h1 className="text-3xl font-bold text-orange-800 drop-shadow-sm">Test Result</h1>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-orange-50/50 to-orange-100/50 border-b border-orange-200/30">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-orange-800 mb-2">
                  {submission.test.title}
                </h2>
                <p className="text-orange-600">
                  {submission.test.description}
                </p>
              </div>
          
              <span className={`px-4 py-2 rounded-xl text-white font-medium shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${
                submissionResult?.passed 
                  ? "bg-gradient-to-r from-green-500 to-green-600" 
                  : "bg-gradient-to-r from-red-500 to-red-600"
              }`}>
                {submissionResult.passed ? "Passed" : "Failed"}
              </span>
            </div>
              
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_4px_15px_rgba(59,130,246,0.3)]">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold text-orange-800">{submission.score}</div>
                <div className="text-sm text-orange-600">Score</div>
              </div>
              
              <div className="text-center p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_4px_15px_rgba(34,197,94,0.3)]">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold text-orange-800">{submission.totalScore}</div>
                <div className="text-sm text-orange-600">Total</div>
              </div>
              
              <div className="text-center p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_4px_15px_rgba(147,51,234,0.3)]">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold text-orange-800">{submissionResult.percentage}%</div>
                <div className="text-sm text-orange-600">Percentage</div>
              </div>
              
              <div className="text-center p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-[0_4px_15px_rgba(251,146,60,0.3)]">
                  <Calendar className="h-5 w-5 text-white" />
                </div>
                <div className="font-bold text-orange-800">
                  {new Date(submission.submittedAt).toLocaleDateString()}
                </div>
                <div className="text-sm text-orange-600">Submitted</div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Overall Feedback */}
            <div className="mb-6 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-orange-800">
                <User className="h-5 w-5 text-orange-600" />
                Teacher's Overall Feedback
              </h3>
              <p className="text-orange-700">
                {submissionResult.overallFeedback || "No overall feedback provided."}
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm text-orange-600">
                <span>Graded on: {new Date(submissionResult.gradedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Violations Alert */}
            {submission.violations > 0 && (
              <div className="mb-6 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(239,68,68,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-red-200/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h3 className="font-semibold text-red-800">Test Integrity Notice</h3>
                </div>
                <p className="text-red-700">
                  This test recorded <strong>{submission.violations} violation(s)</strong> during the assessment.
                </p>
              </div>
            )}

            {/* Questions and Answers */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2 text-orange-800">
                <BookOpen className="h-5 w-5 text-orange-600" />
                Question Details
              </h3>
                
              {submission.answers.map((answer, index) => {
                const { status, icon: StatusIcon, color } = getAnswerStatus(answer);
                const teacherFeedback = submissionResult.feedbacks?.[answer.question.id];
                
                return (
                  <div
                    key={answer.id}
                    className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <StatusIcon className={`h-5 w-5 mt-1 flex-shrink-0 ${color}`} />
                        <div className="flex-1">
                          <h4 className="font-semibold text-orange-800">
                            Question {index + 1}
                          </h4>
                          <p className="text-orange-700 mt-1 whitespace-pre-wrap">
                            {answer.question.questionText}
                          </p>
                        </div>
                      </div>
                      <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(251,146,60,0.3)]">
                        {answer.score} / {answer.question.marks}
                      </span>
                    </div>

                    {/* Student's Answer */}
                    <div className="mb-3">
                      <p className="text-sm font-medium text-orange-600 mb-1">Your Answer:</p>
                      <div className="p-3 bg-white/60 backdrop-blur-xl rounded-xl shadow-[0_4px_15px_rgba(251,146,60,0.1)] border border-orange-200/30">
                        {answer.response && answer.response.length > 0 && answer.response[0] !== 'Not Provided' ? (
                          <p className="text-orange-800 whitespace-pre-wrap">
                            {Array.isArray(answer.response) ? answer.response.join(', ') : answer.response}
                          </p>
                        ) : (
                          <p className="text-orange-500 italic">No answer provided</p>
                        )}
                      </div>
                    </div>

                    {/* Correct Answer (if available) */}
                    {answer.question.correctAnswers && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-green-700 mb-1">Correct Answer:</p>
                        <div className="p-3 bg-white/60 backdrop-blur-xl rounded-xl shadow-[0_4px_15px_rgba(34,197,94,0.1)] border border-green-200/30 text-green-800">
                          {answer.question.correctAnswers.join(', ')}
                        </div>
                      </div>
                    )}

                    {/* Teacher Feedback */}
                    {teacherFeedback && (
                      <div>
                        <p className="text-sm font-medium text-blue-700 mb-1 flex items-center gap-1">
                          <User className="h-4 w-4" />
                          Teacher's Feedback:
                        </p>
                        <div className="p-3 bg-white/60 backdrop-blur-xl rounded-xl shadow-[0_4px_15px_rgba(59,130,246,0.1)] border border-blue-200/30 text-blue-800">
                          {teacherFeedback}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}