"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 p-8" style={{ backdropFilter: 'blur(30px)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <button 
          onClick={() => router.back()}
          className="mb-6 px-6 py-3 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
          style={{ 
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 20px 40px rgba(255, 255, 255, 0.4), 0 5px 15px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          Back
        </button>
        
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}>
            {test.title} – Analytics
          </h1>
          <button
            onClick={() => router.push(`/tutor/tests/${id}/submission`)}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-3xl border border-white/30"
            style={{ 
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
            }}
          >
            View Submissions
          </button>
        </div>
      

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Total Students</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{test.totalStudents}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <div className="w-6 h-6 bg-white rounded opacity-80"></div>
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
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Evaluated</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{test.evaluated}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <div className="w-6 h-6 bg-white rounded opacity-80"></div>
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
                <p className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Questions</p>
                <p className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{test.perQuestionStats?.length ?? 0}</p>
              </div>
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <div className="w-6 h-6 bg-white rounded opacity-80"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
               style={{ 
                 boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                 filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
               }}>
            <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Evaluation Progress</h3>
            <Pie data={evaluationData} />
          </div>
        </div>

        {/* Questions Overview */}
        <div className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Questions Overview</h3>
          <Bar
            data={{
              labels:
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
