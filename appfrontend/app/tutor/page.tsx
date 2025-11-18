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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 px-6 md:px-12 py-10" style={{ backdropFilter: 'blur(30px)' }}>
      {/* HERO */}
      <section className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}
            >
              Tutor Console
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-4 text-gray-600 max-w-xl text-lg font-medium leading-relaxed"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Create tests, start invigilation, review submissions, and monitor
              class performance — all from a single secure dashboard.
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button 
                onClick={handleCreateTest}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-3xl border border-white/30"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
                  filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
                }}
              >
                <FileText className="w-5 h-5 mr-2 inline" /> Create Test
              </button>
              <button 
                onClick={handleStartMeeting}
                className="px-8 py-4 bg-white/80 backdrop-blur-xl text-orange-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 20px 40px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
              >
                <Video className="w-5 h-5 mr-2 inline" /> Create Meeting
              </button>
              <button 
                onClick={handleManageMeetings}
                className="px-8 py-4 bg-white/80 backdrop-blur-xl text-orange-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 20px 40px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
              >
                <Video className="w-5 h-5 mr-2 inline" /> Manage Meetings
              </button>
              <button 
                onClick={() => router.push('/tutor/profile')}
                className="px-8 py-4 bg-white/80 backdrop-blur-xl text-orange-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 20px 40px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
                }}
              >
                Edit Profile
              </button>
            </div>
          </div>

          {/* Quick action tiles */}
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              whileHover={{ scale: 1.05, rotateY: 5 }}
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
              style={{ 
                boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                transform: 'perspective(1000px)',
                filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Meetings Created</div>
                    <div className="text-2xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{meetingcnt}</div>
                  </div>
                </div>
                <button
                  onClick={() => router.push("/tutor/meeting")}
                  className="px-4 py-2 text-xs font-bold text-orange-600 bg-orange-100 rounded-xl hover:bg-orange-200 transition-all duration-200"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  View
                </button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, rotateY: -5 }}
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
              style={{ 
                boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                transform: 'perspective(1000px)',
                filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
                    <CalendarCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Tests Conducted</div>
                    <div className="text-2xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{stats.testsConducted}</div>
                  </div>
                </div>
                <button 
                  onClick={() => router.push("/tutor/tests")} 
                  className="px-4 py-2 text-xs font-bold text-orange-600 bg-orange-100 rounded-xl hover:bg-orange-200 transition-all duration-200"
                  style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                >
                  Manage
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS + CHARTS */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-lg">
              <ClipboardCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Papers Checked</div>
              <div className="text-3xl font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{stats.papersChecked}</div>
            </div>
          </div>

          <div className="mt-8">
            <div className="text-sm text-gray-500 font-semibold mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Avg Attendance</div>
            <div className="w-full bg-orange-100 rounded-full h-3 overflow-hidden shadow-inner">
              <div 
                style={{ width: `${stats.avgAttendance}%` }} 
                className="h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full shadow-sm transition-all duration-500" 
              />
            </div>
            <div className="mt-3 text-lg font-bold text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{stats.avgAttendance}%</div>
          </div>

          <div className="mt-8 flex gap-3">
            <button 
              onClick={handleCheckPapers} 
              className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Check Papers
            </button>
            <button 
              onClick={handleViewPerformance} 
              className="flex-1 px-4 py-3 bg-white/80 backdrop-blur-xl text-orange-600 font-bold rounded-xl shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Performance
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-2 p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Students Joined vs Attempted</h3>
          <Bar data={barData} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 lg:col-span-1 p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Result Distribution</h3>
          <Doughnut data={donutData} />
        </motion.div>

        <motion.div 
          className="col-span-1 lg:col-span-2 p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Attendance Trend</h3>
          <Line data={lineData} />
        </motion.div>
      </section>

      {/* ACTIVITY / TIMELINE */}
      <section className="max-w-6xl mx-auto mb-10">
        <h3 className="text-2xl font-black text-orange-600 mb-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? recentActivity.map((activity: string, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              style={{ 
                boxShadow: '0 25px 50px rgba(251, 146, 60, 0.2), 0 10px 25px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                filter: 'drop-shadow(0 15px 30px rgba(251, 146, 60, 0.15))'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-700" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{activity}</div>
                <div className="text-xs font-semibold text-orange-500 bg-orange-100 px-3 py-1 rounded-full" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Recent</div>
              </div>
            </motion.div>
          )) : (
            <div className="text-gray-500 text-sm font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>No recent activity</div>
          )}
        </div>
      </section>

      {/* FOOTER ACTIONS */}
      <section className="max-w-6xl mx-auto mt-12">
        <div className="flex flex-col md:flex-row gap-6 justify-between items-center p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
             style={{ 
               boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
               filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
             }}>
          <div className="text-gray-600 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Need help? Contact support@yourapp.com</div>
          <div className="flex gap-4">
            <button 
              onClick={() => router.push("/tutor/reports")}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:shadow-orange-500/25 hover:scale-105 transition-all duration-300"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Export Reports
            </button>
            <button 
              onClick={handleAttendance}
              className="px-6 py-3 bg-white/80 backdrop-blur-xl text-orange-600 font-bold rounded-xl shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Attendance
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
