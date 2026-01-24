import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import type { WeeklyPlanListItem } from '@/src/features/weekly-plans/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

type UseWeeklyPlansListResult = {
  items: WeeklyPlanListItem[];
  isLoading: boolean;
  error: UiError | null;
  load: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
};

export function useWeeklyPlansList(): UseWeeklyPlansListResult {
  const { showError } = useGlobalToast();
  const [items, setItems] = useState<WeeklyPlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const list = await weeklyPlansApi.list();
      setItems(list);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await load();
    } finally {
      setIsRefreshing(false);
    }
  }, [load]);

  const refreshControl = useMemo<ReactElement<RefreshControlProps>>(
    () => <RefreshControl refreshing={isRefreshing} onRefresh={refresh} />,
    [isRefreshing, refresh],
  );

  return { items, isLoading, error, load, refreshControl };
}
