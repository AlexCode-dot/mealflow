import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { Recipe } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';

export type RecipeDetailsState = {
  recipe: Recipe | null;
  isLoading: boolean;
  error: UiError | null;
  isDeleting: boolean;
};

export type RecipeDetailsActions = {
  load: () => Promise<void>;
  remove: () => Promise<boolean>;
};

export type RecipeDetailsView = {
  state: RecipeDetailsState;
  actions: RecipeDetailsActions;
};

export function useRecipeDetails(id: string): RecipeDetailsView {
  const { t } = useTranslation();
  const { showError } = useGlobalToast();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError({ kind: 'unknown', message: t('errors.missingRecipeId') });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const r = await recipesApi.get(id);
      setRecipe(r);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, showError, t]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const remove = useCallback(async () => {
    if (!id) return false;

    setIsDeleting(true);
    setError(null);

    try {
      await recipesApi.remove(id);
      return true;
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  const state = useMemo<RecipeDetailsState>(
    () => ({
      recipe,
      isLoading,
      error,
      isDeleting,
    }),
    [recipe, isLoading, error, isDeleting],
  );

  const actions = useMemo<RecipeDetailsActions>(
    () => ({
      load,
      remove,
    }),
    [load, remove],
  );

  return useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions],
  );
}
