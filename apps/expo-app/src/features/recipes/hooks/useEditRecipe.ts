import { useCallback, useEffect, useState } from 'react';
import type { IngredientDto, Recipe } from '@/src/features/recipes/types';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useRecipeFormState } from '@/src/features/recipes/hooks/useRecipeFormState';

export function useEditRecipe(id: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const form = useRecipeFormState();
  const {
    applyRecipe,
    markAllTouched,
    getApiValues,
    title,
    description,
    imageUrl,
    time,
    portions,
    category,
    errors,
    touched,
    setTouched,
    setTitle,
    setDescription,
    setImageUrl,
    setTime,
    setPortions,
    setCategory,
  } = form;
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  const canSave =
    !isSaving &&
    !isLoading &&
    Boolean(id) &&
    !errors.title &&
    !errors.description &&
    title.trim().length > 0;

  const load = useCallback(async () => {
    if (!id) {
      setLoadError('Missing recipe id.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const r: Recipe = await recipesApi.get(id);
      applyRecipe(r);
      setIngredients(r.ingredients ?? []);
      setSteps(r.steps ?? []);
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setLoadError(uiErr.message);
    } finally {
      setIsLoading(false);
    }
  }, [applyRecipe, id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (): Promise<boolean> => {
    markAllTouched();
    setSaveError(null);

    if (!id) return false;
    if (!title.trim()) return false;
    if (errors.title || errors.description) return false;

    const basePayload = getApiValues();
    const ingredientsPayload = ingredients.map(({ id: _id, ...rest }) => rest);

    setIsSaving(true);
    try {
      await recipesApi.patch(id, {
        ...basePayload,
        ingredients: ingredientsPayload,
        steps,
      });

      return true;
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setSaveError(uiErr.message);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [id, title, errors, ingredients, steps, markAllTouched, getApiValues]);

  return {
    isLoading,
    loadError,
    load,

    isSaving,
    saveError,
    save,

    title,
    setTitle,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    time,
    setTime,
    portions,
    setPortions,
    category,
    setCategory,
    ingredients,
    setIngredients,
    steps,
    setSteps,

    touched,
    setTouched,
    errors,

    canSave,
  };
}
