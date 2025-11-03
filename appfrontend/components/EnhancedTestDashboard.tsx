'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Eye, Edit, Trash2, FileText, Users, Clock, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Test {
  id: string;
  name: string;
  description: string;
  questions: any[];
  isPublished: boolean;
  createdAt: string;
  stats?: {
    totalStudents: number;
    present: number;
    evaluated: number;
  };
}

export default function EnhancedTestDashboard() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = () => {
    const saved = localStorage.getItem('tutorTests');
    if (saved) {
      setTests(JSON.parse(saved));
    }
  };

  const publishTest = (testId: string) => {
    const updatedTests = tests.map(test => 
      test.id === testId ? { ...test, isPublished: true } : test
    );
    setTests(updatedTests);
    localStorage.setItem('tutorTests', JSON.stringify(updatedTests));
  };

  const deleteTest = (testId: string) => {
    if (confirm('Are you sure you want to delete this test?')) {
      const updatedTests = tests.filter(test => test.id !== testId);
      setTests(updatedTests);
      localStorage.setItem('tutorTests', JSON.stringify(updatedTests));
    }
  };

  const filteredTests = tests.filter(test => {
    const matchesSearch = test.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         test.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'published' && test.isPublished) ||
                         (filter === 'draft' && !test.isPublished);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-indigo-700">Test Management</h1>
            <p className="text-slate-600 mt-2">Create, manage and publish your tests</p>
          </div>
          <Button 
            onClick={() => router.push('/tutor/tests/create-test')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" /> 
            Create New Test
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-xl font-bold">{tests.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Published</p>
                <p className="text-xl font-bold">{tests.filter(t => t.isPublished).length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Edit className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Drafts</p>
                <p className="text-xl font-bold">{tests.filter(t => !t.isPublished).length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Students</p>
                <p className="text-xl font-bold">{tests.reduce((sum, t) => sum + (t.stats?.totalStudents || 0), 0)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Input
            placeholder="Search tests by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
            >
              All Tests
            </Button>
            <Button
              variant={filter === 'published' ? 'default' : 'outline'}
              onClick={() => setFilter('published')}
            >
              Published
            </Button>
            <Button
              variant={filter === 'draft' ? 'default' : 'outline'}
              onClick={() => setFilter('draft')}
            >
              Drafts
            </Button>
          </div>
        </div>

        {/* Tests Grid */}
        {filteredTests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold mb-2">No tests found</h3>
            <p className="text-gray-600 mb-4">
              {tests.length === 0 
                ? "Create your first test to get started" 
                : "No tests match your current filter"}
            </p>
            <Button 
              onClick={() => router.push('/tutor/tests/create-test')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Test
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTests.map((test) => (
              <Card key={test.id} className="rounded-2xl shadow-lg border-0 hover:shadow-xl transition">
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-indigo-600 mb-1">{test.name}</h3>
                      <p className="text-sm text-slate-500">{test.description}</p>
                    </div>
                    <Badge className={test.isPublished ? 'bg-green-500' : 'bg-yellow-500'}>
                      {test.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 text-sm text-slate-700">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span>{test.questions.length} Questions</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{test.stats?.totalStudents || 0} Students</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Created {new Date(test.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => router.push(`/tutor/tests/${test.id}`)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    
                    {!test.isPublished && (
                      <Button
                        onClick={() => publishTest(test.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      onClick={() => deleteTest(test.id)}
                      variant="outline"
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}