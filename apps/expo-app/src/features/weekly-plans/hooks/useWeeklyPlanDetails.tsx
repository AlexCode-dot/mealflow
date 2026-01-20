import { useCallback, useEffect, useState } from 'react';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import type { WeeklyPlan } from '@/src/features/weekly-plans/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

type UseWeeklyPlanDetailsResult = {
  plan: WeeklyPlan | null;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setPlan: (plan: WeeklyPlan | null) => void;
};

export function useWeeklyPlanDetails(planId: string | null): UseWeeklyPlanDetailsResult {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(uiErr.message);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    load();
  }, [load]);

  return { plan, isLoading, error, load, setPlan };
}
