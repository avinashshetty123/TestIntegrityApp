"use client";

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
  Brain,
  List,
  FileText,
  Zap
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
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  status: "SCHEDULED" | "LIVE" | "ENDED";
  subject: string;
  teacher?: {
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
  participantId?: string;
  participant?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
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

  const meetingId = params.id as string;

  useEffect(() => {
    fetchMeetingReport();
    if (report?.meeting.status === "LIVE") {
      const interval = setInterval(fetchLiveAlerts, 10000);
      return () => clearInterval(interval);
    }
  }, [meetingId, report?.meeting.status]);

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
        `http://localhost:4000/meetings/${meetingId}/alerts-detailed`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const alerts = await response.json();
        setLiveAlerts(alerts.slice(0, 10));
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
    if (!dateString) return "N/A";
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
        return "text-green-600 bg-green-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "HIGH":
        return "text-orange-600 bg-orange-100";
      case "CRITICAL":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW":
        return "text-green-600 bg-green-100";
      case "MEDIUM":
        return "text-yellow-600 bg-yellow-100";
      case "HIGH":
        return "text-orange-600 bg-orange-100";
      case "CRITICAL":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading meeting report...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Not Found</h2>
          <p className="text-gray-600 mb-4">Unable to load the meeting report.</p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              onClick={() => router.back()}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {report.meeting.title}
              </h1>
              <p className="text-gray-500">Meeting Analytics & Proctoring Report</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={refreshData}
              variant="outline"
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={exportReport} size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Badge
                variant={report.meeting.status === "LIVE" ? "default" : "secondary"}
                className="px-3 py-1"
              >
                {report.meeting.status}
              </Badge>
              <div className="text-sm text-gray-600">
                <span className="font-medium">Started:</span> {formatTime(report.meeting.startedAt || "")}
              </div>
              {report.meeting.endedAt && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Ended:</span> {formatTime(report.meeting.endedAt)}
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {formatTime(new Date().toISOString())}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Students</p>
                <p className="text-3xl font-bold text-gray-900">{report.summary.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                <p className="text-3xl font-bold text-gray-900">{report.summary.totalAlerts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">High Risk Students</p>
                <p className="text-3xl font-bold text-gray-900">{report.summary.highRiskStudents}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Risk Score</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(report.summary.averageRiskScore * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Participants</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <Brain className="w-4 h-4" />
              <span>Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Meeting Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subject:</span>
                    <span className="font-medium">{report.meeting.subject}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {report.statistics ? formatDuration(report.statistics.averageSessionDuration) : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Participation Rate:</span>
                    <span className="font-medium">
                      {report.statistics ? `${report.statistics.participationRate}%` : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Most Common Violation:</span>
                    <span className="font-medium">{report.summary.mostCommonViolation}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
                {report.statistics && (
                  <div className="space-y-3">
                    {Object.entries(report.statistics.riskDistribution).map(([level, count]) => (
                      <div key={level} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${getRiskColor(level).split(' ')[1]}`}></div>
                          <span className="text-sm font-medium">{level}</span>
                        </div>
                        <span className="text-sm text-gray-600">{count} students</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Alert Types Distribution */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Types Distribution</h3>
              {report.statistics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(report.statistics.alertTypeDistribution).map(([type, count]) => (
                    <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-sm text-gray-600 capitalize">{type.replace('_', ' ')}</div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Participant Details</h3>
                <Badge variant="outline">{report.participants.total} Total</Badge>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alerts
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Alert
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {report.participants.participants.map((participant) => (
                      <tr key={participant.userId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {participant.name}
                            </div>
                            <div className="text-sm text-gray-500">{participant.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={participant.status === "JOINED" ? "default" : "secondary"}
                          >
                            {participant.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatDuration(participant.duration)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-900">
                              {participant.alertCount}
                            </span>
                            {participant.flags && (
                              <div className="flex space-x-1">
                                {participant.flags.critical > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {participant.flags.critical}C
                                  </Badge>
                                )}
                                {participant.flags.high > 0 && (
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                    {participant.flags.high}H
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={getRiskColor(participant.riskLevel)}>
                            {participant.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {participant.lastAlert ? formatTime(participant.lastAlert) : "None"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
                <Badge variant="outline">{report.summary.totalAlerts} Total</Badge>
              </div>

              <div className="space-y-4">
                {report.proctoring.participantReports.map((participant) =>
                  participant.timeline.slice(0, 5).map((alert, index) => (
                    <div
                      key={`${participant.userId}-${index}`}
                      className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-shrink-0">
                        <div className={`w-3 h-3 rounded-full mt-2 ${getSeverityColor(alert.severity).split(' ')[1]}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {participant.studentInfo.name}
                          </p>
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span>{formatTime(alert.time)}</span>
                          <span>Confidence: {(alert.confidence * 100).toFixed(0)}%</span>
                          <span className="capitalize">{alert.type.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Alerts per Student</span>
                    <span className="font-medium">
                      {report.statistics ? report.statistics.averageAlertsPerParticipant.toFixed(1) : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Session Completion Rate</span>
                    <span className="font-medium">
                      {((report.participants.left / report.participants.total) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average Risk Score</span>
                    <span className="font-medium">
                      {(report.summary.averageRiskScore * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Violations</h3>
                <div className="space-y-3">
                  {report.statistics && Object.entries(report.statistics.alertTypeDistribution)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">
                          {type.replace('_', ' ')}
                        </span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                </div>
              </Card>
            </div>

            {/* Detailed Participant Analysis */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Participant Analysis</h3>
              <div className="space-y-4">
                {report.proctoring.participantReports.map((participant) => (
                  <div key={participant.userId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{participant.studentInfo.name}</h4>
                        <p className="text-sm text-gray-500">{participant.studentInfo.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          Risk Score: {(participant.riskScore * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-gray-500">
                          {participant.totalAlerts} alerts
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(participant.alertsByType).map(([type, count]) => (
                        <div key={type} className="text-center p-2 bg-gray-50 rounded">
                          <div className="text-lg font-semibold text-gray-900">{count}</div>
                          <div className="text-xs text-gray-600 capitalize">
                            {type.replace('_', ' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}