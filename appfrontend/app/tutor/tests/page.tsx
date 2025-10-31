"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

interface Question {
  id: number;
  text: string;
  type: string;
  marks: number;
  imageUrl?: string;
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

export default function TestsDashboard() {
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tutorTests");
    if (saved) {
      setTests(JSON.parse(saved));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-indigo-700">My Tests</h1>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
          <Link href="/tutor/tests/create-test">
            <PlusCircle className="w-4 h-4 mr-2" /> Create New Test
          </Link>
        </Button>
      </div>

      {tests.length === 0 ? (
        <p className="text-slate-600 text-lg">No tests created yet.</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card
              key={test.id}
              className="rounded-2xl shadow-lg border-0 hover:shadow-xl transition"
            >
              <CardHeader>
                <CardTitle className="text-xl font-bold text-indigo-600">
                  {test.name}
                </CardTitle>
                <p className="text-sm text-slate-500">{test.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-slate-700">
                  <span className="font-semibold">{test.questions.length}</span>{" "}
                  Questions
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold">
                    {test.stats?.totalStudents ?? 0}
                  </span>{" "}
                  Students
                </p>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                  <Link href={`/tutor/tests/${test.id}`}>View Stats</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
