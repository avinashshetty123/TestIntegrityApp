"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Button } from "@/components/ui/button";
import { Search, FileCheck, Video, Building2, ListChecks } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Tooltip, Legend);

export default function StudentPage() {
  const router = useRouter();

  // Mock data
  const performanceData = {
    labels: ["Test 1", "Test 2", "Test 3", "Test 4"],
    datasets: [
      {
        label: "Score",
        data: [75, 82, 68, 90],
        borderColor: "rgba(59,130,246,1)",
        backgroundColor: "rgba(59,130,246,0.12)",
        tension: 0.3,
      },
    ],
  };

  const donutData = {
    labels: ["Attempted", "Pending"],
    datasets: [
      {
        data: [8, 3],
        backgroundColor: ["#22c55e", "#f43f5e"],
      },
    ],
  };

  const quickActions = [
    { icon: <FileCheck className="w-5 h-5" />, label: "Take Test", onClick: () => router.push("/student/take-test") },
    { icon: <Video className="w-5 h-5" />, label: "Join Meeting", onClick: () => router.push("/meeting") },
    { icon: <ListChecks className="w-5 h-5" />, label: "All Submissions", onClick: () => router.push("/student/submissions") },
    { icon: <Search className="w-5 h-5" />, label: "Search Institution", onClick: () => router.push("/search") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white px-6 md:px-12 py-10">
      {/* HERO */}
      <section className="max-w-5xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-extrabold">
              Welcome, Student
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-2 text-slate-300 max-w-lg">
              Take tests, join meetings, check results and review submissions — all in a secure, proctored environment.
            </motion.p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="lg" className="bg-green-600" onClick={() => router.push("/student/take-test")}>
                Take Test
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push("/student/results")}>
                Check Results
              </Button>
            </div>
          </div>

          {/* Profile + quick stats */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold">S</div>
            <div>
              <div className="text-sm text-slate-300">Student ID</div>
              <div className="text-lg font-semibold">AB12345</div>
              <div className="mt-1 text-xs text-slate-400">Avg Score: <span className="font-bold">81%</span></div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Performance Overview (no cards) */}
      <section className="max-w-5xl mx-auto mb-12 grid md:grid-cols-2 gap-8 items-start">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-white/4 border border-white/8">
          <h3 className="text-lg font-semibold mb-4">Performance Trend</h3>
          <Line data={performanceData} />
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-6 rounded-2xl bg-white/4 border border-white/8 flex flex-col items-center">
          <h3 className="text-lg font-semibold mb-4">Attempts</h3>
          <Doughnut data={donutData} />
          <div className="mt-4 text-slate-300 text-sm">Attempted 8 / 11</div>
        </motion.div>
      </section>

      {/* Quick Actions strip (prominent, not cards) */}
      <section className="max-w-5xl mx-auto mb-12">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {quickActions.map((a, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.03 }}
              onClick={a.onClick}
              className="min-w-[200px] p-4 rounded-2xl bg-gradient-to-r from-white/5 to-white/3 border border-white/10 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-white/6 flex items-center justify-center">{a.icon}</div>
              <div className="text-left">
                <div className="font-semibold">{a.label}</div>
                <div className="text-xs text-slate-400">Open</div>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Tests Timeline */}
      <section className="max-w-5xl mx-auto mb-12">
        <h3 className="text-lg font-semibold mb-4">Recent Tests & Submissions</h3>
        <div className="space-y-4 border-l border-slate-700 pl-6 ml-3">
          {[
            { title: "Algorithms Midterm", desc: "Result: 82%", time: "2d ago" },
            { title: "Database Quiz", desc: "Result: 68%", time: "1w ago" },
            { title: "Math Practice", desc: "Pending review", time: "3w ago" },
          ].map((t, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-1.5" />
              <div className="text-sm font-semibold ml-3.5">{t.title}</div>
              <div className="text-xs text-slate-400 ml-3.5">{t.desc} · <span className="text-slate-500 ml-3.5">{t.time}</span></div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Meetings / Institutions carousel */}
      <section className="max-w-5xl mx-auto mb-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Meetings & Institutions</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[
            { name: "ABC Institute", meeting: "Physics Viva", time: "Today 3:00 PM" },
            { name: "XYZ University", meeting: "Math Test", time: "Tomorrow 11:00 AM" },
            { name: "Global Academy", meeting: "Interview - CS", time: "Fri 9:00 AM" },
          ].map((m, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className="min-w-[250px] p-4 rounded-2xl bg-gradient-to-br from-white/4 to-white/2 border border-white/10">
              <div className="text-sm text-slate-400">{m.name}</div>
              <div className="mt-2 font-semibold">{m.meeting}</div>
              <div className="text-xs text-slate-400 mt-1">{m.time}</div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => router.push("/meeting")}>Join</Button>
                <Button size="sm" variant="secondary" onClick={() => router.push("/student/details")}>Details</Button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
