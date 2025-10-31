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
  id: number;
  text: string;
  type: string;
  marks: number;
}

interface Test {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  stats?: {
    totalStudents: number;
    present: number;
    evaluated: number;
  };
}

export default function TestStatsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [test, setTest] = useState<Test | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("tutorTests");
    if (saved) {
      const all = JSON.parse(saved) as Test[];
      const found = all.find((t) => t.id === id);
      setTest(found || null);
    }
  }, [id]);

  if (!test) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg text-slate-600">
        Test not found
      </div>
    );
  }

  const attendanceData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        label: "Attendance",
        data: [
          test.stats?.present ?? 0,
          (test.stats?.totalStudents ?? 0) - (test.stats?.present ?? 0),
        ],
        backgroundColor: ["#34d399", "#f87171"],
      },
    ],
  };

  const evaluationData = {
    labels: ["Evaluated", "Not Evaluated"],
    datasets: [
      {
        label: "Evaluation",
        data: [
          test.stats?.evaluated ?? 0,
          (test.stats?.totalStudents ?? 0) - (test.stats?.evaluated ?? 0),
        ],
        backgroundColor: ["#6366f1", "#e5e7eb"],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-slate-100 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-indigo-700">
          {test.name} – Stats
        </h1>
        <Button onClick={() => router.push("/tutor/tests")} variant="outline">
          Back
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-xl shadow-lg border-0">
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={attendanceData} />
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-lg border-0">
          <CardHeader>
            <CardTitle>Evaluation</CardTitle>
          </CardHeader>
          <CardContent>
            <Pie data={evaluationData} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="rounded-xl shadow-lg border-0">
          <CardHeader>
            <CardTitle>Questions Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <Bar
              data={{
                labels: test.questions.map((q) => q.text.slice(0, 20) + "..."),
                datasets: [
                  {
                    label: "Marks",
                    data: test.questions.map((q) => q.marks),
                    backgroundColor: "#8b5cf6",
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: { display: false },
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
