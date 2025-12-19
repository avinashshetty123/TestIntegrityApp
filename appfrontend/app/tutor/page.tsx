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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white text-gray-800 px-6 py-8">
      {/* HERO */}
      <section className="max-w-6xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row items-center gap-8 justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-gray-800 mb-4"
            >
              Tutor Dashboard
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-gray-600 text-lg mb-8 max-w-2xl"
            >
              Create tests, manage meetings, and monitor student performance with AI-powered proctoring.
            </motion.p>

            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={handleCreateTest}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" /> Create Test
              </Button>
              <Button 
                onClick={handleStartMeeting}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-lg font-semibold"
              >
                <Video className="w-4 h-4 mr-2" /> Create Meeting
              </Button>
              <Button 
                onClick={handleManageMeetings}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-lg font-semibold"
              >
                <Video className="w-4 h-4 mr-2" /> Manage Meetings
              </Button>
              <Button 
                onClick={() => router.push('/tutor/profile')}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-lg font-semibold"
              >
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Meetings Created</div>
                    <div className="text-2xl font-bold text-gray-800">{meetingcnt}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/tutor/meeting")}
                >
                  View
                </Button>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              className="p-6 rounded-xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                    <CalendarCheck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Tests Conducted</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.testsConducted}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/tutor/tests")}
                >
                  Manage
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: <ClipboardCheck className="w-6 h-6" />, label: "Papers Checked", value: stats.papersChecked, color: "from-blue-500 to-blue-600" },
            { icon: <Users className="w-6 h-6" />, label: "Students Joined", value: stats.studentsJoined, color: "from-green-500 to-green-600" },
            { icon: <BarChart className="w-6 h-6" />, label: "Avg Attendance", value: `${stats.avgAttendance}%`, color: "from-purple-500 to-purple-600" },
            { icon: <FileText className="w-6 h-6" />, label: "Tests Created", value: stats.testsConducted, color: "from-orange-500 to-orange-600" }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-lg hover:shadow-xl transition-all"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${stat.color} flex items-center justify-center text-white mb-4`}>
                {stat.icon}
              </div>
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? recentActivity.map((activity: string, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">{activity}</div>
                <div className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">Recent</div>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-8 text-gray-500">No recent activity</div>
          )}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center p-6 rounded-xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-lg">
          <div className="text-gray-600">Need help? Contact support@testintegrity.com</div>
          <div className="flex gap-3">
            <Button 
              onClick={() => router.push("/tutor/reports")}
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
            >
              Export Reports
            </Button>
            <Button 
              onClick={handleAttendance}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              Attendance
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
