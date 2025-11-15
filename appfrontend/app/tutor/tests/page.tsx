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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <Button onClick={()=>{router.push('/tutor')}}>Back</Button>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Test Management
            </h1>
            <p className="text-gray-600">Create and manage standalone tests</p>
          </div>

          <Button onClick={() => router.push("/tutor/tests/create-test")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Test
          </Button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Tests</p>
                  <p className="text-2xl font-bold">{tests.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
         
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published Tests</p>
                  <p className="text-2xl font-bold">{publishedTestsCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Draft Tests</p>
                  <p className="text-2xl font-bold text-orange-600">{draftTestsCount}</p>
                </div>
                <FileText className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Score</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {tests.length > 0
                      ? Math.round(
                          tests.reduce((sum, t) => sum + t.averageScore, 0) / tests.length
                        )
                      : 0}
                    %
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-indigo-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TEST LIST */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>All Tests</CardTitle>

              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search tests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button variant="outline" onClick={fetchTests} size="sm">
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {filteredTests.length > 0 ? (
                filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium">{test.title}</h3>
                        <Badge 
                          variant={test.ispublished ? "default" : "secondary"}
                          className={test.ispublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                        >
                          {test.ispublished ? "Published" : "Draft"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          ID: {test.id}
                        </Badge>
                        {test.durationMinutes && (
                          <Badge variant="outline" className="text-xs">
                            {test.durationMinutes} mins
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {test.description}
                      </p>

                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/tutor/tests/${test.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/tutor/tests/${test.id}/edit`)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Edit
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => autoGradeAll(test.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Auto Grade
                      </Button>

                      {!test.ispublished ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => publishTest(test.id)}
                          disabled={loadingStates[test.id] === 'publishing'}
                        >
                          {loadingStates[test.id] === 'publishing' ? (
                            <>Publishing...</>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              Publish
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unPublishTest(test.id)}
                          disabled={loadingStates[test.id] === 'unpublishing'}
                        >
                          {loadingStates[test.id] === 'unpublishing' ? (
                            <>Unpublishing...</>
                          ) : (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Unpublish
                            </>
                          )}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteTest(test.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 text-sm">No tests found.</p>
                  {searchTerm && (
                    <p className="text-gray-500 text-xs mt-2">
                      No tests matching "{searchTerm}"
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}