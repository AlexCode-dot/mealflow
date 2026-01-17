import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import type { InspirationListItem } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

type DiscoveryFilters = Record<string, string[]>;

type UseRecipeDiscoveryArgs = {
  query: string;
  filters: DiscoveryFilters;
  enabled?: boolean;
};

type UseRecipeDiscoveryResult = {
  items: InspirationListItem[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  load: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
  loadMore: () => void;
  canLoadMore: boolean;
};

const normalizePickerValue = (value?: string) => {
  if (!value) return undefined;
  return value;
};

export function useRecipeDiscovery({
  query,
  filters,
  enabled = true,
}: UseRecipeDiscoveryArgs): UseRecipeDiscoveryResult {
  const [items, setItems] = useState<InspirationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [limit, setLimit] = useState(8);
  const [lastCount, setLastCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = useMemo(() => {
    const q = query.trim();
    const ingredient = filters.ingredients?.[0];
    const category = normalizePickerValue(filters.category?.[0]);
    const area = normalizePickerValue(filters.area?.[0]);
    return Boolean(q || ingredient || category || area);
  }, [filters, query]);

  const params = useMemo(() => {
    const q = query.trim();
    const ingredient = filters.ingredients?.[0];
    const category = normalizePickerValue(filters.category?.[0]);
    const area = normalizePickerValue(filters.area?.[0]);
    return {
      q: q ? q : undefined,
      ingredient,
      category,
      area,
      limit,
    };
  }, [filters, limit, query]);

  const load = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const list = await inspirationApi.list(params);
      setItems(list);
      setLastCount(list.length);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr.message);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  useEffect(() => {
    if (!enabled) return;
    load();
  }, [enabled, load]);

  useEffect(() => {
    setLimit(8);
    setHasMore(true);
  }, [filters, query]);

  const canLoadMore = hasFilters ? lastCount >= limit : hasMore;

  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !canLoadMore) return;
    if (hasFilters) {
      setLimit((prev) => prev + 8);
      return;
    }

    setIsLoadingMore(true);
    inspirationApi
      .random(6)
      .then((next) => {
        if (!next.length) {
          setHasMore(false);
          return;
        }
        setItems((prev) => {
          const existing = new Set(prev.map((item) => item.id));
          const unique = next.filter((item) => !existing.has(item.id));
          if (!unique.length) return prev;
          const merged = [...prev, ...unique];
          const maxItems = 60;
          return merged.length > maxItems ? merged.slice(0, maxItems) : merged;
        });
      })
      .catch((e) => {
        const uiErr = mapCommonError(toApiError(e));
        setError(uiErr.message);
      })
      .finally(() => {
        setIsLoadingMore(false);
      });
  }, [canLoadMore, hasFilters, isLoading, isLoadingMore]);

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
    error,
    load,
    refreshControl,
    loadMore,
    canLoadMore,
  };
}
