"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  FileText,
  Search,
  Eye,
  Trash2,
  Users,
  BarChart3,
  CheckCircle,
  Play,
  Pause,
} from "lucide-react";

interface Test {
  id: number;
  title: string;
  description: string;
  questions: any[];
  submissions: any[];
  averageScore: number;
  createdAt: string;
  ispublished: boolean;
  durationMinutes?: number;
  scheduledAt?: string;
}

export default function TestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingStates, setLoadingStates] = useState<{[key: number]: 'publishing' | 'unpublishing' | null}>({});

  useEffect(() => {
    fetchTests();
  }, []);

  const publishTest = async (testId: number) => {
    try {
      setLoadingStates(prev => ({...prev, [testId]: 'publishing'}));
      
      console.log(`Publishing test ID: ${testId}`);
      
      const response = await fetch(`http://localhost:4000/tests/${testId}/publish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const updatedTest = await response.json();
        console.log(`Backend returned test:`, updatedTest);
        
        // Update the specific test with data from backend
        setTests(prevTests => 
          prevTests.map(test => 
            test.id === updatedTest.id 
              ? { ...test, ispublished: true }
              : test
          )
        );
      } else {
        console.error('Failed to publish test');
        alert('Failed to publish test. Please try again.');
      }
    } catch (error) {
      console.error('Error publishing test:', error);
      alert('Error publishing test. Please try again.');
    } finally {
      setLoadingStates(prev => ({...prev, [testId]: null}));
    }
  };

  const unPublishTest = async (testId: number) => {
    try {
      setLoadingStates(prev => ({...prev, [testId]: 'unpublishing'}));
      
      console.log(`Unpublishing test ID: ${testId}`);
      
      const response = await fetch(`http://localhost:4000/tests/${testId}/unpublish`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      
      if (response.ok) {
        const updatedTest = await response.json();
        console.log(`Backend returned test:`, updatedTest);
        
        // Update the specific test with data from backend
        setTests(prevTests => 
          prevTests.map(test => 
            test.id === updatedTest.id 
              ? { ...test, ispublished: false }
              : test
          )
        );
      } else {
        console.error('Failed to unpublish test');
        alert('Failed to unpublish test. Please try again.');
      }
    } catch (error) {
      console.error('Error unpublishing test:', error);
      alert('Error unpublishing test. Please try again.');
    } finally {
      setLoadingStates(prev => ({...prev, [testId]: null}));
    }
  };

  const fetchTests = async () => {
    try {
      const response = await fetch("http://localhost:4000/tests/tutor", {
        credentials: "include",
        // Prevent caching
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error("Failed to fetch tests");

      const data = await response.json();
      console.log('Fetched tests:', data);
      setTests(data);
    } catch (error) {
      console.error("Error fetching tests:", error);
    }
  };

  const deleteTest = async (testId: number) => {
    if (!confirm("Are you sure you want to delete this test?")) return;
    
    try {
      const response = await fetch(`http://localhost:4000/tests/${testId}`, {
        method: "DELETE",
        credentials: "include",
      });
      
      if (response.ok) {
        setTests(prevTests => prevTests.filter(test => test.id !== testId));
      } else {
        alert('Failed to delete test');
      }
    } catch (error) {
      console.error("Error deleting test:", error);
      alert('Error deleting test');
    }
  };

  const autoGradeAll = async (testId: number) => {
    try {
      await fetch(`http://localhost:4000/tests/${testId}/auto-grade-all`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      fetchTests();
    } catch (error) {
      console.error("Error auto-grading:", error);
    }
  };

  const filteredTests = tests.filter((test) =>
    test.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const publishedTestsCount = tests.filter((t) => t.ispublished).length;
  const draftTestsCount = tests.filter((t) => !t.ispublished).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 p-6" style={{ backdropFilter: 'blur(30px)' }}>
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <button 
          onClick={()=>{router.push('/tutor')}}
          className="mb-6 px-6 py-3 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
          style={{ 
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 20px 40px rgba(255, 255, 255, 0.4), 0 5px 15px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          Back
        </button>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
                style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}>
              Test Management
            </h1>
            <p className="text-gray-600 text-lg font-medium mt-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Create and manage standalone tests</p>
          </div>

          <button 
            onClick={() => router.push("/tutor/tests/create-test")}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-3xl border border-white/30 flex items-center gap-2"
            style={{ 
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
            }}
          >
            <Plus className="w-5 h-5" />
            Create Test
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Total Tests</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{tests.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
         
          <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Published Tests</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{publishedTestsCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Draft Tests</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{draftTestsCount}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Avg Score</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  {tests.length > 0
                    ? Math.round(
                        tests.reduce((sum, t) => sum + t.averageScore, 0) / tests.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* TEST LIST */}
        <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>All Tests</h2>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 px-4 py-2 bg-white/80 backdrop-blur-xl border border-orange-200/50 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
                <button 
                  onClick={fetchTests}
                  className="px-4 py-2 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-xl shadow-2xl hover:shadow-white/80 hover:scale-105 transition-all duration-300 border border-orange-200/60"
                  style={{ 
                    fontFamily: 'Inter, system-ui, sans-serif',
                    boxShadow: '0 20px 40px rgba(255, 255, 255, 0.4), 0 5px 15px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                  }}
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredTests.length > 0 ? (
              filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-6 rounded-2xl bg-orange-50/50 border border-orange-200/30 hover:bg-orange-50 transition-all duration-300 shadow-lg"
                  style={{ 
                    boxShadow: '0 10px 25px rgba(251, 146, 60, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.9)'
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{test.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        test.ispublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {test.ispublished ? "Published" : "Draft"}
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        ID: {test.id}
                      </span>
                      {test.durationMinutes && (
                        <span className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {test.durationMinutes} mins
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {test.description}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      <span>{test.questions.length} questions</span>
                      <span>{test.submissions?.length || 0} submissions</span>
                      <span>{test.averageScore}% avg score</span>
                      <span>
                        Created: {new Date(test.createdAt).toLocaleDateString()}
                      </span>
                      {test.scheduledAt && (
                        <span>
                          Starts: {new Date(test.scheduledAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/tutor/tests/${test.id}`)}
                      className="px-3 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50 flex items-center gap-1"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>

                    <button
                      onClick={() => router.push(`/tutor/tests/${test.id}/edit`)}
                      className="px-3 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50 flex items-center gap-1"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      <FileText className="w-4 h-4" />
                      Edit
                    </button>

                    <button
                      onClick={() => autoGradeAll(test.id)}
                      className="px-3 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50 flex items-center gap-1"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      <Play className="w-4 h-4" />
                      Auto Grade
                    </button>

                    {!test.ispublished ? (
                      <button
                        onClick={() => publishTest(test.id)}
                        disabled={loadingStates[test.id] === 'publishing'}
                        className="px-3 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-1 disabled:opacity-50"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {loadingStates[test.id] === 'publishing' ? (
                          <>Publishing...</>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Publish
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => unPublishTest(test.id)}
                        disabled={loadingStates[test.id] === 'unpublishing'}
                        className="px-3 py-2 bg-gray-500 text-white font-bold rounded-lg shadow-lg hover:shadow-gray-500/25 hover:scale-105 transition-all duration-300 flex items-center gap-1 disabled:opacity-50"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {loadingStates[test.id] === 'unpublishing' ? (
                          <>Unpublishing...</>
                        ) : (
                          <>
                            <Pause className="w-4 h-4" />
                            Unpublish
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => deleteTest(test.id)}
                      className="px-3 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-red-500/25 hover:scale-105 transition-all duration-300"
                      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-sm font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>No tests found.</p>
                {searchTerm && (
                  <p className="text-gray-500 text-xs mt-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    No tests matching "{searchTerm}"
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}