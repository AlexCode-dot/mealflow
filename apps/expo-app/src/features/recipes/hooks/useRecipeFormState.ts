import { useCallback, useMemo, useState } from 'react';
import { validateRecipeBasics } from '@/src/features/recipes/validation/recipeValidation';
import type { ImageFocus, Recipe } from '@/src/features/recipes/types';

type Touched = {
  title: boolean;
  description: boolean;
};

type Values = {
  title: string;
  description: string;
  imageUrl: string;
  imageFileId: string;
  imageFocus: ImageFocus | null;
  time: string;
  portions: string;
  category: string;
  tags: string[];
};

type ApiValues = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  imageFileId: string | null;
  imageFocus: ImageFocus | null;
  cookingTimeMinutes: number | null;
  portions: number | null;
  category: string | null;
  tags: string[];
};

export function useRecipeFormState(initial?: Partial<Values>) {
  const [title, setTitleState] = useState(initial?.title ?? '');
  const [description, setDescriptionState] = useState(initial?.description ?? '');
  const [imageUrl, setImageUrlState] = useState(initial?.imageUrl ?? '');
  const [imageFileId, setImageFileId] = useState(initial?.imageFileId ?? '');
  const [imageFocus, setImageFocus] = useState<ImageFocus | null>(initial?.imageFocus ?? null);
  const [time, setTime] = useState(initial?.time ?? '');
  const [portions, setPortions] = useState(initial?.portions ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [touched, setTouched] = useState<Touched>({ title: false, description: false });

  const errors = useMemo(() => validateRecipeBasics(title, description), [title, description]);

  const markAllTouched = useCallback(() => {
    setTouched({ title: true, description: true });
  }, []);

  // Framing describes one specific picture, so picking, uploading or removing an image starts
  // the new one centred. Loading a saved recipe goes through setValues and keeps its framing.
  const setImageUrl = useCallback((value: string) => {
    setImageUrlState(value);
    setImageFocus(null);
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
    if (next.imageUrl !== undefined) setImageUrlState(next.imageUrl);
    if (next.imageFileId !== undefined) setImageFileId(next.imageFileId);
    if (next.imageFocus !== undefined) setImageFocus(next.imageFocus);
    if (next.time !== undefined) setTime(next.time);
    if (next.portions !== undefined) setPortions(next.portions);
    if (next.category !== undefined) setCategory(next.category);
    if (next.tags !== undefined) setTags(next.tags);
    if (resetTouched) setTouched({ title: false, description: false });
  }, []);

  const applyRecipe = useCallback(
    (recipe: Recipe) => {
      setValues(
        {
          title: recipe.title ?? '',
          description: recipe.description ?? '',
          imageUrl: recipe.imageUrl ?? '',
          imageFileId: recipe.imageFileId ?? '',
          imageFocus: recipe.imageFocus ?? null,
          time:
            recipe.cookingTimeMinutes !== null && recipe.cookingTimeMinutes !== undefined
              ? String(recipe.cookingTimeMinutes)
              : '',
          portions:
            recipe.portions !== null && recipe.portions !== undefined
              ? String(recipe.portions)
              : '',
          category: recipe.category ?? '',
          tags: recipe.tags ?? [],
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
    const trimmedImageFileId = imageFileId.trim();
    const cookingTimeMinutes = time ? Number(time) : null;
    const portionsValue = portions ? Number(portions) : null;

    return {
      title: trimmedTitle,
      description: trimmedDescription ? trimmedDescription : null,
      imageUrl: trimmedImageUrl ? trimmedImageUrl : null,
      imageFileId: trimmedImageFileId ? trimmedImageFileId : null,
      imageFocus: trimmedImageUrl ? imageFocus : null,
      cookingTimeMinutes: Number.isNaN(cookingTimeMinutes) ? null : cookingTimeMinutes,
      portions: Number.isNaN(portionsValue) ? null : portionsValue,
      category: category ? category : null,
      tags,
    };
  }, [category, description, imageFileId, imageFocus, imageUrl, portions, tags, time, title]);

  return {
    title,
    setTitle,
    description,
    setDescription,
    imageUrl,
    setImageUrl,
    imageFileId,
    setImageFileId,
    imageFocus,
    setImageFocus,
    time,
    setTime,
    portions,
    setPortions,
    category,
    setCategory,
    tags,
    setTags,
    touched,
    setTouched,
    errors,
    markAllTouched,
    setValues,
    applyRecipe,
    getApiValues,
  };
}
