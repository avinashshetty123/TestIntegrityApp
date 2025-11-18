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
import { Button } from "../../components/ui/button";
import { FileCheck, Video, ListChecks, User } from "lucide-react";

import JoinByCode from "../../components/JoinByCode";

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
  const [availableTests, setAvailableTests] = useState([]);

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
      
      // Fetch available tests
      const availableTestsResponse = await fetch('http://localhost:4000/tests', {
        credentials: 'include'
      });
      if (availableTestsResponse.ok) {
        const tests = await availableTestsResponse.json();
        setAvailableTests(tests.slice(0, 3));
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
    { icon: <FileCheck className="w-5 h-5" />, label: "Browse Tests", onClick: () => router.push("/student/tests") },
    { icon: <Video className="w-5 h-5" />, label: "Browse Meetings", onClick: () => setCurrentView("meetings") },
    { icon: <Video className="w-5 h-5" />, label: "Join by Code", onClick: () => setCurrentView("join-code") },
    { icon: <ListChecks className="w-5 h-5" />, label: "View Results", onClick: () => router.push("/student/results") },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 flex items-center justify-center">
        <div className="text-center p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl" style={{ boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25)' }}>
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-orange-600 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Loading...</p>
        </div>
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


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 px-6 md:px-12 py-10" style={{ backdropFilter: 'blur(30px)' }}>
      {/* HERO */}
      <section className="max-w-5xl mx-auto mb-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <motion.h1 
              initial={{ opacity: 0, y: -12 }} 
              animate={{ opacity: 1, y: 0 }} 
              className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}
            >
              Welcome, Student
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 6 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.12 }} 
              className="mt-4 text-gray-600 max-w-lg text-lg font-medium leading-relaxed"
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              Take tests, join meetings, check results and review submissions — all in a secure, proctored environment.
            </motion.p>

            <div className="mt-8 flex flex-wrap gap-4">
              <button 
                onClick={() => setCurrentView("join-code")}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-3xl border border-white/30"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
                  filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
                }}
              >
                Join by Code
              </button>
              <button 
                onClick={() => router.push("/student/meeting")}
                className="px-8 py-4 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 30px 60px rgba(255, 255, 255, 0.5), 0 10px 30px rgba(251, 146, 60, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.9)',
                  filter: 'drop-shadow(0 20px 40px rgba(255, 255, 255, 0.4))'
                }}
              >
                Browse Meetings
              </button>
              <button 
                onClick={() => router.push("/student/results")}
                className="px-8 py-4 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-2xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
                style={{ 
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 30px 60px rgba(255, 255, 255, 0.5), 0 10px 30px rgba(251, 146, 60, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.9)',
                  filter: 'drop-shadow(0 20px 40px rgba(255, 255, 255, 0.4))'
                }}
              >
                Check Results
              </button>
            </div>
          </div>

          {/* Profile + quick stats */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="flex items-center gap-6 p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
            style={{ 
              boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
              filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
            }}
          >
            <button 
              onClick={() => router.push('/student/profile')}
              className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold hover:scale-110 transition-transform overflow-hidden shadow-2xl"
              style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}
            >
              {userData?.profilePic ? (
                <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                userData?.firstName ? userData.firstName.charAt(0).toUpperCase() : <User className="w-8 h-8 text-white" />
              )}
            </button>
            <div>
              <div className="text-sm text-gray-500 font-semibold" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{userData?.firstName ? `${userData.firstName} ${userData.lastName}` : 'Student Profile'}</div>
              <div className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Click to Edit</div>
              <div className="mt-1 text-xs text-gray-400 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{userData?.institutionName || 'Complete your profile'}</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Performance Overview */}
      <section className="max-w-5xl mx-auto mb-12 grid md:grid-cols-2 gap-8 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Performance Trend</h3>
          <Line data={performanceData} />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }} 
          animate={{ opacity: 1, x: 0 }} 
          className="p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl flex flex-col items-center"
          style={{ 
            boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
            filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
          }}
        >
          <h3 className="text-xl font-black text-orange-600 mb-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Attempts</h3>
          <Doughnut data={donutData} />
          <div className="mt-4 text-gray-600 text-sm font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Attempted {recentTests.length} tests</div>
        </motion.div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-5xl mx-auto mb-12">
        <h3 className="text-2xl font-black text-orange-600 mb-8" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {quickActions.map((action, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onClick={action.onClick}
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl hover:shadow-2xl transition-all duration-300 flex flex-col items-center gap-3"
              style={{ 
                boxShadow: '0 25px 50px rgba(251, 146, 60, 0.2), 0 10px 25px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                filter: 'drop-shadow(0 15px 30px rgba(251, 146, 60, 0.15))'
              }}
            >
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                <div className="text-white">{action.icon}</div>
              </div>
              <span className="text-sm font-bold text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{action.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Recent Tests */}
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

      {/* Available Tests */}
      <section className="max-w-5xl mx-auto mb-12">
        <h3 className="text-lg font-semibold mb-4">Available Tests</h3>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {availableTests.length > 0 ? availableTests.map((test: any, i) => (
            <motion.div key={i} whileHover={{ scale: 1.03 }} className="min-w-[250px] p-4 rounded-2xl bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-white/10">
              <div className="text-sm text-slate-400">{test.creator?.institutionName || 'Institution'}</div>
              <div className="mt-2 font-semibold">{test.title}</div>
              <div className="text-xs text-slate-400 mt-1">{test.questions?.length || 0} questions</div>
              <div className="mt-4">
                <Button size="sm" onClick={() => router.push(`/student/test/${test.id}`)}>Take Test</Button>
              </div>
            </motion.div>
          )) : (
            <div className="text-slate-400 text-sm">No tests available</div>
          )}
        </div>
      </section>

      {/* Upcoming Meetings */}
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