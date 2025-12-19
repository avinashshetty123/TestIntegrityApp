"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { 
  Users, 
  CheckCircle, 
  FileText, 
  ArrowLeft, 
  Eye,
  TrendingUp,
  BarChart3
} from "lucide-react";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement
);

interface Question {
  questionId: number;
  questionText: string;
  attempts: number;
  marks: number;
}

interface Test {
  testId: string;
  title: string;
  description: string;
  perQuestionStats: Question[];
 
    totalStudents: number;
    present: number;
    evaluated: number;

}

export default function TestStatsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const res = await fetch(`http://localhost:4000/tests/${id}/stats`, {
        credentials: "include",
      });
      const data = await res.json();
      setTest(data);
    }
    fetchStats();
  }, [id]);

  if (!test) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl" style={{ boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25)' }}>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-600 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Loading...</p>
        </div>
      </div>
    );
  }
  console.log(test);



  const evaluationData = {
    labels: ["Evaluated", "Not Evaluated"],
    datasets: [
      {
        data: [
          test.evaluated,
          (test.totalStudents ?? 0) - (test.evaluated ?? 0),
        ],
        backgroundColor: ["#6366f1", "#e5e7eb"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{test.title}</h1>
              <p className="text-gray-500">Test Analytics & Performance</p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/tutor/tests/${id}/submission`)}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Eye className="w-4 h-4" />
            <span>View Submissions</span>
          </button>
        </div>
      

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{test.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Evaluated</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{test.evaluated}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {((test.evaluated / test.totalStudents) * 100).toFixed(1)}% complete
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Questions</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{test.perQuestionStats?.length ?? 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-6">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Evaluation Progress</h3>
            </div>
            <div className="h-64 flex items-center justify-center">
              <Pie 
                data={{
                  ...evaluationData,
                  datasets: [{
                    ...evaluationData.datasets[0],
                    backgroundColor: ["#10b981", "#e5e7eb"],
                    borderWidth: 0
                  }]
                }}
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom' as const,
                      labels: {
                        padding: 20,
                        usePointStyle: true
                      }
                    }
                  },
                  maintainAspectRatio: false
                }}
              />
            </div>
          </div>

          {test.perQuestionStats && test.perQuestionStats.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-2 mb-6">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Question Performance</h3>
              </div>
              <div className="h-64">
                <Bar
                  data={{
                    labels: test.perQuestionStats.map((_, i) => `Q${i + 1}`),
                    datasets: [{
                      label: 'Average Score',
                      data: test.perQuestionStats.map(q => q.marks),
                      backgroundColor: '#3b82f6',
                      borderRadius: 4,
                      borderSkipped: false
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: '#f3f4f6'
                        }
                      },
                      x: {
                        grid: {
                          display: false
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Questions Table */}
        {test.perQuestionStats && test.perQuestionStats.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Question Details</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Question
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attempts
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {test.perQuestionStats.map((question, index) => (
                    <tr key={question.questionId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            Question {index + 1}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {question.questionText}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {question.attempts}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {question.marks.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}abels:
                test.perQuestionStats?.map((q) => q.questionText.slice(0, 30) + "...") ?? [],
              datasets: [
                {
                  label: "Marks",
                  data: test.perQuestionStats?.map((q) => q.marks) ?? [],
                  backgroundColor: "rgba(251, 146, 60, 0.8)",
                  borderColor: "rgba(251, 146, 60, 1)",
                  borderWidth: 2,
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  );
}
