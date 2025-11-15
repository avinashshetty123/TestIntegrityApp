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
  Filter
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
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>;
    }
    
    if (submission.result?.passed) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="w-3 h-3 mr-1" />
        Passed
      </Badge>;
    } else {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </Badge>;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading your results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Award className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-800">My Test Results</h1>
              <p className="text-gray-600 text-lg mt-2">
                Track your progress and review teacher feedback
              </p>
            </div>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold text-gray-800">{submissions.length}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {submissions.filter(s => s.result?.passed).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {submissions.filter(s => s.result && !s.result.passed).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-purple-600">
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
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Violations</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {submissions.reduce((acc, s) => acc + (s.violations || 0), 0)}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <Card className="border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="relative flex-1 w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search tests by title, description, or institution..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 border-blue-200"
                  />
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="border border-blue-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="date">Sort by Date</option>
                    <option value="score">Sort by Score</option>
                    <option value="title">Sort by Title</option>
                  </select>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="all">
                      All ({submissions.length})
                    </TabsTrigger>
                    <TabsTrigger value="passed">
                      Passed ({submissions.filter(s => s.result?.passed).length})
                    </TabsTrigger>
                    <TabsTrigger value="failed">
                      Failed ({submissions.filter(s => s.result && !s.result.passed).length})
                    </TabsTrigger>
                    <TabsTrigger value="pending">
                      Pending ({submissions.filter(s => !s.evaluated).length})
                    </TabsTrigger>
                    <TabsTrigger value="violations">
                      Violations ({submissions.filter(s => s.violations > 0).length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {filteredAndSortedSubmissions.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No submissions found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'Try adjusting your search terms' : 'You haven\'t taken any tests yet'}
              </p>
            </div>
          ) : (
            filteredAndSortedSubmissions.map((submission, index) => (
              <motion.div
                key={submission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
              >
                <Card className="h-full border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {submission.test.institutionName}
                      </Badge>
                      {getStatusBadge(submission)}
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800 line-clamp-2">
                      {submission.test.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 line-clamp-2 mt-2">
                      {submission.test.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Score Section */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold">Score</span>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${getScoreColor(calculatePercentage(submission.score, submission.totalScore))}`}>
                            {submission.score} / {submission.totalScore}
                          </div>
                          <div className="text-sm text-gray-600">
                            {calculatePercentage(submission.score, submission.totalScore)}%
                          </div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{submission.test.durationMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen className="h-4 w-4" />
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
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center gap-2 mb-1">
                            <User className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-700">Teacher's Feedback</span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {submission.result.overallFeedback}
                          </p>
                        </div>
                      )}

                      {/* Action Button */}
                      <Button 
                        onClick={() => handleViewDetails(submission.id)}
                        className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                        size="lg"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Detailed Results
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>

        {/* Footer Info */}
        {submissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-8 text-center text-gray-500 text-sm"
          >
            <p>Showing {filteredAndSortedSubmissions.length} of {submissions.length} submissions</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}