import { useState } from 'react';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useRecipeFormState } from '@/src/features/recipes/hooks/useRecipeFormState';
import type { IngredientDto } from '@/src/features/recipes/types';

export function useCreateRecipe() {
  const form = useRecipeFormState();
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const canSubmit =
    !isSaving && !form.errors.title && !form.errors.description && form.title.trim().length > 0;

  async function submit(): Promise<string | null> {
    setServerError(null);
    form.markAllTouched();
    if (!canSubmit) return null;

    const basePayload = form.getApiValues();
    const ingredientsPayload = ingredients.map(({ id: _id, ...rest }) => rest);

    setIsSaving(true);
    try {
      const created = await recipesApi.create({
        ...basePayload,
        ingredients: ingredientsPayload,
        steps,
        fromExternal: false,
      });

      return created.id;
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setServerError(uiErr.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    title: form.title,
    setTitle: (v: string) => {
      form.setTitle(v);
      setServerError(null);
    },
    description: form.description,
    setDescription: (v: string) => {
      form.setDescription(v);
      setServerError(null);
    },
    imageUrl: form.imageUrl,
    setImageUrl: form.setImageUrl,
    time: form.time,
    setTime: form.setTime,
    portions: form.portions,
    setPortions: form.setPortions,
    category: form.category,
    setCategory: form.setCategory,
    ingredients,
    setIngredients,
    steps,
    setSteps,
    touched: form.touched,
    setTouched: form.setTouched,
    errors: form.errors,
    isSaving,
    serverError,
    canSubmit,
    submit,
  };
}
