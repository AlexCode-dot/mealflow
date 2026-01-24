import { useCallback, useEffect, useMemo, useState } from 'react';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { InspirationRecipe, Recipe } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { useGlobalToast } from '@/src/shared/ui';
import { buildInspirationCreatePayload } from '@/src/features/recipes/utils/inspiration';

type SaveOptions = {
  mealType?: string;
};

export type InspirationDetailsState = {
  recipe: InspirationRecipe | null;
  isLoading: boolean;
  error: UiError | null;
  isSaving: boolean;
  saveError: string | null;
};

export type InspirationDetailsActions = {
  load: () => Promise<void>;
  save: (options?: SaveOptions) => Promise<Recipe | null>;
};

export type InspirationDetailsView = {
  state: InspirationDetailsState;
  actions: InspirationDetailsActions;
};

export function useInspirationDetails(id: string): InspirationDetailsView {
  const { showError } = useGlobalToast();
  const [recipe, setRecipe] = useState<InspirationRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<UiError | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError({ kind: 'unknown', message: 'Missing recipe id.' });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await inspirationApi.get(id);
      setRecipe(data);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  const save = useCallback(
    async ({ mealType }: SaveOptions = {}): Promise<Recipe | null> => {
      if (!recipe) return null;

      setIsSaving(true);
      setSaveError(null);

      try {
        const payload = buildInspirationCreatePayload(recipe, mealType);
        return await recipesApi.create(payload);
      } catch (e) {
        const uiErr = mapCommonError(toApiError(e));
        setSaveError(uiErr.message);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [recipe],
  );

  const state = useMemo<InspirationDetailsState>(
    () => ({
      recipe,
      isLoading,
      error,
      isSaving,
      saveError,
    }),
    [recipe, isLoading, error, isSaving, saveError],
  );

  const actions = useMemo<InspirationDetailsActions>(
    () => ({
      load,
      save,
    }),
    [load, save],
  );

  return useMemo(
    () => ({
      state,
      actions,
    }),
    [state, actions],
  );
}
