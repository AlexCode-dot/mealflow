import { useCallback, useEffect, useState } from 'react';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import type { InspirationRecipe, IngredientDto, Recipe } from '@/src/features/recipes/types';
import { toApiError } from '@/src/core/http/toApiError';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';

type SaveOptions = {
  mealType?: string;
};

export function useInspirationDetails(id: string) {
  const [recipe, setRecipe] = useState<InspirationRecipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing recipe id.');
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
      setError(uiErr.message);
      setRecipe(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async ({ mealType }: SaveOptions = {}): Promise<Recipe | null> => {
      if (!recipe) return null;

      setIsSaving(true);
      setSaveError(null);

      try {
        const ingredients: IngredientDto[] = recipe.ingredients.map((item) => {
          const parsed = parseMeasure(item.measure);
          return {
            name: item.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
          };
        });

        const steps = normalizeSteps(recipe.steps);
        const description = buildDescription(recipe);

        const created = await recipesApi.create({
          title: recipe.title,
          description: description ?? null,
          imageUrl: recipe.imageUrl ?? null,
          ingredients,
          steps: steps.length ? steps : undefined,
          category: mealType || null,
          fromExternal: true,
        });

        return created;
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

  return { recipe, isLoading, error, load, save, isSaving, saveError };
}

function buildDescription(recipe: InspirationRecipe): string | null {
  const parts = [recipe.area, recipe.category].filter((value): value is string =>
    Boolean(value && value.trim()),
  );
  return parts.length ? parts.join(' · ') : null;
}

type ParsedMeasure = {
  quantity: number | null;
  unit: string | null;
};

function parseMeasure(measure?: string | null): ParsedMeasure {
  const raw = measure?.trim();
  if (!raw) {
    return { quantity: null, unit: null };
  }

  const normalized = raw.replace(/\s+/g, ' ');
  const numeric = normalized.match(/^\d+(\.\d+)?$/);
  if (numeric) {
    return { quantity: Number(normalized), unit: 'pcs' };
  }

  const numberPrefix = normalized.match(/^(\d+(\.\d+)?)(\s+)(.+)$/);
  if (numberPrefix) {
    return { quantity: Number(numberPrefix[1]), unit: numberPrefix[4].trim() };
  }

  return { quantity: null, unit: normalized };
}

function normalizeSteps(steps: string[]): string[] {
  const cleaned = steps
    .map((step) => step.trim())
    .filter(Boolean)
    .filter((step) => !isStepMarker(step));
  if (!cleaned.length) return [];

  const maxLen = 480;
  const result: string[] = [];

  for (const step of cleaned) {
    if (step.length <= maxLen) {
      result.push(step);
      continue;
    }

    const sentences = step.split(/(?<=\.)\s+/);
    let buffer = '';
    for (const sentence of sentences) {
      if (!sentence) continue;
      if ((buffer + ' ' + sentence).trim().length <= maxLen) {
        buffer = buffer ? `${buffer} ${sentence}` : sentence;
        continue;
      }
      if (buffer) {
        result.push(buffer);
      }
      buffer = sentence;
    }

    if (buffer) {
      result.push(buffer);
    }
  }

  return result
    .flatMap((step) =>
      step.length > maxLen ? (step.match(new RegExp(`.{1,${maxLen}}`, 'g')) ?? []) : [step],
    )
    .map((step) => step.trim())
    .filter(Boolean);
}

function isStepMarker(step: string): boolean {
  return /^(step\s*\d+|\d+[\).\:]?)$/i.test(step.trim());
}
