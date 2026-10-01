import axios from 'axios';
import { Auth } from 'aws-amplify';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.studentpathos.com';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(async (config) => {
  try {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();
    config.headers.Authorization = `Bearer ${token}`;
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
      // Token expired, try to refresh
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        const session = await Auth.currentSession();

        // Retry original request with new token
        const token = session.getIdToken().getJwtToken();
        error.config.headers.Authorization = `Bearer ${token}`;
        return apiClient.request(error.config);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
      }
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
