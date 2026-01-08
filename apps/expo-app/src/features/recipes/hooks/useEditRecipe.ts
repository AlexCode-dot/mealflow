import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Recipe } from '@/src/features/recipes/types';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { validateRecipeTitle } from '@/src/features/recipes/validation/recipeValidation';

function linesToString(lines: string[]): string {
  return lines.join('\n');
}

function stringToLines(value: string): string[] {
  return value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function useEditRecipe(id: string) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');

  const [titleTouched, setTitleTouched] = useState(false);
  const titleError = useMemo(
    () => (titleTouched ? validateRecipeTitle(title) : null),
    [title, titleTouched],
  );

  const canSave = !isSaving && !isLoading && Boolean(id) && title.trim().length > 0;

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

      setTitle(r.title ?? '');
      setDescription(r.description ?? '');
      setIngredientsText(linesToString((r.ingredients ?? []).map((i) => i.name).filter(Boolean)));
      setStepsText(linesToString((r.steps ?? []).filter(Boolean)));
    } catch (e) {
      const uiErr = mapCommonError(toApiError(e));
      setLoadError(uiErr.message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (): Promise<boolean> => {
    setTitleTouched(true);
    setSaveError(null);

    if (!id) return false;
    if (!title.trim()) return false;

    setIsSaving(true);
    try {
      const ingredients = stringToLines(ingredientsText).map((name) => ({ name }));
      const steps = stringToLines(stepsText);

      await recipesApi.patch(id, {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        ingredients,
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
  }, [id, title, description, ingredientsText, stepsText]);

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
    ingredientsText,
    setIngredientsText,
    stepsText,
    setStepsText,

    titleTouched,
    setTitleTouched,
    titleError,

    canSave,
  };
}
