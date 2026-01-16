import { useCallback, useMemo, useState } from 'react';
import { validateRecipeBasics } from '@/src/features/recipes/validation/recipeValidation';
import type { Recipe } from '@/src/features/recipes/types';

type Touched = {
  title: boolean;
  description: boolean;
};

type Values = {
  title: string;
  description: string;
  imageUrl: string;
  time: string;
  portions: string;
  category: string;
};

type ApiValues = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  cookingTimeMinutes: number | null;
  portions: number | null;
  category: string | null;
};

export function useRecipeFormState(initial?: Partial<Values>) {
  const [title, setTitleState] = useState(initial?.title ?? '');
  const [description, setDescriptionState] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [time, setTime] = useState(initial?.time ?? '');
  const [portions, setPortions] = useState(initial?.portions ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [touched, setTouched] = useState<Touched>({ title: false, description: false });

  const errors = useMemo(() => validateRecipeBasics(title, description), [title, description]);

  const markAllTouched = useCallback(() => {
    setTouched({ title: true, description: true });
  }, []);

  const setTitle = useCallback((value: string) => {
    setTitleState(value);
  }, []);

  const setDescription = useCallback((value: string) => {
    setDescriptionState(value);
  }, []);

  const setValues = useCallback((next: Partial<Values>, resetTouched = false) => {
    if (next.title !== undefined) setTitleState(next.title);
    if (next.description !== undefined) setDescriptionState(next.description);
    if (next.imageUrl !== undefined) setImageUrl(next.imageUrl);
    if (next.time !== undefined) setTime(next.time);
    if (next.portions !== undefined) setPortions(next.portions);
    if (next.category !== undefined) setCategory(next.category);
    if (resetTouched) setTouched({ title: false, description: false });
  }, []);

  const applyRecipe = useCallback(
    (recipe: Recipe) => {
      setValues(
        {
          title: recipe.title ?? '',
          description: recipe.description ?? '',
          imageUrl: recipe.imageUrl ?? '',
          time:
            recipe.cookingTimeMinutes !== null && recipe.cookingTimeMinutes !== undefined
              ? String(recipe.cookingTimeMinutes)
              : '',
          portions:
            recipe.portions !== null && recipe.portions !== undefined
              ? String(recipe.portions)
              : '',
          category: recipe.category ?? '',
        },
        true,
      );
    },
    [setValues],
  );

  const getApiValues = useCallback((): ApiValues => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedImageUrl = imageUrl.trim();
    const cookingTimeMinutes = time ? Number(time) : null;
    const portionsValue = portions ? Number(portions) : null;

    return {
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
      imageUrl: trimmedImageUrl ? trimmedImageUrl : null,
      cookingTimeMinutes: Number.isNaN(cookingTimeMinutes) ? null : cookingTimeMinutes,
      portions: Number.isNaN(portionsValue) ? null : portionsValue,
      category: category ? category : null,
    };
  }, [category, description, imageUrl, portions, time, title]);

  return {
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
    touched,
    setTouched,
    errors,
    markAllTouched,
    setValues,
    applyRecipe,
    getApiValues,
  };
}
