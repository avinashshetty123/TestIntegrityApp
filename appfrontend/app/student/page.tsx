"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { FileCheck, Video, ListChecks, User, Shield, BookOpen, BarChart3 } from "lucide-react";
import JoinByCode from "../../components/JoinByCode";
import StudentMeeting from "../../components/StudentMeeting";



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

  const [stats, setStats] = useState({
    testsCompleted: 0,
    averageScore: 0,
    meetingsAttended: 0,
    totalAlerts: 0
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
        
        // Update stats
        if (tests.length > 0) {
          const avgScore = tests.reduce((sum: number, t: any) => sum + (t.score || 0), 0) / tests.length;
          setStats(prev => ({
            ...prev,
            testsCompleted: tests.length,
            averageScore: Math.round(avgScore)
          }));
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

  if (currentView === "proctored" && selectedMeeting) {
    return (
      <StudentMeeting
        token={selectedMeeting.token}
        serverUrl={selectedMeeting.serverUrl}
        onDisconnect={handleLeaveMeeting}
        userInfo={{
          fullname: userData?.firstName ? `${userData.firstName} ${userData.lastName}` : 'Student',
          profilePic: userData?.profilePic,
          role: 'student',
          id: userData?.id
        }}
        meetingId={selectedMeeting.id}
      />
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white px-6 py-8">
      {/* HERO */}
      <section className="max-w-6xl mx-auto mb-12">
        <div className="bg-white/60 backdrop-blur-3xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <motion.h1 
                initial={{ opacity: 0, y: -20 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent mb-4"
              >
                Welcome, {userData?.firstName || 'Student'}
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }} 
                className="text-orange-700 text-lg mb-8"
              >
                Take tests, join meetings, and track your progress in a secure, AI-monitored environment.
              </motion.p>

              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => setCurrentView("join-code")}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-6 py-3 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300"
                >
                  Join by Code
                </button>
                <button 
                  onClick={() => router.push("/student/meeting")}
                  className="bg-white/80 backdrop-blur-xl border border-orange-200/50 text-orange-600 px-6 py-3 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(251,146,60,0.2)] hover:scale-105 transition-all duration-300"
                >
                  Browse Meetings
                </button>
                <button 
                  onClick={() => router.push("/student/results")}
                  className="bg-white/80 backdrop-blur-xl border border-orange-200/50 text-orange-600 px-6 py-3 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(251,146,60,0.2)] hover:scale-105 transition-all duration-300"
                >
                  View Results
                </button>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              className="flex items-center gap-4 p-6 rounded-2xl bg-white/80 backdrop-blur-xl border border-orange-200/50 shadow-[0_8px_30px_rgba(251,146,60,0.2)]"
            >
              <button 
                onClick={() => router.push('/student/profile')}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-bold hover:scale-105 transition-transform overflow-hidden shadow-[0_8px_30px_rgba(251,146,60,0.4)] text-white"
              >
                {userData?.profilePic ? (
                  <img src={userData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  userData?.firstName ? userData.firstName.charAt(0).toUpperCase() : <User className="w-6 h-6" />
                )}
              </button>
              <div>
                <div className="font-semibold text-orange-800">{userData?.firstName ? `${userData.firstName} ${userData.lastName}` : 'Student Profile'}</div>
                <div className="text-sm text-orange-600 hover:underline cursor-pointer">Edit Profile</div>
                <div className="text-xs text-orange-500">{userData?.institutionName || 'Complete your profile'}</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <section className="max-w-6xl mx-auto mb-12 grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { icon: <BookOpen className="w-6 h-6" />, label: "Tests Completed", value: stats.testsCompleted, color: "from-blue-500 to-blue-600" },
          { icon: <BarChart3 className="w-6 h-6" />, label: "Average Score", value: `${stats.averageScore}%`, color: "from-green-500 to-green-600" },
          { icon: <Video className="w-6 h-6" />, label: "Meetings Attended", value: stats.meetingsAttended, color: "from-purple-500 to-purple-600" },
          { icon: <Shield className="w-6 h-6" />, label: "Proctoring Alerts", value: stats.totalAlerts, color: "from-red-500 to-red-600" }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/60 backdrop-blur-3xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] border border-orange-200/50 hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300"
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-4 shadow-[0_8px_30px_rgba(0,0,0,0.3)]`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-orange-800">{stat.value}</div>
            <div className="text-sm text-orange-600">{stat.label}</div>
          </motion.div>
        ))}
      </section>

      {/* Quick Actions */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-orange-800 mb-6">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, i) => (
            <motion.button
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }}
              onClick={action.onClick}
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] transition-all duration-300 flex flex-col items-center gap-3"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white shadow-[0_8px_30px_rgba(251,146,60,0.4)]">
                {action.icon}
              </div>
              <span className="text-sm font-semibold text-orange-700">{action.label}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* Recent Tests */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-orange-800 mb-6">Recent Tests</h3>
        <div className="grid gap-4">
          {recentTests.length > 0 ? recentTests.map((test: any, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: i * 0.1 }}
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] hover:scale-105 transition-all duration-300"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-orange-800">{test.testTitle || 'Test'}</div>
                  <div className="text-sm text-orange-600">
                    {test.score ? `Score: ${test.score}%` : 'Pending review'} • 
                    {new Date(test.submittedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-xs font-semibold shadow-[0_4px_15px_rgba(0,0,0,0.2)] ${
                  test.score >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                  test.score >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                  test.score ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                }`}>
                  {test.score ? `${test.score}%` : 'Pending'}
                </div>
              </div>
            </motion.div>
          )) : (
            <div className="text-center py-12 bg-white/60 backdrop-blur-3xl rounded-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3)]">
              <p className="text-orange-600">No tests taken yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Available Tests */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-orange-800 mb-6">Available Tests</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTests.length > 0 ? availableTests.map((test: any, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }} 
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] transition-all duration-300"
            >
              <div className="text-sm text-orange-600 font-medium mb-2">{test.creator?.institutionName || 'Institution'}</div>
              <div className="font-bold text-orange-800 mb-2">{test.title}</div>
              <div className="text-sm text-orange-600 mb-4">{test.questions?.length || 0} questions</div>
              <button 
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(251,146,60,0.4)] hover:shadow-[0_12px_40px_rgba(251,146,60,0.5)] hover:scale-105 transition-all duration-300" 
                onClick={() => router.push(`/student/tests/${test.id}`)}
              >
                Take Test
              </button>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-12 bg-white/60 backdrop-blur-3xl rounded-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3)]">
              <p className="text-orange-600">No tests available</p>
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Meetings */}
      <section className="max-w-6xl mx-auto mb-12">
        <h3 className="text-2xl font-bold text-orange-800 mb-6">Upcoming Meetings</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingMeetings.length > 0 ? upcomingMeetings.map((meeting: any, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.1 }}
              whileHover={{ scale: 1.05 }} 
              className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3),inset_0_1px_0_rgba(255,255,255,0.6)] hover:shadow-[0_25px_60px_rgba(251,146,60,0.4)] transition-all duration-300"
            >
              <div className="text-sm text-orange-600 font-medium mb-2">{meeting.institution || 'Institution'}</div>
              <div className="font-bold text-orange-800 mb-2">{meeting.title}</div>
              <div className="text-sm text-orange-600 mb-4">{new Date(meeting.scheduledAt).toLocaleString()}</div>
              <div className="flex gap-2">
                <button 
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-2 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(34,197,94,0.4)] hover:shadow-[0_12px_40px_rgba(34,197,94,0.5)] hover:scale-105 transition-all duration-300"
                  onClick={async () => {
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
                  }}
                >
                  Join
                </button>
                <button className="flex-1 bg-white/80 backdrop-blur-xl border border-orange-200/50 text-orange-600 py-2 rounded-2xl font-semibold shadow-[0_8px_30px_rgba(251,146,60,0.2)] hover:scale-105 transition-all duration-300">Details</button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full text-center py-12 bg-white/60 backdrop-blur-3xl rounded-3xl border border-orange-200/50 shadow-[0_20px_50px_rgba(251,146,60,0.3)]">
              <p className="text-orange-600">No upcoming meetings</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}