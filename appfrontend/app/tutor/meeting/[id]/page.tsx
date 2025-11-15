"use client";
import { Brain, List } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  AlertTriangle,
  Clock,
  BarChart3,
  Eye,
  User,
  Calendar,
  Flag,
  Download,
  RefreshCw,
  Shield,
  Activity,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Meeting {
  id: string;
  title: string;
  description: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  subject: string;
  teacher: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface Participant {
  userId: string;
  name: string;
  email: string;
  status: string;
  joinedAt: string;
  leftAt?: string;
  duration: number;
  alertCount: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  riskScore: number;
  lastAlert?: string;
  flags?: {
    total: number;
    critical: number;
    high: number;
    medium: number;
  };
}

interface ProctoringAlert {
  id: string;
  alertType: string;
  description: string;
  confidence: number;
  detectedAt: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  participantId: string;
  user?: {
    fullName: string;
    email: string;
  };
}

interface CompleteReport {
  meeting: Meeting;
  participants: {
    total: number;
    joined: number;
    left: number;
    participants: Participant[];
  };
  proctoring: {
    meetingId: string;
    generatedAt: string;
    totalParticipants: number;
    totalAlerts: number;
    participantReports: Array<{
      userId: string;
      studentInfo: {
        name: string;
        email: string;
      };
      totalAlerts: number;
      alertsByType: Record<string, number>;
      riskScore: number;
      timeline: Array<{
        time: string;
        type: string;
        description: string;
        confidence: number;
        severity: string;
      }>;
    }>;
    overallSummary: {
      highRiskParticipants: number;
      mostCommonAlert: string;
      averageRiskScore: number;
    };
  };
  summary: {
    totalStudents: number;
    studentsJoined: number;
    totalAlerts: number;
    highRiskStudents: number;
    averageRiskScore: number;
    mostCommonViolation: string;
  };
  statistics?: {
    totalParticipants: number;
    totalAlerts: number;
    averageAlertsPerParticipant: number;
    riskDistribution: Record<string, number>;
    alertTypeDistribution: Record<string, number>;
    participationRate: number;
    averageSessionDuration: number;
  };
}

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [report, setReport] = useState<CompleteReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [liveAlerts, setLiveAlerts] = useState<ProctoringAlert[]>([]);

  const [quizResults, setQuizResults] = useState<any>(null);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const meetingId = params.id as string;

  const [meetingQuizzes, setMeetingQuizzes] = useState<any[]>([]);
  useEffect(() => {
    fetchMeetingReport();
    if (report?.meeting.status === "LIVE") {
      const interval = setInterval(fetchLiveAlerts, 10000); // Refresh every 10 seconds for live meetings
      return () => clearInterval(interval);
    }
  }, [meetingId, report?.meeting.status]);

  // Add these functions
  const fetchMeetingQuizzes = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/quiz/${meetingId}/quizes`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const quizzes = await response.json();
        setMeetingQuizzes(Array.isArray(quizzes) ? quizzes : [quizzes]);
      }
    } catch (error) {
      console.error("Error fetching meeting quizzes:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting quizzes",
        variant: "destructive",
      });
    }
  };

  const fetchQuizResults = async (quizId: string) => {
    try {
      const response = await fetch(
        `http://localhost:4000/quiz/results/${quizId}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const results = await response.json();
        setQuizResults(results);
        setShowQuizResults(true);
      }
    } catch (error) {
      console.error("Error fetching quiz results:", error);
      toast({
        title: "Error",
        description: "Failed to load quiz results",
        variant: "destructive",
      });
    }
  };

  const fetchMeetingReport = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:4000/proctoring/detailed-report/${meetingId}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch meeting report");
      }

      const data = await response.json();
      setReport(data);
    } catch (error) {
      console.error("Error fetching meeting report:", error);
      toast({
        title: "Error",
        description: "Failed to load meeting report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveAlerts = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/proctoring/live-alerts/${meetingId}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const alerts = await response.json();
        setLiveAlerts(alerts);
      }
    } catch (error) {
      console.error("Error fetching live alerts:", error);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchMeetingReport();
    if (report?.meeting.status === "LIVE") {
      await fetchLiveAlerts();
    }
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Report data has been updated",
    });
  };

  const exportReport = async () => {
    try {
      const response = await fetch(
        `http://localhost:4000/proctoring/report/${meetingId}`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const reportData = await response.json();
        const blob = new Blob([JSON.stringify(reportData, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `meeting-report-${meetingId}-${
          new Date().toISOString().split("T")[0]
        }.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast({
          title: "Export Successful",
          description: "Meeting report has been downloaded",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to download report",
        variant: "destructive",
      });
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "LOW":
        return "bg-green-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "HIGH":
        return "bg-orange-500";
      case "CRITICAL":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW":
        return "bg-green-500";
      case "MEDIUM":
        return "bg-yellow-500";
      case "HIGH":
        return "bg-orange-500";
      case "CRITICAL":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getAlertTypeColor = (alertType: string) => {
    const colors: Record<string, string> = {
      FACE_NOT_DETECTED: "bg-orange-500",
      MULTIPLE_FACES: "bg-red-500",
      PHONE_DETECTED: "bg-purple-500",
      TAB_SWITCH: "bg-blue-500",
      SUSPICIOUS_BEHAVIOR: "bg-yellow-500",
      COPY_PASTE: "bg-pink-500",
      WINDOW_SWITCH: "bg-indigo-500",
      NO_FACE: "bg-orange-400",
      VOICE_DETECTED: "bg-green-400",
      BACKGROUND_NOISE: "bg-gray-400",
      EYE_GAZE_DEVIATION: "bg-amber-500",
      FACE_VERIFIED: "bg-green-300",
    };
    return colors[alertType] || "bg-gray-500";
  };

  const getAlertTypeIcon = (alertType: string) => {
    const icons: Record<string, any> = {
      FACE_NOT_DETECTED: User,
      MULTIPLE_FACES: Users,
      PHONE_DETECTED: Activity,
      TAB_SWITCH: Eye,
      SUSPICIOUS_BEHAVIOR: AlertCircle,
      COPY_PASTE: Flag,
      WINDOW_SWITCH: Eye,
      NO_FACE: User,
      FACE_VERIFIED: CheckCircle,
    };
    return icons[alertType] || AlertTriangle;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading meeting report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Meeting not found</h2>
          <Button onClick={() => router.push("/tutor/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const allAlerts = report.proctoring.participantReports
    .flatMap((report) =>
      report.timeline.map((alert) => ({
        ...alert,
        studentName: report.studentInfo.name,
        studentEmail: report.studentInfo.email,
      }))
    )
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const alertTypeCounts = allAlerts.reduce((acc, alert) => {
    acc[alert.type] = (acc[alert.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push("/tutor/meeting")}
              className="border-white/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{report.meeting.title}</h1>
              <p className="text-slate-300">{report.meeting.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              className={`${
                report.meeting.status === "LIVE"
                  ? "bg-green-500"
                  : report.meeting.status === "SCHEDULED"
                  ? "bg-blue-500"
                  : "bg-gray-500"
              } text-white`}
            >
              {report.meeting.status}
            </Badge>
            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="border-white/20"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button
              onClick={exportReport}
              variant="outline"
              className="border-white/20"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Live Alerts Banner */}
        {report.meeting.status === "LIVE" && liveAlerts.length > 0 && (
          <Card className="bg-red-500/20 border-red-500/30 mb-6">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <div>
                    <h3 className="font-semibold">Live Alerts</h3>
                    <p className="text-sm text-red-300">
                      {liveAlerts.length} new alert(s) in the last 5 minutes
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-400 text-red-300 hover:bg-red-500/20"
                  onClick={() => setActiveTab("alerts")}
                >
                  View Alerts
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-5 bg-white/5 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="participants"
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Participants ({report.participants.total})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alerts ({report.summary.totalAlerts})
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Quizzes
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Participants</p>
                    <p className="text-xl font-bold">
                      {report.summary.totalStudents}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Students Joined</p>
                    <p className="text-xl font-bold">
                      {report.summary.studentsJoined}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Total Alerts</p>
                    <p className="text-xl font-bold">
                      {report.summary.totalAlerts}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">High Risk Students</p>
                    <p className="text-xl font-bold">
                      {report.summary.highRiskStudents}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Meeting Details */}
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Meeting Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Scheduled Time</span>
                    <span>{formatTime(report.meeting.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Started At</span>
                    <span>
                      {report.meeting.startedAt
                        ? formatTime(report.meeting.startedAt)
                        : "Not started"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Ended At</span>
                    <span>
                      {report.meeting.endedAt
                        ? formatTime(report.meeting.endedAt)
                        : "Not ended"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="text-gray-400">Teacher</span>
                    <span>{report.meeting.teacher.fullName}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400">Subject</span>
                    <span>{report.meeting.subject}</span>
                  </div>
                </div>
              </Card>

              {/* Risk Summary */}
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Risk Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Average Risk Score</span>
                    <Badge
                      className={`${getRiskColor(
                        report.proctoring.overallSummary.averageRiskScore > 0.7
                          ? "HIGH"
                          : report.proctoring.overallSummary.averageRiskScore >
                            0.4
                          ? "MEDIUM"
                          : "LOW"
                      )} text-white`}
                    >
                      {report.proctoring.overallSummary.averageRiskScore.toFixed(
                        2
                      )}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">
                      High Risk Participants
                    </span>
                    <span className="text-red-400 font-semibold">
                      {report.proctoring.overallSummary.highRiskParticipants}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Most Common Alert</span>
                    <Badge className="bg-white/10 text-white capitalize">
                      {report.proctoring.overallSummary.mostCommonAlert
                        .toLowerCase()
                        .replace(/_/g, " ")}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants">
            <Card className="bg-white/5 border-white/10">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">Participants</h3>
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-green-500/20 text-green-300"
                    >
                      Joined: {report.participants.joined}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="bg-gray-500/20 text-gray-300"
                    >
                      Left: {report.participants.left}
                    </Badge>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-3">Student</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Joined At</th>
                        <th className="text-left p-3">Duration</th>
                        <th className="text-left p-3">Alerts</th>
                        <th className="text-left p-3">Risk Level</th>
                        <th className="text-left p-3">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.participants.participants.map((participant) => (
                        <tr
                          key={participant.userId}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-3">
                            <div>
                              <p className="font-medium">{participant.name}</p>
                              <p className="text-sm text-gray-400">
                                {participant.email}
                              </p>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="secondary"
                              className={
                                participant.status === "JOINED"
                                  ? "bg-green-500/20 text-green-300"
                                  : participant.status === "LEFT"
                                  ? "bg-gray-500/20 text-gray-300"
                                  : "bg-yellow-500/20 text-yellow-300"
                              }
                            >
                              {participant.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm">
                            {formatTime(participant.joinedAt)}
                          </td>
                          <td className="p-3 text-sm">
                            {formatDuration(participant.duration)}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="secondary"
                              className={
                                participant.alertCount === 0
                                  ? "bg-green-500/20 text-green-300"
                                  : participant.alertCount <= 3
                                  ? "bg-yellow-500/20 text-yellow-300"
                                  : "bg-red-500/20 text-red-300"
                              }
                            >
                              {participant.alertCount} alerts
                            </Badge>
                          </td>
                          <td className="p-3">
                            <Badge
                              className={`${getRiskColor(
                                participant.riskLevel
                              )} text-white`}
                            >
                              {participant.riskLevel}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="text-sm font-mono">
                              {participant.riskScore.toFixed(2)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            {/* Alert Summary */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold mb-4">Alert Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(alertTypeCounts).map(([type, count]) => {
                  const IconComponent = getAlertTypeIcon(type);
                  return (
                    <div
                      key={type}
                      className="text-center p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center">
                        <IconComponent className="w-4 h-4 text-white" />
                      </div>
                      <Badge
                        className={`${getAlertTypeColor(
                          type
                        )} text-white mb-2 text-xs`}
                      >
                        {type.replace(/_/g, " ")}
                      </Badge>
                      <div className="text-xl font-bold">{count}</div>
                      <p className="text-xs text-gray-400">occurrences</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Detailed Alerts */}
            <Card className="bg-white/5 border-white/10">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold">All Alerts</h3>
                  <Badge variant="secondary" className="bg-white/10">
                    {allAlerts.length} total alerts
                  </Badge>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {allAlerts.map((alert, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className={`w-3 h-3 rounded-full ${getAlertTypeColor(
                            alert.type
                          )}`}
                        ></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{alert.studentName}</p>
                            <Badge
                              className={`${getSeverityColor(
                                alert.severity
                              )} text-white text-xs`}
                            >
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400">
                            {alert.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTime(alert.time)}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          alert.confidence > 0.8
                            ? "bg-red-500/20 text-red-300"
                            : alert.confidence > 0.6
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-green-500/20 text-green-300"
                        }
                      >
                        {Math.round(alert.confidence * 100)}% confidence
                      </Badge>
                    </div>
                  ))}
                  {allAlerts.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No alerts detected in this meeting</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Risk Distribution
                </h3>
                <div className="space-y-3">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
                    (level) => {
                      const count = report.participants.participants.filter(
                        (p) => p.riskLevel === level
                      ).length;
                      const percentage =
                        (count / report.participants.participants.length) * 100;
                      return (
                        <div
                          key={level}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-3 h-3 rounded-full ${getRiskColor(
                                level
                              )}`}
                            ></div>
                            <span className="capitalize">
                              {level.toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-32 bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${getRiskColor(
                                  level
                                )}`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </Card>

              {/* Participation Stats */}
              <Card className="bg-white/5 border-white/10 p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Participation Statistics
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Participants</span>
                    <span className="font-semibold">
                      {report.participants.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Active Participants</span>
                    <span className="font-semibold text-green-400">
                      {report.participants.joined}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Left Early</span>
                    <span className="font-semibold text-red-400">
                      {report.participants.left}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Participation Rate</span>
                    <span className="font-semibold">
                      {(
                        (report.participants.joined /
                          report.participants.total) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Alert Timeline */}
            <Card className="bg-white/5 border-white/10 p-6">
              <h3 className="text-xl font-semibold mb-4">Alert Timeline</h3>
              <div className="space-y-3">
                {allAlerts.slice(0, 10).map((alert, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 bg-white/5 rounded-lg"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${getAlertTypeColor(
                        alert.type
                      )}`}
                    ></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {alert.studentName}
                        </span>
                        <Badge
                          className={`${getAlertTypeColor(
                            alert.type
                          )} text-white text-xs`}
                        >
                          {alert.type.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatTime(alert.time)}
                      </p>
                    </div>
                    <Badge
                      className={`${getSeverityColor(
                        alert.severity
                      )} text-white`}
                    >
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Quizzes Tab */}
          <TabsContent value="quizzes" className="space-y-6">
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Meeting Quizzes
                </h3>
                <Button
                  onClick={fetchMeetingQuizzes}
                  variant="outline"
                  className="border-white/20"
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${
                      refreshing ? "animate-spin" : ""
                    }`}
                  />
                  Refresh
                </Button>
              </div>

              {meetingQuizzes.length > 0 ? (
                <div className="space-y-4">
                  {meetingQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="bg-white/5 border-white/20 p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-medium mb-2">
                            {quiz.question}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <Badge
                              variant="outline"
                              className="border-blue-400 text-blue-400"
                            >
                              {quiz.type}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {quiz.timeLimit}s
                            </span>
                            <Badge
                              className={
                                quiz.status === "ACTIVE"
                                  ? "bg-green-500"
                                  : quiz.status === "COMPLETED"
                                  ? "bg-blue-500"
                                  : "bg-gray-500"
                              }
                            >
                              {quiz.status}
                            </Badge>
                            <span>
                              Created:{" "}
                              {new Date(quiz.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-white/20"
                          onClick={() => fetchQuizResults(quiz.id)}
                        >
                          <List className="w-4 h-4 mr-2" />
                          Results
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No quizzes conducted in this meeting</p>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}