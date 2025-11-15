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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading result...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Result Not Found</h2>
          <Button onClick={() => router.push('/student/results')}>Back to Results</Button>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => router.push('/student/results')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Button>
          <h1 className="text-3xl font-bold text-gray-800">Test Result</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl mb-2">
                    {submission.test.title}
                  </CardTitle>
                  <p className="text-gray-600">
                    {submission.test.description}
                  </p>
                </div>
            
                <Badge 
                  variant={submissionResult?.passed ? "default" : "destructive"}
                  className={submissionResult?.passed 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                  }
                >
                  {submissionResult.passed ? "Passed" : "Failed"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <Award className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <div className="font-bold text-gray-800">{submission.score}</div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <div className="font-bold text-gray-800">{submission.totalScore}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg">
                  <Award className="h-6 w-6 text-purple-600 mx-auto mb-1" />
                  <div className="font-bold text-gray-800">{submissionResult.percentage}%</div>
                  <div className="text-sm text-gray-600">Percentage</div>
                </div>
                
                <div className="text-center p-3 bg-white rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600 mx-auto mb-1" />
                  <div className="font-bold text-gray-800">
                    {new Date(submission.submittedAt).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-600">Submitted</div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Overall Feedback */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Teacher's Overall Feedback
                </h3>
                <p className="text-gray-700">
                  {submissionResult.overallFeedback || "No overall feedback provided."}
                </p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                  <span>Graded on: {new Date(submissionResult.gradedAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Violations Alert */}
              {submission.violations > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
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
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Question Details
                </h3>
                
                {submission.answers.map((answer, index) => {
                  const { status, icon: StatusIcon, color } = getAnswerStatus(answer);
                  const teacherFeedback = submissionResult.feedbacks?.[answer.question.id];
                  
                  return (
                    <motion.div
                      key={answer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-start gap-3 flex-1">
                          <StatusIcon className={`h-5 w-5 mt-1 flex-shrink-0 ${color}`} />
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-800">
                              Question {index + 1}
                            </h4>
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                              {answer.question.questionText}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          {answer.score} / {answer.question.marks}
                        </Badge>
                      </div>

                      {/* Student's Answer */}
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-600 mb-1">Your Answer:</p>
                        <div className="p-3 bg-gray-50 rounded border">
                          {answer.response && answer.response.length > 0 && answer.response[0] !== 'Not Provided' ? (
                            <p className="text-gray-800 whitespace-pre-wrap">
                              {Array.isArray(answer.response) ? answer.response.join(', ') : answer.response}
                            </p>
                          ) : (
                            <p className="text-gray-500 italic">No answer provided</p>
                          )}
                        </div>
                      </div>

                      {/* Correct Answer (if available) */}
                      {answer.question.correctAnswers && (
                        <div className="mb-3">
                          <p className="text-sm font-medium text-green-700 mb-1">Correct Answer:</p>
                          <div className="p-3 bg-green-50 rounded border text-green-800">
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
                          <div className="p-3 bg-blue-50 rounded border text-blue-800">
                            {teacherFeedback}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}