import { useEffect, useCallback, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

interface AutoSaveConfig {
  interval?: number; // in milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
}

interface AutoSaveData {
  applicationId: string;
  currentStep: number;
  formData: any;
  isSubmitted?: boolean;
}

export const useApplicationAutoSave = (config: AutoSaveConfig = {}) => {
  const { user } = useAuth0();
  const { interval = 30000, enabled = true } = config;
  
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveError, setAutoSaveError] = useState<string | null>(null);

  const saveProgress = useCallback(async (data: AutoSaveData) => {
    if (!user?.sub || !enabled) return { success: false, message: 'Not authenticated or disabled' };

    setIsAutoSaving(true);
    setAutoSaveError(null);

    try {
      const searchParams = new URLSearchParams({
        auth0_user_id: user.sub
      });

      const response = await fetch(`/api/applications/save?${searchParams}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          application_id: data.applicationId,
          current_step: data.currentStep,
          form_data: data.formData,
          is_submitted: data.isSubmitted || false
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setLastSaved(new Date());
        console.log('💾 Application auto-saved successfully');
        return { success: true, message: result.message };
      } else {
        throw new Error(result.message || 'Failed to save');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAutoSaveError(errorMessage);
      console.error('❌ Auto-save failed:', errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setIsAutoSaving(false);
    }
  }, [user?.sub, enabled]);

  const loadApplication = useCallback(async (applicationId: string) => {
    if (!user?.sub) return null;

    try {
      const response = await fetch(`/api/applications/${applicationId}?auth0_user_id=${encodeURIComponent(user.sub)}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Application loaded:', data.application_id);
        return data;
      } else if (response.status === 404) {
        console.log('📝 New application - no previous progress found');
        return null;
      } else {
        throw new Error('Failed to load application');
      }
    } catch (error) {
      console.error('❌ Failed to load application:', error);
      return null;
    }
  }, [user?.sub]);

  const setupAutoSave = useCallback((data: AutoSaveData) => {
    if (!enabled) return () => {};

    const intervalId = setInterval(() => {
      saveProgress(data);
    }, interval);

    return () => clearInterval(intervalId);
  }, [enabled, interval, saveProgress]);

  return {
    saveProgress,
    loadApplication,
    setupAutoSave,
    lastSaved,
    isAutoSaving,
    autoSaveError,
    clearError: () => setAutoSaveError(null)
  };
}; 