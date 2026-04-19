const API_BASE_URL = 'http://localhost:4000';

// All requests use credentials:'include' so the browser sends the
// accessToken cookie automatically — no localStorage, no manual token reading.
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Tests
  getTests: () => fetchWithAuth('/tests'),
  getTestById: (id: number) => fetchWithAuth(`/tests/${id}`),
  createTest: (data: any) => fetchWithAuth('/tests/create', { method: 'POST', body: JSON.stringify(data) }),

  // Test taking
  getTestQuestions: (testId: number) => fetchWithAuth(`/tests/${testId}/questions`),
  submitTest: (testId: number, answers: any) =>
    fetchWithAuth(`/tests/${testId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    }),

  // Submissions
  checkSubmission: (testId: number) => fetchWithAuth(`/tests/${testId}/submission/check`),
  getSubmissionResult: (submissionId: number) => fetchWithAuth(`/tests/submission/${submissionId}/result`),

  // Results
  getStudentResults: () => fetchWithAuth('/tests/results'),
  getTestResults: (testId: number) => fetchWithAuth(`/tests/${testId}/results`),

  // Tutor specific
  getTutorTests: () => fetchWithAuth('/tests/tutor'),
  getTestStats: (testId: number) => fetchWithAuth(`/tests/${testId}/stats`),
  publishTest: (testId: number) => fetchWithAuth(`/tests/${testId}/publish`, { method: 'POST' }),
  unpublishTest: (testId: number) => fetchWithAuth(`/tests/${testId}/unpublish`, { method: 'POST' }),

  // Tutor dashboard stats (single call)
  getTutorStats: () => fetchWithAuth('/meetings/tutor/stats'),

  // Meetings
  getMeetings: () => fetchWithAuth('/meetings/visible'),
};
