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
  error: UiError | null;
  load: () => Promise<void>;
  refreshControl: ReactElement<RefreshControlProps>;
};

export function useRecipesList(): UseRecipesListResult {
  const { showError } = useGlobalToast();
  const [items, setItems] = useState<RecipeListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    setError(null);

    try {
      const list = await recipesApi.list();
      setItems(list);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

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
