'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, Users, BookOpen, Award, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Test {
  id: number;
  title: string;
  description: string;
  institutionName: string;
  durationMinutes: number;
  questions: any[];
  totalScore: number;
  ispublished: boolean;
  createdAt: string;
  scheduledAt?: string;
}

export default function StudentTestsPage() {
  const [tests, setTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'upcoming'>('all');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setError('');
      const response = await fetch('http://localhost:4000/tests', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }

      const data = await response.json();
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = tests
    .filter(test =>
      test.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      test.institutionName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(test => {
      if (filter === 'available') return test.ispublished;
      if (filter === 'upcoming') {
        return test.scheduledAt && new Date(test.scheduledAt) > new Date();
      }
      return true;
    });

  const getTestStatus = (test: Test) => {
    if (!test.ispublished) return { label: 'Not Available', variant: 'secondary' as const };
    if (test.scheduledAt && new Date(test.scheduledAt) > new Date()) {
      return { label: 'Upcoming', variant: 'default' as const };
    }
    return { label: 'Available', variant: 'default' as const };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-green-600 font-medium">Loading available tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md border-b border-green-200 shadow-sm"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 rounded-lg">
                <Award className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Student Portal
                </h1>
                <p className="text-sm text-gray-600">Browse and take tests</p>
              </div>
            </motion.div>
            <Button variant="outline" className="rounded-full border-green-200 hover:bg-green-50">
              My Profile
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center"
          >
            <div className="flex-1">{error}</div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchTests}
              className="border-red-200 text-red-700 hover:bg-red-100"
            >
              Retry
            </Button>
          </motion.div>
        )}

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-2xl w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tests by title, description, or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-full border-green-200 focus:border-green-400 focus:ring-green-400"
              />
            </div>
            
            <div className="flex gap-2 w-full lg:w-auto">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                onClick={() => setFilter('all')}
                className="rounded-full"
              >
                All Tests
              </Button>
              <Button
                variant={filter === 'available' ? 'default' : 'outline'}
                onClick={() => setFilter('available')}
                className="rounded-full"
              >
                Available
              </Button>
              <Button
                variant={filter === 'upcoming' ? 'default' : 'outline'}
                onClick={() => setFilter('upcoming')}
                className="rounded-full"
              >
                Upcoming
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
        >
          <Card className="bg-white/60 backdrop-blur-sm border-green-200">
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-green-100 p-3 rounded-full">
                <BookOpen className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{filteredTests.length}</p>
                <p className="text-sm text-gray-600">Tests Available</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/60 backdrop-blur-sm border-blue-200">
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredTests.reduce((acc, test) => acc + (test.durationMinutes || 0), 0)}
                </p>
                <p className="text-sm text-gray-600">Total Minutes</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/60 backdrop-blur-sm border-purple-200">
            <CardContent className="p-4 flex items-center space-x-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {[...new Set(filteredTests.map(test => test.institutionName))].length}
                </p>
                <p className="text-sm text-gray-600">Institutions</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tests Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredTests.map((test, index) => {
            const status = getTestStatus(test);
            const isAvailable = test.ispublished && (!test.scheduledAt || new Date(test.scheduledAt) <= new Date());
            
            return (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ 
                  y: -8, 
                  scale: 1.02,
                  transition: { duration: 0.2 } 
                }}
              >
                <Card className="h-full border-green-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white/70 backdrop-blur-sm">
                  <CardHeader className="pb-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
                    <div className="flex justify-between items-start mb-2">
                      <Badge 
                        variant="secondary" 
                        className="bg-green-100 text-green-800 hover:bg-green-200"
                      >
                        {test.institutionName}
                      </Badge>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800 line-clamp-2">
                      {test.title}
                    </CardTitle>
                    <CardDescription className="text-gray-600 line-clamp-3 mt-2">
                      {test.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-4 pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen className="h-4 w-4" />
                          <span>Questions</span>
                        </div>
                        <span className="font-semibold">{test.questions?.length || 0}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>Duration</span>
                        </div>
                        <span className="font-semibold">{test.durationMinutes} mins</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Award className="h-4 w-4" />
                          <span>Total Score</span>
                        </div>
                        <span className="font-semibold">{test.totalScore}</span>
                      </div>

                      {test.scheduledAt && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Scheduled</span>
                          </div>
                          <span className="font-semibold text-sm">
                            {new Date(test.scheduledAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full rounded-full transition-all duration-300 ${
                        isAvailable 
                          ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' 
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (isAvailable) {
                          window.location.href = `/student/tests/${test.id}`;
                        }
                      }}
                      disabled={!isAvailable}
                    >
                      {isAvailable ? 'Start Test' : 'Not Available'}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredTests.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-8 max-w-md mx-auto border border-green-200">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No tests found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? "No tests match your search criteria. Try different keywords." 
                  : "There are no tests available at the moment."}
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="rounded-full border-green-200 hover:bg-green-50"
                >
                  Clear Search
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}