"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  Award,
  FileText,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface Submission {
  id: number;
  student: {
    id: string;
    fullName: string;
    email: string;
  };
  submittedAt: string;
  score: number;
  evaluated: boolean;
  answers: Answer[];
  totalScore: number;
  result?: Result;
  violations: number;
}

interface Answer {
  id: number;
  questionId: number;
  response: string[];
  score: number;
  question: Question;
}

interface Question {
  id: number;
  questionText: string;
  type: string;
  marks: number;
  correctAnswers?: string[];
  options?: string[];
}

interface Result {
  id: number;
  totalScore: number;
  percentage: number;
  passed: boolean;
  scores: Record<string, number>;
  feedbacks: Record<string, string>;
  overallFeedback: string;
  gradedAt: string;
}

export default function SubmissionsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(null);
  const [editingScores, setEditingScores] = useState<{ [key: number]: number }>({});
  const [editingFeedbacks, setEditingFeedbacks] = useState<{ [key: number]: string }>({});
  const [overallFeedbacks, setOverallFeedbacks] = useState<{ [key: number]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    fetchSubmissions();
  }, [id]);

  async function fetchSubmissions() {
    try {
      const res = await fetch(`http://localhost:4000/tests/${id}/submissions`, {
        credentials: "include",
      });
      const data = await res.json();
      setSubmissions(data);
    } catch (error) {
      console.error("Error fetching submissions:", error);
    }
  }

  const handleExpandSubmission = (submissionId: number) => {
    if (expandedSubmission === submissionId) {
      setExpandedSubmission(null);
    } else {
      setExpandedSubmission(submissionId);
      setEditingScores({});
      setEditingFeedbacks({});

      const submission = submissions.find((s) => s.id === submissionId);
      if (submission?.result?.overallFeedback) {
        setOverallFeedbacks((prev) => ({
          ...prev,
          [submissionId]: submission.result?.overallFeedback || "Test Given",
        }));
      }
    }
  };

  const handleScoreChange = (answerId: number, score: number, maxMarks: number) => {
    const clampedScore = Math.max(0, Math.min(score, maxMarks));
    setEditingScores((prev) => ({
      ...prev,
      [answerId]: clampedScore,
    }));
  };

  const handleFeedbackChange = (answerId: number, feedback: string) => {
    setEditingFeedbacks((prev) => ({
      ...prev,
      [answerId]: feedback,
    }));
  };

  const handleOverallFeedbackChange = (submissionId: number, feedback: string) => {
    setOverallFeedbacks((prev) => ({
      ...prev,
      [submissionId]: feedback,
    }));
  };

  const handleDeleteSubmission = async (submissionId: number) => {
    if (!window.confirm("Are you sure you want to delete this submission? This action cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/tests/submission/${submissionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        await fetchSubmissions();
        alert("Submission deleted successfully!");

        if (expandedSubmission === submissionId) {
          setExpandedSubmission(null);
          setEditingScores({});
          setEditingFeedbacks({});
          setOverallFeedbacks((prev) => {
            const newState = { ...prev };
            delete newState[submissionId];
            return newState;
          });
        }
      } else {
        throw new Error("Failed to delete submission");
      }
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Failed to delete submission");
    }
  };

  const handleSaveScores = async (submissionId: number) => {
    setIsSaving(true);
    try {
      const submission = submissions.find((s) => s.id === submissionId);
      if (!submission) return;

      const updatedScores = Object.entries(editingScores).map(([answerId, score]) => ({
        answerId: parseInt(answerId),
        score: score,
        feedback: editingFeedbacks[parseInt(answerId)] || "",
      }));

      const requestBody = {
        updatedScores,
        overallFeedback: overallFeedbacks[submissionId] || submission.result?.overallFeedback || "",
      };

      const res = await fetch(`http://localhost:4000/tests/submission/${submissionId}/grade`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        await fetchSubmissions();
        setEditingScores({});
        setEditingFeedbacks({});
        setOverallFeedbacks((prev) => {
          const newState = { ...prev };
          delete newState[submissionId];
          return newState;
        });
        setExpandedSubmission(null);
        alert("Scores and feedback updated successfully!");
      } else {
        const errorText = await res.text();
        throw new Error(`Failed to update scores: ${res.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      alert("Failed to update scores. Please check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoGrade = async (submissionId?: number) => {
    try {
      let url = `http://localhost:4000/tests/${id}/auto-grade-all`;
      if (submissionId) {
        url = `http://localhost:4000/tests/submission/${submissionId}/auto-grade`;
      }

      const res = await fetch(url, {
        method: "PATCH",
        credentials: "include",
      });

      if (res.ok) {
        await fetchSubmissions();
        alert(submissionId ? "Submission auto-graded!" : "All submissions auto-graded!");
      }
    } catch (error) {
      console.error("Error during auto-grading:", error);
      alert("Failed to auto-grade");
    }
  };

  const calculateTotalPossibleMarks = (submission: Submission) => {
    return submission.answers.reduce((sum, answer) => sum + answer.question.marks, 0);
  };

  const calculatePercentage = (score: number, total: number) => {
    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const getPassStatus = (submission: Submission) => {
    if (!submission.result) return null;
    return submission.result.passed;
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (activeTab === "all") return true;
    if (activeTab === "evaluated") return submission.evaluated;
    if (activeTab === "pending") return !submission.evaluated;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-100 to-white text-gray-800 p-6" style={{ backdropFilter: 'blur(30px)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        <button 
          onClick={() => router.back()}
          className="mb-6 px-6 py-3 bg-white/60 backdrop-blur-3xl text-orange-600 font-bold rounded-xl shadow-2xl hover:shadow-white/80 hover:scale-110 transition-all duration-300 border border-orange-200/60"
          style={{ 
            fontFamily: 'Inter, system-ui, sans-serif',
            boxShadow: '0 20px 40px rgba(255, 255, 255, 0.4), 0 5px 15px rgba(251, 146, 60, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
          }}
        >
          Back to Test
        </button>

        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 drop-shadow-2xl"
              style={{ fontFamily: 'Inter, system-ui, sans-serif', textShadow: '0 8px 32px rgba(251, 146, 60, 0.3)' }}>
            Test Submissions
          </h1>
          <button
            onClick={() => handleAutoGrade()}
            className="px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-orange-500/70 hover:scale-110 transition-all duration-300 backdrop-blur-3xl border border-white/30"
            style={{ 
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: '0 30px 60px rgba(251, 146, 60, 0.6), 0 10px 30px rgba(251, 146, 60, 0.4), inset 0 2px 0 rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 20px 40px rgba(251, 146, 60, 0.3))'
            }}
          >
            Auto Grade All
          </button>
        </div>

        <div className="flex gap-2 p-2 rounded-2xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-lg" style={{ boxShadow: '0 10px 25px rgba(251, 146, 60, 0.1)' }}>
          {[{id: 'all', label: 'All'}, {id: 'evaluated', label: 'Evaluated'}, {id: 'pending', label: 'Pending'}].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg'
                  : 'text-orange-600 hover:bg-orange-50'
              }`}
              style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredSubmissions.length === 0 ? (
            <div className="text-center py-12 p-8 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
                 style={{ 
                   boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                   filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
                 }}>
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>No submissions found</p>
            </div>
          ) : (
            filteredSubmissions.map((submission) => (
              <div key={submission.id} className="p-6 rounded-3xl bg-white/60 backdrop-blur-3xl border border-orange-200/60 shadow-2xl"
                   style={{ 
                     boxShadow: '0 40px 80px rgba(251, 146, 60, 0.25), 0 15px 40px rgba(251, 146, 60, 0.15), inset 0 2px 0 rgba(255, 255, 255, 0.95)',
                     filter: 'drop-shadow(0 25px 50px rgba(251, 146, 60, 0.2))'
                   }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-2xl" style={{ boxShadow: '0 15px 30px rgba(251, 146, 60, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {submission.student.fullName}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {submission.student.email}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span className="text-xs text-gray-500 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {new Date(submission.submittedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-orange-500" />
                        <span className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                          {submission.result?.totalScore || submission.score || 0}/{calculateTotalPossibleMarks(submission)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {calculatePercentage(submission.result?.totalScore || submission.score || 0, calculateTotalPossibleMarks(submission))}%
                      </div>
                    </div>

                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      submission.evaluated
                        ? getPassStatus(submission)
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                      {submission.evaluated
                        ? getPassStatus(submission)
                          ? 'Passed'
                          : 'Failed'
                        : 'Pending'}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExpandSubmission(submission.id)}
                        className="px-4 py-2 bg-white/60 backdrop-blur-xl text-orange-600 font-bold rounded-lg shadow-lg hover:shadow-white/50 hover:scale-105 transition-all duration-300 border border-orange-200/50"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        {expandedSubmission === submission.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteSubmission(submission.id)}
                        className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg shadow-lg hover:shadow-red-500/25 hover:scale-105 transition-all duration-300"
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {expandedSubmission === submission.id && (
                  <div className="mt-6 space-y-6 p-6 rounded-2xl bg-orange-50/50 border border-orange-200/30">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-black text-orange-600" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Detailed Review</h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAutoGrade(submission.id)}
                          className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                        >
                          Auto Grade
                        </button>
                        <button
                          onClick={() => handleSaveScores(submission.id)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-all duration-300 disabled:opacity-50"
                          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                        >
                          {isSaving ? 'Saving...' : 'Save Grades'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {submission.answers.map((answer, index) => (
                        <div key={answer.id} className="p-4 rounded-xl bg-white/80 border border-orange-200/50 shadow-lg">
                          <div className="mb-3">
                            <h5 className="font-bold text-gray-800 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                              Question {index + 1}: {answer.question.questionText}
                            </h5>
                            <div className="text-sm text-gray-600 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                              Type: {answer.question.type} | Max Marks: {answer.question.marks}
                            </div>
                          </div>

                          <div className="mb-3">
                            <label className="block text-sm font-bold text-gray-700 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Student Answer:</label>
                            <div className="p-3 bg-gray-50 rounded-lg border">
                              <p className="text-gray-800 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                {Array.isArray(answer.response) ? answer.response.join(', ') : answer.response}
                              </p>
                            </div>
                          </div>

                          {answer.question.correctAnswers && (
                            <div className="mb-3">
                              <label className="block text-sm font-bold text-green-700 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Correct Answer(s):</label>
                              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-green-800 font-medium" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                                  {answer.question.correctAnswers.join(', ')}
                                </p>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-bold text-orange-600 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Score:</label>
                              <input
                                type="number"
                                min="0"
                                max={answer.question.marks}
                                value={editingScores[answer.id] ?? answer.score ?? 0}
                                onChange={(e) => handleScoreChange(answer.id, parseFloat(e.target.value) || 0, answer.question.marks)}
                                className="w-full px-3 py-2 bg-white/80 border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium"
                                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-orange-600 mb-1" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Feedback:</label>
                              <textarea
                                value={editingFeedbacks[answer.id] ?? (submission.result?.feedbacks?.[answer.id] || '')}
                                onChange={(e) => handleFeedbackChange(answer.id, e.target.value)}
                                className="w-full px-3 py-2 bg-white/80 border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none"
                                rows={2}
                                placeholder="Add feedback for this answer..."
                                style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-white/80 border border-orange-200/50 shadow-lg">
                      <label className="block text-sm font-bold text-orange-600 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Overall Feedback:</label>
                      <textarea
                        value={overallFeedbacks[submission.id] ?? (submission.result?.overallFeedback || '')}
                        onChange={(e) => handleOverallFeedbackChange(submission.id, e.target.value)}
                        className="w-full px-4 py-3 bg-white/80 border border-orange-200/50 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 font-medium resize-none"
                        rows={3}
                        placeholder="Add overall feedback for this submission..."
                        style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}