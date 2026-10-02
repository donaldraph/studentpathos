import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'https://iqs70qndul.execute-api.us-east-1.amazonaws.com/prod';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests (when Cognito is configured)
apiClient.interceptors.request.use(async (config) => {
  try {
    // TODO: Add Cognito auth after deployment
    // const session = await fetchAuthSession();
    // const token = session.tokens?.idToken?.toString();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
  } catch (error) {
    console.warn('No active session');
  }
  return config;
});

// Handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // TODO: Handle token refresh after Cognito setup
      console.warn('Authentication required');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API methods
export const verificationApi = {
  checkAccount: (email: string) =>
    apiClient.post('/verification/account', { email }),

  checkCredits: (accountId: string) =>
    apiClient.post('/verification/credits', { account_id: accountId }),

  checkProfile: (userId: string) =>
    apiClient.post('/verification/profile', { user_id: userId }),

  checkStudentStatus: (accountId: string) =>
    apiClient.post('/verification/student', { account_id: accountId })
};

export const twinApi = {
  analyzeScreenshot: (imageUrl: string) =>
    apiClient.post('/twin/screenshot', { image_url: imageUrl }),

  searchKnowledge: (query: string) =>
    apiClient.post('/twin/knowledge', { query }),

  getCommunityInsights: (timePeriod: string = '7d') =>
    apiClient.post('/twin/insights', { time_period: timePeriod }),

  getRecommendation: (userId: string) =>
    apiClient.post('/twin/recommend', { user_id: userId })
};

export const orchestrationApi = {
  runWorkflow: (userId: string) =>
    apiClient.post('/orchestration/workflow', { user_id: userId })
};
