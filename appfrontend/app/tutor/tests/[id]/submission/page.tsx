"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [expandedSubmission, setExpandedSubmission] = useState<number | null>(
    null
  );
  const [editingScores, setEditingScores] = useState<{ [key: number]: number }>(
    {}
  );
  const [editingFeedbacks, setEditingFeedbacks] = useState<{
    [key: number]: string;
  }>({});
  const [overallFeedbacks, setOverallFeedbacks] = useState<{
    [key: number]: string;
  }>({});
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
      // Reset editing states when expanding a new submission
      setEditingScores({});
      setEditingFeedbacks({});

      // Pre-fill overall feedback if result exists
      const submission = submissions.find((s) => s.id === submissionId);
      if (submission?.result?.overallFeedback) {
        setOverallFeedbacks((prev) => ({
          ...prev,

          [submissionId]: submission.result?.overallFeedback || "Test Given",
        }));
      }
    }
  };

  const handleScoreChange = (
    answerId: number,
    score: number,
    maxMarks: number
  ) => {
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

  const handleOverallFeedbackChange = (
    submissionId: number,
    feedback: string
  ) => {
    setOverallFeedbacks((prev) => ({
      ...prev,
      [submissionId]: feedback,
    }));
  };
  const handleDeleteSubmission = async (submissionId: number) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this submission? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:4000/tests/submission/${submissionId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (res.ok) {
        await fetchSubmissions();
        alert("Submission deleted successfully!");

        // If the deleted submission was expanded, collapse it
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

      const updatedScores = Object.entries(editingScores).map(
        ([answerId, score]) => ({
          answerId: parseInt(answerId),
          score: score,
          feedback: editingFeedbacks[parseInt(answerId)] || "",
        })
      );

      // ✅ Send everything in one request as backend expects
      const requestBody = {
        updatedScores,
        overallFeedback:
          overallFeedbacks[submissionId] ||
          submission.result?.overallFeedback ||
          "",
      };

      console.log("Sending update request:", requestBody);

      const res = await fetch(
        `http://localhost:4000/tests/submission/${submissionId}/grade`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(requestBody),
        }
      );

      if (res.ok) {
        await fetchSubmissions();

        // Reset editing state
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
        console.error("Server error:", errorText);
        throw new Error(`Failed to update scores: ${res.status} ${errorText}`);
      }
    } catch (error) {
      console.error("Error saving scores:", error);
      alert("Failed to update scores. Please check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Separate function for overall feedback if needed
  const updateOverallFeedback = async (
    submissionId: number,
    feedback: string
  ) => {
    try {
      const res = await fetch(
        `http://localhost:4000/tests/submission/${submissionId}/feedback`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ overallFeedback: feedback }),
        }
      );
      return res.ok;
    } catch (error) {
      console.error("Error updating overall feedback:", error);
      return false;
    }
  };

  const handleAutoGrade = async (submissionId?: number) => {
    try {
      let url = `http://localhost:4000/tests/${id}/auto-grade-all`;
      if (submissionId) {
        url = `http://localhost:4000/tests/submission/${submissionId}/auto-grade`;
      }

      const res = await fetch(url, {
        method: submissionId ? "PATCH" : "PATCH",
        credentials: "include",
      });

      if (res.ok) {
        await fetchSubmissions();
        alert(
          submissionId
            ? "Submission auto-graded!"
            : "All submissions auto-graded!"
        );
      }
    } catch (error) {
      console.error("Error during auto-grading:", error);
      alert("Failed to auto-grade");
    }
  };

  const calculateTotalPossibleMarks = (submission: Submission) => {
    return submission.answers.reduce(
      (sum, answer) => sum + answer.question.marks,
      0
    );
  };

  const calculatePercentage = (score: number, total: number) => {
    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const getPassStatus = (submission: Submission) => {
    if (!submission.result) return null;
    return submission.result.passed;
  };

const filteredSubmissions = submissions.filter(submission => {
  if (activeTab === "evaluated") return submission.evaluated;
  if (activeTab === "pending") return !submission.evaluated;
  if (activeTab === "violations") return submission.violations > 0; // ✅ Add this
  return true;
});
  const getAnswerStatus = (answer: Answer) => {
    if (!answer.score && answer.score !== 0) return "ungraded";
    const maxMarks = answer.question.marks;
    if (answer.score === maxMarks) return "correct";
    if (answer.score > 0) return "partial";
    return "incorrect";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "correct":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "partial":
        return <Award className="w-4 h-4 text-yellow-500" />;
      case "incorrect":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen p-8 space-y-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Check Papers</h1>
          <p className="text-gray-600 mt-2">
            Evaluate student submissions and provide feedback
          </p>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => handleAutoGrade()}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Auto Grade All
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Test
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {" "}
        {/* ✅ Changed to 5 columns */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Submissions</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Evaluated</p>
                <p className="text-2xl font-bold text-green-600">
                  {submissions.filter((s) => s.evaluated).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {submissions.filter((s) => !s.evaluated).length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-purple-600">
                  {submissions.length > 0
                    ? Math.round(
                        submissions.reduce(
                          (acc, s) => acc + (s.score || 0),
                          0
                        ) / submissions.length
                      )
                    : 0}
                  %
                </p>
              </div>
              <Award className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        {/* ✅ Add Violations Statistics Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Violations</p>
                <p className="text-2xl font-bold text-red-600">
                  {submissions.reduce((acc, s) => acc + (s.violations || 0), 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Student Submissions</CardTitle>
            {/* Tabs Section - Add Violations Filter */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">
                  All ({submissions.length})
                </TabsTrigger>
                <TabsTrigger value="evaluated">
                  Evaluated ({submissions.filter((s) => s.evaluated).length})
                </TabsTrigger>
                <TabsTrigger value="pending">
                  Pending ({submissions.filter((s) => !s.evaluated).length})
                </TabsTrigger>
                {/* ✅ Add Violations Filter */}
                <TabsTrigger value="violations">
                  Violations (
                  {submissions.filter((s) => s.violations > 0).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredSubmissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="border rounded-lg overflow-hidden bg-white"
                >
                  {/* Submission Header */}
                  {/* Submission Header */}
                  <div className="flex justify-between items-center p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-semibold">
                            {submission.student.fullName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {submission.student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(submission.submittedAt).toLocaleString()}
                        </div>

                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4" />
                          Score:{" "}
                          <span className="font-semibold">
                            {submission.score ?? 0}
                          </span>{" "}
                          / {calculateTotalPossibleMarks(submission)}(
                          {calculatePercentage(
                            submission.score || 0,
                            calculateTotalPossibleMarks(submission)
                          )}
                          %)
                        </div>

                        {/* ✅ Add Violations Display */}
                        {submission.violations > 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                            <span className="font-semibold text-red-600">
                              Violations: {submission.violations}
                            </span>
                          </div>
                        )}

                        {submission.result && (
                          <Badge
                            variant={
                              submission.result.passed ? "default" : "secondary"
                            }
                            className={
                              submission.result.passed
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {submission.result.passed ? "Passed" : "Failed"}
                          </Badge>
                        )}

                        <Badge
                          variant={submission.evaluated ? "default" : "outline"}
                          className={
                            submission.evaluated
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {submission.evaluated ? "Evaluated" : "Pending"}
                        </Badge>
                      </div>
                    </div>

                    {/* In the submission header buttons section */}
                    <div className="space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoGrade(submission.id)}
                        disabled={submission.evaluated}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Auto Grade
                      </Button>
                      <Button
                        variant={
                          expandedSubmission === submission.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => handleExpandSubmission(submission.id)}
                      >
                        {expandedSubmission === submission.id ? (
                          <EyeOff className="w-4 h-4 mr-1" />
                        ) : (
                          <Eye className="w-4 h-4 mr-1" />
                        )}
                        {expandedSubmission === submission.id
                          ? "Collapse"
                          : "Evaluate"}
                      </Button>
                      {/* ✅ Add Delete Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteSubmission(submission.id)}
                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {/* Expanded Content */}
                  {expandedSubmission === submission.id && (
                    <div className="p-6 bg-gray-50 border-t">
                      <div className="space-y-6">
                        {/* ✅ Add Violations Alert Section */}
                        {submission.violations > 0 && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className="h-5 w-5 text-red-600" />
                              <h3 className="font-semibold text-red-800">
                                Test Integrity Alert
                              </h3>
                            </div>
                            <div className="text-red-700">
                              <p className="mb-2">
                                This submission recorded{" "}
                                <strong>
                                  {submission.violations} violation(s)
                                </strong>{" "}
                                during the test.
                              </p>
                              <div className="text-sm">
                                <p>Possible violations include:</p>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>Tab/window switching</li>
                                  <li>Copy-paste attempts</li>
                                  <li>Right-click attempts</li>
                                  <li>Developer tools access</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall Feedback */}
                        <div className="p-4 bg-white rounded-lg border">
                          <Label
                            htmlFor={`overall-feedback-${submission.id}`}
                            className="text-lg font-semibold"
                          >
                            Overall Feedback
                          </Label>
                          <Textarea
                            id={`overall-feedback-${submission.id}`}
                            placeholder="Provide overall feedback for the student..."
                            value={
                              overallFeedbacks[submission.id] ||
                              submission.result?.overallFeedback ||
                              ""
                            }
                            onChange={(e) =>
                              handleOverallFeedbackChange(
                                submission.id,
                                e.target.value
                              )
                            }
                            className="mt-2 min-h-[100px]"
                          />
                        </div>

                        {/* Answers */}
                        {submission.answers.map((answer) => {
                          const status = getAnswerStatus(answer);
                          const currentScore =
                            editingScores[answer.id] ?? answer.score ?? 0;

                          return (
                            <div
                              key={answer.id}
                              className="p-4 bg-white rounded-lg border"
                            >
                              <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 mt-1">
                                  {getStatusIcon(status)}
                                </div>

                                <div className="flex-1 space-y-4">
                                  {/* Question Header */}
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h3 className="font-semibold text-lg">
                                        {answer.question.questionText}
                                      </h3>
                                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                        <span>
                                          Type: {answer.question.type}
                                        </span>
                                        <span>
                                          Max Marks: {answer.question.marks}
                                        </span>
                                        <Badge variant="outline">
                                          Status: {status}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Student's Answer */}
                                  <div>
                                    <Label className="text-sm font-medium">
                                      Student's Answer:
                                    </Label>
                                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                                      {Array.isArray(answer.response) &&
                                      answer.response.length > 0 ? (
                                        answer.response.join(", ")
                                      ) : (
                                        <span className="text-gray-500 italic">
                                          No answer provided
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Correct Answers (for reference) */}
                                  {(answer.question.type === "MCQ" ||
                                    answer.question.type === "TRUE_FALSE" ||
                                    answer.question.type === "SHORT") &&
                                    answer.question.correctAnswers && (
                                      <div>
                                        <Label className="text-sm font-medium text-green-700">
                                          Correct Answer(s):
                                        </Label>
                                        <div className="mt-1 p-2 bg-green-50 rounded border text-green-700">
                                          {answer.question.correctAnswers.join(
                                            ", "
                                          )}
                                        </div>
                                      </div>
                                    )}

                                  {/* Grading Section */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <Label htmlFor={`score-${answer.id}`}>
                                        Score
                                      </Label>
                                      <Input
                                        id={`score-${answer.id}`}
                                        type="number"
                                        min="0"
                                        max={answer.question.marks}
                                        value={currentScore}
                                        onChange={(e) =>
                                          handleScoreChange(
                                            answer.id,
                                            parseInt(e.target.value) || 0,
                                            answer.question.marks
                                          )
                                        }
                                        className="mt-1"
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Max: {answer.question.marks} | Current:{" "}
                                        {currentScore}
                                      </p>
                                    </div>

                                    <div>
                                      <Label htmlFor={`feedback-${answer.id}`}>
                                        Individual Feedback
                                      </Label>
                                      <Textarea
                                        id={`feedback-${answer.id}`}
                                        placeholder="Provide specific feedback for this answer..."
                                        value={
                                          editingFeedbacks[answer.id] ||
                                          submission.result?.feedbacks?.[
                                            answer.questionId
                                          ] ||
                                          ""
                                        }
                                        onChange={(e) =>
                                          handleFeedbackChange(
                                            answer.id,
                                            e.target.value
                                          )
                                        }
                                        className="mt-1 min-h-[80px]"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-4 border-t">
                          <div className="text-sm text-gray-600">
                            Total Score:{" "}
                            {Object.values(editingScores).reduce(
                              (sum, score) => sum + score,
                              submission.score || 0
                            )}{" "}
                            / {calculateTotalPossibleMarks(submission)}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => setExpandedSubmission(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => handleSaveScores(submission.id)}
                              disabled={isSaving}
                              className="flex items-center gap-2"
                            >
                              <Save className="w-4 h-4" />
                              {isSaving ? "Saving..." : "Save Evaluation"}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
