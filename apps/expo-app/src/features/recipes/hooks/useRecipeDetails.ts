import { useCallback, useEffect, useState } from 'react';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { Recipe } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

export function useRecipeDetails(id: string) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing recipe id.');
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
      setError(uiErr.message);
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
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
      setError(uiErr.message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [id]);

  return { recipe, isLoading, error, load, remove, isDeleting };
}
