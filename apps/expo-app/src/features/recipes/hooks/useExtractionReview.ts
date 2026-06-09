import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { extractionApi } from '@/src/features/recipes/api/extractionApi';
import type { ExtractionJob, IngredientDto } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useRecipeFormState } from '@/src/features/recipes/hooks/useRecipeFormState';

export type ExtractionReviewState = {
  isLoading: boolean;
  isSaving: boolean;
  loadError: string | null;
  serverError: string | null;
  job: ExtractionJob | null;
  uncertainFields: string[];
  canSubmit: boolean;
};

export type ExtractionReviewView = {
  state: ExtractionReviewState;
  form: ReturnType<typeof useRecipeFormState>;
  ingredients: IngredientDto[];
  setIngredients: React.Dispatch<React.SetStateAction<IngredientDto[]>>;
  steps: string[];
  setSteps: React.Dispatch<React.SetStateAction<string[]>>;
  submit: () => Promise<string | null>;
  reload: () => Promise<void>;
};

export function useExtractionReview(jobId: string | undefined): ExtractionReviewView {
  const { t } = useTranslation();
  const form = useRecipeFormState();
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [job, setJob] = useState<ExtractionJob | null>(null);
  const [uncertainFields, setUncertainFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!jobId) {
      setIsLoading(false);
      setLoadError(t('recipes.missingExtractionId'));
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const fresh = await extractionApi.get(jobId);
      setJob(fresh);
      if (fresh.status !== 'READY') {
        setLoadError(
          fresh.status === 'FAILED'
            ? fresh.errorMessage || t('recipes.extractionFailed')
            : t('recipes.extractionNotReady'),
        );
        return;
      }
      const draft = fresh.draft;
      if (!draft) {
        setLoadError(t('recipes.extractionNoDraft'));
        return;
      }
      form.setValues(
        {
          title: draft.title ?? '',
          description: draft.description ?? '',
          imageUrl: fresh.thumbnailUrl ?? '',
          imageFileId: fresh.thumbnailFileId ?? '',
          time:
            draft.cookingTimeMinutes !== null && draft.cookingTimeMinutes !== undefined
              ? String(draft.cookingTimeMinutes)
              : '',
          portions:
            draft.portions !== null && draft.portions !== undefined ? String(draft.portions) : '',
          category: draft.category ?? '',
        },
        true,
      );
      setIngredients(
        draft.ingredients.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          estimated: ing.estimated ?? false,
        })),
      );
      setSteps(draft.steps ?? []);
      setUncertainFields(draft.uncertainFields ?? []);
    } catch (err) {
      const apiErr = toApiError(err);
      const uiErr = mapCommonError(apiErr);
      setLoadError(uiErr.message);
    } finally {
      setIsLoading(false);
    }
    // We intentionally only depend on jobId to avoid reloading on every form
    // change; form.setValues is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const canSubmit =
    !isSaving && !form.errors.title && !form.errors.description && form.title.trim().length > 0;

  const submit = useCallback(async (): Promise<string | null> => {
    if (!jobId) return null;
    form.markAllTouched();
    if (!canSubmit) return null;
    setServerError(null);
    setIsSaving(true);
    try {
      const base = form.getApiValues();
      const cleanIngredients = ingredients
        .filter((ing) => ing.name && ing.name.trim().length > 0)
        .map(({ id: _id, estimated: _estimated, ...rest }) => rest);
      const cleanSteps = steps.filter((s) => s.trim().length > 0);
      const created = await extractionApi.accept(jobId, {
        title: base.title,
        description: base.description,
        imageUrl: base.imageUrl,
        imageFileId: base.imageFileId,
        ingredients: cleanIngredients,
        steps: cleanSteps,
        cookingTimeMinutes: base.cookingTimeMinutes,
        portions: base.portions,
        category: base.category,
      });
      return created.id;
    } catch (err) {
      const apiErr = toApiError(err);
      const uiErr = mapCommonError(apiErr);
      setServerError(uiErr.message);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [canSubmit, form, ingredients, jobId, steps]);

  const state = useMemo<ExtractionReviewState>(
    () => ({
      isLoading,
      isSaving,
      loadError,
      serverError,
      job,
      uncertainFields,
      canSubmit,
    }),
    [canSubmit, isLoading, isSaving, job, loadError, serverError, uncertainFields],
  );

  return {
    state,
    form,
    ingredients,
    setIngredients,
    steps,
    setSteps,
    submit,
    reload: load,
  };
}
