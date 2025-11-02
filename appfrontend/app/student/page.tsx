"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
import { Search, FileCheck, Video, Building2, ListChecks, User } from "lucide-react";
import StudentMeetingDashboard from "@/components/StudentMeetingDashboard";
import GoogleMeetStyleCall from "@/components/GoogleMeetStyleCall";
import JoinByCode from "@/components/JoinByCode";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ArcElement, Tooltip, Legend);

export default function StudentPage() {
  const router = useRouter();
  const [currentView, setCurrentView] = useState<"dashboard" | "meetings" | "proctored" | "join-code">("dashboard");
  const [selectedMeeting, setSelectedMeeting] = useState<{id: string, token: string, serverUrl: string} | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  const handleJoinMeeting = (meetingId: string, token: string, serverUrl: string) => {
    setSelectedMeeting({ id: meetingId, token, serverUrl });
    setCurrentView("proctored");
  };

  const handleLeaveMeeting = () => {
    setSelectedMeeting(null);
    setCurrentView("dashboard");
  };

  const [performanceData, setPerformanceData] = useState({
    labels: [],
    datasets: [{
      label: "Score",
      data: [],
      borderColor: "rgba(59,130,246,1)",
      backgroundColor: "rgba(59,130,246,0.12)",
      tension: 0.3,
    }],
  });

  const [donutData, setDonutData] = useState({
    labels: ["Attempted", "Pending"],
    datasets: [{
      data: [0, 0],
      backgroundColor: ["#22c55e", "#f43f5e"],
    }],
  });

  const [recentTests, setRecentTests] = useState([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  const fetchStudentData = async () => {
    try {
      // Fetch test results
      const testsResponse = await fetch('http://localhost:4000/tests/results', {
        credentials: 'include'
      });
      if (testsResponse.ok) {
        const tests = await testsResponse.json();
        setRecentTests(tests.slice(0, 3));
        
        // Update performance chart
        if (tests.length > 0) {
          setPerformanceData({
            labels: tests.map((t: any, i: number) => `Test ${i + 1}`),
            datasets: [{
              label: "Score",
              data: tests.map((t: any) => t.score || 0),
              borderColor: "rgba(59,130,246,1)",
              backgroundColor: "rgba(59,130,246,0.12)",
              tension: 0.3,
            }],
          });
          
          setDonutData({
            labels: ["Attempted", "Pending"],
            datasets: [{
              data: [tests.length, Math.max(0, 10 - tests.length)],
              backgroundColor: ["#22c55e", "#f43f5e"],
            }],
          });
        }
      }
      
      // Fetch meetings
      const meetingsResponse = await fetch('http://localhost:4000/meetings/visible', {
        credentials: 'include'
      });
      if (meetingsResponse.ok) {
        const meetings = await meetingsResponse.json();
        setUpcomingMeetings(meetings.slice(0, 3));
      }
    } catch (error) {
      console.error('Failed to fetch student data:', error);
    }
  };

  useEffect(() => {
    if (userData) {
      fetchStudentData();
    }
  }, [userData]);

  const quickActions = [
    { icon: <FileCheck className="w-5 h-5" />, label: "Take Test", onClick: () => router.push("/student/take-test") },
    { icon: <Video className="w-5 h-5" />, label: "Browse Meetings", onClick: () => setCurrentView("meetings") },
    { icon: <Video className="w-5 h-5" />, label: "Join by Code", onClick: () => setCurrentView("join-code") },
    { icon: <ListChecks className="w-5 h-5" />, label: "All Submissions", onClick: () => router.push("/student/submissions") },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Render different views based on current state
  if (currentView === "meetings") {
    return (
      <div>
        <div className="p-4 bg-black/50 border-b border-white/10">
          <Button onClick={() => setCurrentView("dashboard")} variant="outline" className="mb-4">
            ← Back to Dashboard
          </Button>
        </div>
        <StudentMeetingDashboard onJoinMeeting={handleJoinMeeting} />
      </div>
    );
  }

  if (currentView === "join-code") {
    return (
      <JoinByCode
        onJoinMeeting={handleJoinMeeting}
        onCancel={() => setCurrentView("dashboard")}
      />
    );
  }

  if (currentView === "proctored" && selectedMeeting) {
    return (
      <GoogleMeetStyleCall
        token={selectedMeeting.token}
        serverUrl={selectedMeeting.serverUrl}
        onDisconnect={handleLeaveMeeting}
        userInfo={{
          name: userData?.firstName || 'Student',
          profilePic: userData?.profilePic,
          role: 'student'
        }}
      />
    );
  }

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
              <Button size="lg" className="bg-green-600" onClick={() => setCurrentView("join-code")}>
                Join by Code
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setCurrentView("meetings")}>
                Browse Meetings
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push("/student/results")}>
                Check Results
              </Button>
            </div>
          </div>

          {/* Profile + quick stats */}
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/student/profile')}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-xl font-bold hover:scale-105 transition-transform overflow-hidden"
            >
              {userData?.profilePic ? (
                <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userData?.firstName ? userData.firstName.charAt(0).toUpperCase() : <User className="w-8 h-8" />
              )}
            </button>
            <div>
              <div className="text-sm text-slate-300">{userData?.firstName ? `${userData.firstName} ${userData.lastName}` : 'Student Profile'}</div>
              <div className="text-lg font-semibold">Click to Edit</div>
              <div className="mt-1 text-xs text-slate-400">{userData?.institutionName || 'Complete your profile'}</div>
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
          {recentTests.length > 0 ? recentTests.map((test: any, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative">
              <div className="absolute -left-3 w-6 h-6 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 mr-1.5" />
              <div className="text-sm font-semibold ml-3.5">{test.testTitle || 'Test'}</div>
              <div className="text-xs text-slate-400 ml-3.5">
                {test.score ? `Result: ${test.score}%` : 'Pending review'} · 
                <span className="text-slate-500 ml-3.5">{new Date(test.submittedAt).toLocaleDateString()}</span>
              </div>
            </motion.div>
          )) : (
            <div className="text-slate-400 text-sm">No tests taken yet</div>
          )}
        </div>
      </section>

      {/* Meetings / Institutions carousel */}
      <section className="max-w-5xl mx-auto mb-6">
        <h3 className="text-lg font-semibold mb-4">Upcoming Meetings</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {upcomingMeetings.length > 0 ? upcomingMeetings.map((meeting: any, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className="min-w-[250px] p-4 rounded-2xl bg-gradient-to-br from-white/4 to-white/2 border border-white/10">
              <div className="text-sm text-slate-400">{meeting.institutionName || 'Institution'}</div>
              <div className="mt-2 font-semibold">{meeting.title}</div>
              <div className="text-xs text-slate-400 mt-1">{new Date(meeting.scheduledAt).toLocaleString()}</div>
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={async () => {
                  try {
                    const response = await fetch(`http://localhost:4000/meetings/${meeting.id}/join`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({ displayName: userData?.firstName || 'Student' })
                    });
                    
                    if (response.ok) {
                      const { token, serverUrl } = await response.json();
                      handleJoinMeeting(meeting.id, token, serverUrl);
                    }
                  } catch (error) {
                    console.error('Failed to join meeting:', error);
                  }
                }}>Join</Button>
                <Button size="sm" variant="secondary">Details</Button>
              </div>
            </motion.div>
          )) : (
            <div className="text-slate-400 text-sm">No upcoming meetings</div>
          )}
        </div>
      </section>
    </div>
  );
}
