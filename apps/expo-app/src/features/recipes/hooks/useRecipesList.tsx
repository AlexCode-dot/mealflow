import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { RecipeListItem } from '@/src/features/recipes/types';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useGlobalToast } from '@/src/shared/ui';

type UseRecipesListResult = {
  items: RecipeListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  canLoadMore: boolean;
  error: UiError | null;
  load: () => Promise<void>;
  loadMore: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
};

type UseRecipesListOptions = {
  paginated?: boolean;
  pageSize?: number;
};

export function useRecipesList(options?: UseRecipesListOptions): UseRecipesListResult {
  const { showError } = useGlobalToast();
  const paginated = options?.paginated ?? false;
  const pageSize = options?.pageSize ?? 24;
  const [items, setItems] = useState<RecipeListItem[]>([]);
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
      const list = await recipesApi.list(paginated ? { limit: pageSize, offset: 0 } : undefined);
      setItems(list);
      if (paginated) {
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
  }, [pageSize, paginated, showError]);

  const loadMore = useCallback(async () => {
    if (!paginated || isLoading || isLoadingMore || !canLoadMore) return;
    setIsLoadingMore(true);
    try {
      const next = await recipesApi.list({ limit: pageSize, offset });
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
  }, [canLoadMore, isLoading, isLoadingMore, offset, pageSize, paginated, showError]);

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

  return {
    items,
    isLoading,
    isLoadingMore,
    canLoadMore: paginated ? canLoadMore : false,
    error,
    load,
    loadMore,
    refreshControl,
  };
}
