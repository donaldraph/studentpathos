import { create } from 'zustand';
import { apiClient } from '../services/api';

interface Journey {
  user_id: string;
  account_exists: boolean;
  edu_email_verified: boolean;
  profile_exists: boolean;
  has_credits: boolean;
  verified: boolean;
  current_step: number;
  verification_status: string;
  updated_at: string;
}

interface JourneyState {
  journey: Journey | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchJourney: (userId: string) => Promise<void>;
  updateJourney: (updates: Partial<Journey>) => Promise<void>;
  runVerification: (userId: string) => Promise<void>;
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  journey: null,
  isLoading: false,
  error: null,

  fetchJourney: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.get(`/verification/journey/${userId}`);
      set({ journey: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch journey',
        isLoading: false
      });
    }
  },

  updateJourney: async (updates: Partial<Journey>) => {
    const currentJourney = get().journey;
    if (!currentJourney) return;

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.put(
        `/verification/journey/${currentJourney.user_id}`,
        updates
      );
      set({ journey: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to update journey',
        isLoading: false
      });
    }
  },

  runVerification: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Trigger verification workflow
      const response = await apiClient.post('/orchestration/workflow', {
        user_id: userId
      });

      // Update journey with results
      const { verification_results } = response.data;

      const updates: Partial<Journey> = {
        account_exists: verification_results.account?.body?.account_exists || false,
        edu_email_verified: verification_results.student_status?.body?.edu_email_verified || false,
        profile_exists: verification_results.profile?.body?.profile_exists || false,
        has_credits: verification_results.credits?.body?.has_credits || false,
        verified: verification_results.student_status?.body?.verified || false
      };

      // Determine current step (first incomplete)
      if (!updates.account_exists) updates.current_step = 1;
      else if (!updates.edu_email_verified) updates.current_step = 2;
      else if (!updates.profile_exists) updates.current_step = 3;
      else if (!updates.has_credits) updates.current_step = 4;
      else if (!updates.verified) updates.current_step = 5;
      else updates.current_step = 5; // All complete

      set({
        journey: { ...get().journey, ...updates } as Journey,
        isLoading: false
      });
    } catch (error: any) {
      set({
        error: error.message || 'Verification failed',
        isLoading: false
      });
    }
  }
}));
