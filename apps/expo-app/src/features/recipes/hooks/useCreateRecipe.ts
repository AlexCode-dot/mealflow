import { useCallback, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { useRecipeFormState } from '@/src/features/recipes/hooks/useRecipeFormState';
import type { IngredientDto } from '@/src/features/recipes/types';

export type CreateRecipeState = {
  isSaving: boolean;
  serverError: string | null;
  canSubmit: boolean;
};

export type CreateRecipeForm = {
  title: string;
  setTitle: (value: string) => void;
  description: string;
  setDescription: (value: string) => void;
  imageUrl: string;
  setImageUrl: (value: string) => void;
  imageFileId: string;
  setImageFileId: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  portions: string;
  setPortions: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  touched: ReturnType<typeof useRecipeFormState>['touched'];
  setTouched: ReturnType<typeof useRecipeFormState>['setTouched'];
  errors: ReturnType<typeof useRecipeFormState>['errors'];
};

export type CreateRecipeData = {
  ingredients: IngredientDto[];
  setIngredients: Dispatch<SetStateAction<IngredientDto[]>>;
  steps: string[];
  setSteps: Dispatch<SetStateAction<string[]>>;
};

export type CreateRecipeActions = {
  submit: () => Promise<string | null>;
};

export type CreateRecipeView = {
  state: CreateRecipeState;
  form: CreateRecipeForm;
  data: CreateRecipeData;
  actions: CreateRecipeActions;
};

export function useCreateRecipe(): CreateRecipeView {
  const form = useRecipeFormState();
  const [ingredients, setIngredients] = useState<IngredientDto[]>([]);
  const [steps, setSteps] = useState<string[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    title,
    setTitle,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    imageFileId,
    setImageFileId,
    time,
    setTime,
    portions,
    setPortions,
    category,
    setCategory,
    touched,
    setTouched,
    errors,
    markAllTouched,
    getApiValues,
  } = form;

  const canSubmit = !isSaving && !errors.title && !errors.description && title.trim().length > 0;

  const submit = useCallback(async (): Promise<string | null> => {
    setServerError(null);
    markAllTouched();
    if (!canSubmit) return null;

    const basePayload = getApiValues();
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
  }, [canSubmit, getApiValues, ingredients, markAllTouched, steps]);

  const state = useMemo<CreateRecipeState>(
    () => ({
      isSaving,
      serverError,
      canSubmit,
    }),
    [isSaving, serverError, canSubmit],
  );

  const formView = useMemo<CreateRecipeForm>(
    () => ({
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
      imageUrl,
      setImageUrl,
      imageFileId,
      setImageFileId,
      time,
      setTime,
      portions,
      setPortions,
      category,
      setCategory,
      touched,
      setTouched,
      errors,
    }),
    [
      title,
      setTitle,
      description,
      setDescription,
      imageUrl,
      setImageUrl,
      imageFileId,
      setImageFileId,
      time,
      setTime,
      portions,
      setPortions,
      category,
      setCategory,
      touched,
      setTouched,
      errors,
    ],
  );

  const data = useMemo<CreateRecipeData>(
    () => ({
      ingredients,
      setIngredients,
      steps,
      setSteps,
    }),
    [ingredients, setIngredients, steps, setSteps],
  );

  const actions = useMemo<CreateRecipeActions>(
    () => ({
      submit,
    }),
    [submit],
  );

  return useMemo(
    () => ({
      state,
      form: formView,
      data,
      actions,
    }),
    [state, formView, data, actions],
  );
}
