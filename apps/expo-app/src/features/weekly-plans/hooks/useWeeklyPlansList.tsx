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
  isLoadingMore: boolean;
  canLoadMore: boolean;
  error: UiError | null;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
};

type UseWeeklyPlansListOptions = {
  weeklyStart?: string;
  paginated?: boolean;
  pageSize?: number;
  autoLoad?: boolean;
};

export function useWeeklyPlansList(options?: UseWeeklyPlansListOptions): UseWeeklyPlansListResult {
  const { showError } = useGlobalToast();
  const weeklyStart = options?.weeklyStart;
  const paginated = options?.paginated ?? false;
  const pageSize = options?.pageSize ?? 20;
  const autoLoad = options?.autoLoad ?? true;
  const shouldPaginate = paginated && !weeklyStart;
  const [items, setItems] = useState<WeeklyPlanListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setOffset(0);
    setCanLoadMore(true);

    try {
      const list = await weeklyPlansApi.list(
        shouldPaginate ? { limit: pageSize, offset: 0 } : weeklyStart,
      );
      setItems(list);
      if (shouldPaginate) {
        setOffset(list.length);
        setCanLoadMore(list.length >= pageSize);
      }
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [pageSize, shouldPaginate, showError, weeklyStart]);

  useEffect(() => {
    if (autoLoad) {
      load();
    }
  }, [autoLoad, load]);

  const loadMore = useCallback(async () => {
    if (!shouldPaginate || isLoading || isLoadingMore || !canLoadMore) return;
    setIsLoadingMore(true);
    try {
      const next = await weeklyPlansApi.list({ limit: pageSize, offset });
      if (!next.length) {
        setCanLoadMore(false);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const unique = next.filter((item) => !seen.has(item.id));
        return unique.length ? [...prev, ...unique] : prev;
      });
      setOffset((prev) => prev + next.length);
      if (next.length < pageSize) {
        setCanLoadMore(false);
      }
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr);
    } finally {
      setIsLoadingMore(false);
    }
  }, [canLoadMore, isLoading, isLoadingMore, offset, pageSize, shouldPaginate, showError]);

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

  return {
    items,
    isLoading,
    isLoadingMore,
    canLoadMore: shouldPaginate ? canLoadMore : false,
    error,
    load,
    loadMore,
    refreshControl,
  };
}
