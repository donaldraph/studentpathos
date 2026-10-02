import { create } from 'zustand';
import { apiClient } from '../services/api';

interface Journey {
  user_id: string;
  // New journey fields matching correct AWS Builder flow
  builder_profile_created: boolean;
  student_verified: boolean;
  skillbuilder_claimed: boolean;
  console_account_created: boolean;
  fully_onboarded: boolean;
  current_step: number;
  verification_status: string;
  updated_at: string;
  // Legacy fields for backward compatibility
  account_exists?: boolean;
  edu_email_verified?: boolean;
  profile_exists?: boolean;
  has_credits?: boolean;
  verified?: boolean;
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
        builder_profile_created: verification_results.builder_profile?.body?.created || false,
        student_verified: verification_results.student_status?.body?.verified || false,
        skillbuilder_claimed: verification_results.skillbuilder?.body?.claimed || false,
        console_account_created: verification_results.console_account?.body?.exists || false,
        fully_onboarded: verification_results.student_status?.body?.fully_onboarded || false
      };

      // Determine current step (first incomplete)
      if (!updates.builder_profile_created) updates.current_step = 1;
      else if (!updates.student_verified) updates.current_step = 2;
      else if (!updates.skillbuilder_claimed) updates.current_step = 3;
      else if (!updates.console_account_created) updates.current_step = 4;
      else if (!updates.fully_onboarded) updates.current_step = 5;
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
