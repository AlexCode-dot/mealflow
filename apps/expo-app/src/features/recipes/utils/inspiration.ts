import type {
  CreateRecipeRequest,
  InspirationRecipe,
  IngredientDto,
} from '@/src/features/recipes/types';

type ParsedMeasure = {
  quantity: number | null;
  unit: string | null;
};

export function buildInspirationCreatePayload(
  recipe: InspirationRecipe,
  mealType?: string,
): CreateRecipeRequest {
  const ingredients: IngredientDto[] = recipe.ingredients.map((item) => {
    const parsed = parseInspirationMeasure(item.measure);
    return {
      name: item.name,
      quantity: parsed.quantity,
      unit: parsed.unit,
    };
  });

  const steps = normalizeInspirationSteps(recipe.steps);
  const description = buildInspirationDescription(recipe);

  return {
    title: recipe.title,
    description: description ?? null,
    imageUrl: recipe.imageUrl ?? null,
    ingredients,
    steps: steps.length ? steps : undefined,
    category: mealType || null,
    fromExternal: true,
  };
}

export function buildInspirationDescription(recipe: InspirationRecipe): string | null {
  const parts = [recipe.area, recipe.category].filter((value): value is string =>
    Boolean(value && value.trim()),
  );
  return parts.length ? parts.join(' · ') : null;
}

export function parseInspirationMeasure(measure?: string | null): ParsedMeasure {
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

  const compact = normalized.match(/^(\d+(\.\d+)?)([a-zA-Z]+)$/);
  if (compact) {
    return { quantity: Number(compact[1]), unit: compact[3].trim() };
  }

  return { quantity: null, unit: normalized };
}

export function normalizeInspirationSteps(steps: string[]): string[] {
  const cleaned = steps
    .map((step) => step.trim())
    .filter(Boolean)
    .filter((step) => !isInspirationStepMarker(step));
  if (!cleaned.length) return [];

  const maxLen = 480;
  const result: string[] = [];

  for (const step of cleaned) {
    if (step.length <= maxLen) {
      result.push(step);
      continue;
    }

    const sentences = extractSentences(step);
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

function isInspirationStepMarker(step: string): boolean {
  return /^(step\s*\d+|\d+[\).\:]?)$/i.test(step.trim());
}

function extractSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
  if (!matches) return [];
  return matches.map((part) => part.trim()).filter(Boolean);
}
