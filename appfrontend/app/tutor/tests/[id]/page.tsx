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
      <div className="min-h-screen flex items-center justify-center text-lg text-slate-600">
        Loading...
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
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
        <Button variant="outline" onClick={() => router.back()}>
                Back
              </Button>
      <div className="flex justify-between">
        <h1 className="text-3xl font-bold text-indigo-700">
          {test.title} – Analytics
        </h1>
        <Button
          variant="outline"
          onClick={() => router.push(`/tutor/tests/${id}/submission`)}
        >
          View Submissions
        </Button>
      </div>
      

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm">Total Students</p>
            <p className="text-2xl font-bold text-black">{test.totalStudents}</p>
          </CardContent>
        </Card>
          



        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm">Evaluated</p>
            <p className="text-2xl font-bold text-indigo-600">
              {test.evaluated}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500 text-sm">Questions</p>
     <p className="text-2xl font-bold">{test.perQuestionStats?.length ?? 0}</p>

          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-8">


        <Card className="shadow-md border">
          <CardHeader>
            <CardTitle>Evaluation Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={evaluationData} />
          </CardContent>
        </Card>
      </div>

      {/* Questions Overview */}
      <Card className="shadow-md border mt-6">
        <CardHeader>
          <CardTitle>Questions Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <Bar
            data={{
              labels:
                test.perQuestionStats?.map((q) => q.questionText.slice(0, 30) + "...") ?? [],
              datasets: [
                {
                  label: "Marks",
                  data: test.perQuestionStats?.map((q) => q.marks) ?? [],
                  backgroundColor: "#8b5cf6",
                },
              ],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
