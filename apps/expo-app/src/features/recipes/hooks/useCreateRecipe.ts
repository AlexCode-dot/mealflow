import { useMemo, useState } from 'react';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { validateRecipeBasics } from '@/src/features/recipes/validation/recipeValidation';

export function useCreateRecipe() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [touched, setTouched] = useState({ title: false, description: false });
  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(() => validateRecipeBasics(title, description), [title, description]);

  const canSubmit = !isSaving && !errors.title && !errors.description && title.trim().length > 0;

  function markAllTouched() {
    setTouched({ title: true, description: true });
  }

  async function submit(): Promise<string | null> {
    setServerError(null);
    markAllTouched();
    if (!canSubmit) return null;

    setIsSaving(true);
    try {
      const created = await recipesApi.create({
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        ingredients: [],
        steps: [],
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
    title,
    setTitle: (v: string) => {
      setTitle(v);
      setServerError(null);
    },
    description,
    setDescription: (v: string) => {
      setDescription(v);
      setServerError(null);
    },
    touched,
    setTouched,
    errors,
    isSaving,
    serverError,
    canSubmit,
    submit,
    markAllTouched,
  };
}
