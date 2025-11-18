'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Award, 
  Clock, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  BookOpen,
  TrendingUp,
  User,
  Eye,
  Search,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Submission {
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
    durationMinutes: number;
    createdAt: string;
  };
  result?: {
    id: number;
    totalScore: number;
    percentage: number;
    passed: boolean;
    overallFeedback: string;
    gradedAt: string;
    scores: Record<string, number>;
    feedbacks: Record<string, string>;
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
}

export default function StudentResultsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'title'>('date');

  useEffect(() => {
    fetchStudentSubmissions();
  }, []);

  const fetchStudentSubmissions = async () => {
    try {
      const response = await fetch('http://localhost:4000/tests/allsubmissions', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = await response.json();
      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching student submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort submissions
  const filteredAndSortedSubmissions = submissions
    .filter(submission => {
      // Tab filtering
      if (activeTab === 'passed') return submission.result?.passed;
      if (activeTab === 'failed') return submission.result && !submission.result.passed;
      if (activeTab === 'pending') return !submission.evaluated;
      if (activeTab === 'violations') return submission.violations > 0;
      
      // Search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          submission.test.title.toLowerCase().includes(term) ||
          submission.test.description.toLowerCase().includes(term) ||
          submission.test.institutionName.toLowerCase().includes(term)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        case 'score':
          return (b.score / b.totalScore) - (a.score / a.totalScore);
        case 'title':
          return a.test.title.localeCompare(b.test.title);
        default:
          return 0;
      }
    });

  const calculatePercentage = (score: number, total: number) => {
    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const getStatusBadge = (submission: Submission) => {
    if (!submission.evaluated) {
      return <span className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(251,191,36,0.3)] flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Pending
      </span>;
    }
    
    if (submission.result?.passed) {
      return <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(34,197,94,0.3)] flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Passed
      </span>;
    } else {
      return <span className="bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(239,68,68,0.3)] flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Failed
      </span>;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleViewDetails = (submissionId: number) => {
    router.push(`/student/results/${submissionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] flex items-center justify-center">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
          <div className="w-16 h-16 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-800 font-medium">Loading your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter'] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 mb-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => router.push('/student')}
              className="bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_12px_40px_rgba(251,146,60,0.3)] hover:scale-105 transition-all duration-300 flex items-center gap-2 text-orange-700 hover:text-orange-800"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-medium">Back</span>
            </button>
          </div>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(251,146,60,0.4)]">
              <Award className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-orange-800 drop-shadow-sm">My Test Results</h1>
              <p className="text-orange-600 text-lg mt-2">
                Track your progress and review teacher feedback
              </p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.4)]">
                <FileText className="h-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Total Tests</p>
                <p className="text-2xl font-bold text-orange-800">{submissions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(34,197,94,0.4)]">
                <CheckCircle className="h-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Passed</p>
                <p className="text-2xl font-bold text-orange-800">
                  {submissions.filter(s => s.result?.passed).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(239,68,68,0.4)]">
                <XCircle className="h-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Failed</p>
                <p className="text-2xl font-bold text-orange-800">
                  {submissions.filter(s => s.result && !s.result.passed).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(147,51,234,0.4)]">
                <TrendingUp className="h-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg Score</p>
                <p className="text-2xl font-bold text-orange-800">
                  {submissions.filter(s => s.evaluated).length > 0 
                    ? Math.round(
                        submissions.filter(s => s.evaluated)
                          .reduce((acc, s) => acc + calculatePercentage(s.score, s.totalScore), 0) / 
                        submissions.filter(s => s.evaluated).length
                      )
                    : 0
                  }%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(251,191,36,0.4)]">
                <AlertTriangle className="h-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Violations</p>
                <p className="text-2xl font-bold text-orange-800">
                  {submissions.reduce((acc, s) => acc + (s.violations || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 mb-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 w-full lg:max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-500 h-4 w-4" />
              <input
                placeholder="Search tests by title, description, or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-300 text-orange-800 placeholder-orange-400"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-500" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-white/80 backdrop-blur-xl rounded-2xl px-4 py-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 focus:outline-none focus:ring-2 focus:ring-orange-400 text-orange-800"
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6">
            <div className="bg-white/60 backdrop-blur-3xl rounded-2xl p-2 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'all', label: `All (${submissions.length})` },
                  { id: 'passed', label: `Passed (${submissions.filter(s => s.result?.passed).length})` },
                  { id: 'failed', label: `Failed (${submissions.filter(s => s.result && !s.result.passed).length})` },
                  { id: 'pending', label: `Pending (${submissions.filter(s => !s.evaluated).length})` },
                  { id: 'violations', label: `Violations (${submissions.filter(s => s.violations > 0).length})` }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`py-2 px-3 rounded-xl font-medium transition-all duration-300 text-sm ${
                      activeTab === id
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-[0_4px_15px_rgba(251,146,60,0.4)] scale-105'
                        : 'text-orange-700 hover:bg-white/50 hover:scale-105'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAndSortedSubmissions.length === 0 ? (
            <div className="col-span-full bg-white/60 backdrop-blur-3xl rounded-3xl p-12 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-orange-400" />
              <h3 className="text-lg font-semibold text-orange-800 mb-2">No submissions found</h3>
              <p className="text-orange-600">
                {searchTerm ? 'Try adjusting your search terms' : 'You haven\'t taken any tests yet'}
              </p>
            </div>
          ) : (
            filteredAndSortedSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className="bg-white/60 backdrop-blur-3xl rounded-3xl shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300 overflow-hidden h-full flex flex-col"
              >
                <div className="p-6 bg-gradient-to-r from-orange-50/50 to-orange-100/50 border-b border-orange-200/30">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-3 py-1 rounded-xl text-sm font-medium shadow-[0_4px_15px_rgba(251,146,60,0.3)]">
                      {submission.test.institutionName}
                    </span>
                    {getStatusBadge(submission)}
                  </div>
                  <h3 className="text-xl font-bold text-orange-800 line-clamp-2 mb-2">
                    {submission.test.title}
                  </h3>
                  <p className="text-orange-600 line-clamp-2 text-sm">
                    {submission.test.description}
                  </p>
                </div>
                  
                <div className="p-6 flex-1 flex flex-col">
                  <div className="space-y-4 flex-1">
                    {/* Score Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-orange-600" />
                        <span className="font-semibold text-orange-800">Score</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-bold ${getScoreColor(calculatePercentage(submission.score, submission.totalScore))}`}>
                          {submission.score} / {submission.totalScore}
                        </div>
                        <div className="text-sm text-orange-600">
                          {calculatePercentage(submission.score, submission.totalScore)}%
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-orange-700">
                        <Calendar className="h-4 w-4 text-orange-500" />
                        <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-orange-700">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span>{submission.test.durationMinutes}m</span>
                      </div>
                      <div className="flex items-center gap-2 text-orange-700">
                        <BookOpen className="h-4 w-4 text-orange-500" />
                        <span>{submission.answers.length} questions</span>
                      </div>
                      {submission.violations > 0 && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span>{submission.violations} violations</span>
                        </div>
                      )}
                    </div>

                    {/* Teacher Feedback Preview */}
                    {submission.result?.overallFeedback && (
                      <div className="mt-4 p-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-orange-600" />
                          <span className="text-sm font-medium text-orange-800">Teacher's Feedback</span>
                        </div>
                        <p className="text-sm text-orange-600 line-clamp-2">
                          {submission.result.overallFeedback}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => handleViewDetails(submission.id)}
                    className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold py-3 px-4 rounded-2xl shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Detailed Results
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Info */}
        {submissions.length > 0 && (
          <div className="mt-8 text-center text-orange-600 text-sm font-medium">
            <p>Showing {filteredAndSortedSubmissions.length} of {submissions.length} submissions</p>
          </div>
        )}
      </div>
    </div>
  );
}