import { useCallback, useEffect, useState } from 'react';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import type { WeeklyPlan } from '@/src/features/weekly-plans/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

type UseWeeklyPlanDetailsResult = {
  plan: WeeklyPlan | null;
  isLoading: boolean;
  error: UiError | null;
  load: () => Promise<void>;
  setPlan: (plan: WeeklyPlan | null) => void;
  refreshQuietly: () => Promise<void>;
};

export function useWeeklyPlanDetails(planId: string | null): UseWeeklyPlanDetailsResult {
  const { showError } = useGlobalToast();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    if (!planId) {
      setPlan(null);
      setIsLoading(false);
      return;
    }
    setError(null);

    try {
      const res = await weeklyPlansApi.get(planId);
      setPlan(res);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [planId, showError]);

  useEffect(() => {
    load();
  }, [load]);

  // For background refreshes: silent on failure, and keeps the current object unless the server's
  // copy is newer — the screen derives editor drafts from the plan, and a no-op refresh must not
  // reset them under the user's fingers.
  const refreshQuietly = useCallback(async () => {
    if (!planId) return;
    const res = await weeklyPlansApi.get(planId);
    setPlan((current) =>
      current && Date.parse(res.updatedAt) <= Date.parse(current.updatedAt) ? current : res,
    );
  }, [planId]);

  return { plan, isLoading, error, load, setPlan, refreshQuietly };
}
