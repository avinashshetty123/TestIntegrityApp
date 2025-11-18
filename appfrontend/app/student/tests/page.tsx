'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, Filter, Clock, Users, BookOpen, Award, Calendar, Play, FileText, ArrowLeft } from 'lucide-react';

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
  const router = useRouter();
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-600 font-medium">Loading available tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white font-['Inter']">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/60 backdrop-blur-3xl border-b border-orange-200/50 shadow-lg shadow-orange-100/50"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => router.back()}
                className="bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-[0_8px_30px_rgba(251,146,60,0.2),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_12px_40px_rgba(251,146,60,0.3)] hover:scale-105 transition-all duration-300 flex items-center gap-2 text-orange-700 hover:text-orange-800"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-medium">Back</span>
              </button>
              <motion.div
                className="flex items-center space-x-3"
                whileHover={{ scale: 1.02 }}
              >
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-3 rounded-xl shadow-lg shadow-orange-200/50">
                  <Award className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-700 bg-clip-text text-transparent">
                    Student Portal
                  </h1>
                  <p className="text-sm text-gray-600">Browse and take tests</p>
                </div>
              </motion.div>
            </div>
            <button className="px-6 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 rounded-full text-orange-600 font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30">
              My Profile
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-white/60 backdrop-blur-xl border border-red-200/50 rounded-xl text-red-700 flex items-center shadow-lg shadow-red-100/30"
          >
            <div className="flex-1">{error}</div>
            <button 
              onClick={fetchTests}
              className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-red-200/50 rounded-lg text-red-700 hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-red-100/30"
            >
              Retry
            </button>
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
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-orange-400 h-5 w-5" />
              <input
                placeholder="Search tests by title, description, or institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-xl border border-orange-200/50 rounded-full focus:border-orange-400 focus:ring-2 focus:ring-orange-200/50 outline-none transition-all duration-300 shadow-lg shadow-orange-100/30 text-gray-700"
              />
            </div>
            
            <div className="flex gap-3 w-full lg:w-auto">
              <button
                onClick={() => setFilter('all')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 shadow-lg ${filter === 'all' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 hover:scale-105' 
                  : 'bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 hover:bg-white/80 hover:scale-105 shadow-orange-100/30'
                }`}
              >
                All Tests
              </button>
              <button
                onClick={() => setFilter('available')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 shadow-lg ${filter === 'available' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 hover:scale-105' 
                  : 'bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 hover:bg-white/80 hover:scale-105 shadow-orange-100/30'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-300 shadow-lg ${filter === 'upcoming' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200/50 hover:scale-105' 
                  : 'bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 hover:bg-white/80 hover:scale-105 shadow-orange-100/30'
                }`}
              >
                Upcoming
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl p-6 shadow-xl shadow-orange-100/50 hover:scale-105 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-4 rounded-xl shadow-lg shadow-orange-200/50">
                <BookOpen className="h-7 w-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <p className="text-3xl font-bold text-orange-600 drop-shadow-sm">{filteredTests.length}</p>
                <p className="text-sm text-gray-600 font-medium">Tests Available</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl p-6 shadow-xl shadow-orange-100/50 hover:scale-105 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-400 to-blue-500 p-4 rounded-xl shadow-lg shadow-blue-200/50">
                <Clock className="h-7 w-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <p className="text-3xl font-bold text-blue-600 drop-shadow-sm">
                  {filteredTests.reduce((acc, test) => acc + (test.durationMinutes || 0), 0)}
                </p>
                <p className="text-sm text-gray-600 font-medium">Total Minutes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl p-6 shadow-xl shadow-orange-100/50 hover:scale-105 transition-all duration-300">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-purple-400 to-purple-500 p-4 rounded-xl shadow-lg shadow-purple-200/50">
                <Users className="h-7 w-7 text-white drop-shadow-sm" />
              </div>
              <div>
                <p className="text-3xl font-bold text-purple-600 drop-shadow-sm">
                  {[...new Set(filteredTests.map(test => test.institutionName))].length}
                </p>
                <p className="text-sm text-gray-600 font-medium">Institutions</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tests Grid */}
        {filteredTests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl p-8 shadow-xl shadow-orange-100/50 max-w-md mx-auto">
              <FileText className="h-16 w-16 text-orange-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Tests Found</h3>
              <p className="text-gray-500">No tests match your current search criteria.</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredTests.map((test, index) => {
              const status = getTestStatus(test);
              return (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white/60 backdrop-blur-3xl border border-orange-200/50 rounded-2xl p-6 shadow-xl shadow-orange-100/50 hover:scale-105 hover:shadow-2xl hover:shadow-orange-200/50 transition-all duration-300 group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-3 rounded-xl shadow-lg shadow-orange-200/50">
                      <Award className="h-6 w-6 text-white drop-shadow-sm" />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      status.label === 'Available' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : status.label === 'Upcoming'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {status.label}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-orange-600 transition-colors duration-300">
                    {test.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {test.description}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="h-4 w-4 mr-2 text-orange-400" />
                      {test.institutionName}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 text-orange-400" />
                      {test.durationMinutes} minutes
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2 text-orange-400" />
                      {test.questions?.length || 0} questions
                    </div>
                    {test.scheduledAt && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-orange-400" />
                        {new Date(test.scheduledAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {test.ispublished && (
                      <button className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-medium hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-200/50 flex items-center justify-center gap-2">
                        <Play className="h-4 w-4" />
                        Start Test
                      </button>
                    )}
                    <button className="px-4 py-2 bg-white/60 backdrop-blur-xl border border-orange-200/50 text-orange-600 rounded-xl font-medium hover:bg-white/80 hover:scale-105 transition-all duration-300 shadow-lg shadow-orange-100/30">
                      Details
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}