"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import {
  FileText,
  Video,
  ClipboardCheck,
  BarChart,
  Users,
  CalendarCheck,
} from "lucide-react";
import CreateMeetingForm from "@/components/CreateMeetingForm";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function TutorPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<"dashboard">("dashboard");
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const[meetingcnt,setmeetingcnt]=useState(0);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('http://localhost:4000/user/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      } else {
        router.push('/signIn');
        return;
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/signIn');
      return;
    } finally {
      setLoading(false);
    }
  };



  const [stats, setStats] = useState({
    studentsJoined: 0,
    testsConducted: 0,
    papersChecked: 0,
    avgAttendance: 0,
  });

  const [barData, setBarData] = useState({
    labels: [],
    datasets: [
      {
        label: "Joined",
        data: [],
        backgroundColor: "rgba(59,130,246,0.9)",
      },
      {
        label: "Attempted",
        data: [],
        backgroundColor: "rgba(16,185,129,0.9)",
      },
    ],
  });

  const [lineData, setLineData] = useState({
    labels: [],
    datasets: [
      {
        label: "Attendance %",
        data: [],
        borderColor: "rgba(139,92,246,1)",
        backgroundColor: "rgba(139,92,246,0.15)",
        tension: 0.3,
      },
    ],
  });

  const [donutData, setDonutData] = useState({
    labels: ["Passed", "Failed", "Absent"],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: ["#22c55e", "#ef4444", "#facc15"],
      },
    ],
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const fetchTutorData = async () => {
    try {
      // Fetch tests created by tutor
      const testsResponse = await fetch('http://localhost:4000/tests/tutor', {
        credentials: 'include'
      });
      if (testsResponse.ok) {
        const tests = await testsResponse.json();
        setStats(prev => ({ ...prev, testsConducted: tests.length }));
        
        // Update charts with real data
        if (tests.length > 0) {
          setBarData({
            labels: tests.map((t: any, i: number) => `Test ${i + 1}`),
            datasets: [
              {
                label: "Joined",
                data: tests.map((t: any) => t.participantCount || 0),
                backgroundColor: "rgba(59,130,246,0.9)",
              },
              {
                label: "Attempted",
                data: tests.map((t: any) => t.submissionCount || 0),
                backgroundColor: "rgba(16,185,129,0.9)",
              },
            ],
          });
        }
      }
      
      // Fetch meetings
      const meetingsResponse = await fetch('http://localhost:4000/meetings/visible', {
        credentials: 'include'
      });
      if (meetingsResponse.ok) {
        const meetings = await meetingsResponse.json();
        const liveMeetings = meetings.filter((m: any) => m.status === 'LIVE');
        setStats(prev => ({ ...prev, studentsJoined: liveMeetings.reduce((sum: number, m: any) => sum + (m.participantCount || 0), 0) }));
        
        // Set recent activity
        setRecentActivity(meetings.slice(0, 4).map((m: any) => `Meeting: ${m.title} - ${m.status}`));
        setmeetingcnt(meetings.length);
      }
    } catch (error) {
      console.error('Failed to fetch tutor data:', error);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchTutorData();
    }
  }, [userData]);

  // action handlers
  const handleCreateTest = () => router.push("/tutor/tests");
  const handleStartMeeting = () => router.push("tutor/meeting/create-meeting");
  const handleCheckPapers = () => router.push("/tutor/tests");
  const handleViewPerformance = () => router.push("/tutor/analytics");
  const handleAttendance = () => router.push("/tutor/attendance");
  const handleManageMeetings = () => router.push("/tutor/meeting");

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Render different views based on current state
  // if (currentView === "meetings") {
  //   return (
  //     <div>
  //       <div className="p-4 bg-black/50 border-b border-white/10">
  //         <Button onClick={handleBackToDashbord          } variant="outline" className="mb-4">
  //           ← Back to Dashboard
  //         </Button>
  //       </div>
  //       <TutorMeetingDashboard 
  //         onCreateMeeting={handleCreateMeeting}
  //         onStartMeeting={handleJoinMeeting}
  //       />
  //     </div>
  //   );
  // }

  // if (currentView === "create-meeting") {
  //   return (
  //     <CreateMeetingForm
  //       onBack={() => setCurrentView("meetings")}
  //       onCreateMeeting={handleMeetingCreated}
  //     />
  //   );
  // }

  // if (currentView === "video-call" && selectedMeeting) {
  //   return (
  //     <GoogleMeetStyleCall
  //       token={selectedMeeting.token}
  //       serverUrl={selectedMeeting.serverUrl}
  //       onDisconnect={handleBackToDashboard}
  //       userInfo={{
  //         name: userData?.firstName || 'Tutor',
  //         profilePic: userData?.profilePic,
  //         role: 'tutor'
  //       }}
  //     />
  //   );
  // }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-black text-white px-6 md:px-12 py-10">
      {/* HERO */}
      <section className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"
            >
              Tutor Console
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-3 text-slate-300 max-w-xl"
            >
              Create tests, start invigilation, review submissions, and monitor
              class performance — all from a single secure dashboard.
            </motion.p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" className="bg-blue-600" onClick={handleCreateTest}>
                <FileText className="w-4 h-4 mr-2" /> Create Test
              </Button>
              <Button size="lg" variant="secondary" onClick={handleStartMeeting}>
                <Video className="w-4 h-4 mr-2" /> Create Meeting
              </Button>
              <Button size="lg" variant="secondary" onClick={handleManageMeetings}>
                <Video className="w-4 h-4 mr-2 text-black" /> Manage Meetings
              </Button>
              <Button size="lg" variant="secondary" onClick={() => router.push('/tutor/profile')}>
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Quick action tiles */}
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-blue-400" />
                  <div>
                    <div className="text-sm text-slate-300">Meetings Created</div>
                    <div className="text-xl font-bold">{meetingcnt}</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/tutor/meeting")}
                  className="text-xs text-slate-300 hover:underline"
                >
                  View
                </button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.03 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CalendarCheck className="w-6 h-6 text-green-400" />
                  <div>
                    <div className="text-sm text-slate-300">Tests Conducted</div>
                    <div className="text-xl font-bold">{stats.testsConducted}</div>
                  </div>
                </div>
                <button onClick={() => router.push("/tutor/tests")} className="text-xs text-slate-300 hover:underline">
                  Manage
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS + CHARTS */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="text-sm text-slate-300">Papers Checked</div>
              <div className="text-2xl font-bold">{stats.papersChecked}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="text-sm text-slate-300">Avg Attendance</div>
            <div className="mt-2 w-full bg-white/6 rounded-full h-2 overflow-hidden">
              <div style={{ width: `${stats.avgAttendance}%` }} className="h-2 bg-gradient-to-r from-green-400 to-blue-500" />
            </div>
            <div className="mt-2 text-sm">{stats.avgAttendance}%</div>
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={handleCheckPapers} className="flex-1">Check Papers</Button>
            <Button variant="secondary" onClick={handleViewPerformance} className="flex-1">Performance</Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-4">Students Joined vs Attempted</h3>
          <Bar data={barData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 lg:col-span-1 p-6 rounded-2xl bg-white/5 border border-white/10"
        >
          <h3 className="text-lg font-semibold mb-4">Result Distribution</h3>
          <Doughnut data={donutData} />
        </motion.div>

        <motion.div className="col-span-1 lg:col-span-2 p-6 rounded-2xl bg-white/5 border border-white/10">
          <h3 className="text-lg font-semibold mb-4">Attendance Trend</h3>
          <Line data={lineData} />
        </motion.div>
      </section>

      {/* ACTIVITY / TIMELINE */}
      <section className="max-w-6xl mx-auto mb-10">
        <h3 className="text-xl font-semibold mb-6">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? recentActivity.map((activity: string, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-4 rounded-lg bg-white/4 border border-white/6"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm">{activity}</div>
                <div className="text-xs text-slate-400">Recent</div>
              </div>
            </motion.div>
          )) : (
            <div className="text-slate-400 text-sm">No recent activity</div>
          )}
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <section className="max-w-6xl mx-auto mt-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="text-slate-400">Need help? Contact support@yourapp.com</div>
          <div className="flex gap-3">
            <Button onClick={() => router.push("/tutor/reports")}>Export Reports</Button>
            <Button variant="secondary" onClick={handleAttendance}>Attendance</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
