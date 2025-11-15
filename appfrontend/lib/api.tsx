const API_BASE_URL = 'http://localhost:4000';

// Helper to get cookies
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Generic fetch wrapper
async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getCookie('accessToken');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// API methods
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
      body: JSON.stringify({ answers }) 
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
};