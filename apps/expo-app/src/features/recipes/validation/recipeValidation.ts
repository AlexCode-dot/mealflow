export type RecipeFieldErrors = {
  title?: string;
  description?: string;
};

export function validateRecipeBasics(title: string, description: string): RecipeFieldErrors {
  const errors: RecipeFieldErrors = {};

  const t = title.trim();
  if (!t) errors.title = 'Title is required.';
  else if (t.length > 120) errors.title = 'Title must be at most 120 characters.';

  const d = description.trim();
  if (d.length > 2000) errors.description = 'Description must be at most 2000 characters.';

  return errors;
}

export function validateRecipeTitle(title: string): string | null {
  const t = title.trim();
  if (!t) return 'Title is required.';
  if (t.length > 120) return 'Title must be at most 120 characters.';
  return null;
}

export type IngredientFieldErrors = {
  name?: string;
  unit?: string;
  amount?: string;
};

export function validateIngredientDraft(
  name: string,
  unit: string,
  amount: string,
): IngredientFieldErrors {
  const errors: IngredientFieldErrors = {};
  const trimmedName = name.trim();
  const trimmedUnit = unit.trim();
  const trimmedAmount = amount.trim();

  if (!trimmedName) errors.name = 'Ingredient name is required.';
  else if (trimmedName.length > 80) errors.name = 'Ingredient name must be at most 80 characters.';

  if (trimmedUnit && trimmedUnit.length > 20) {
    errors.unit = 'Unit must be at most 20 characters.';
  }

  if (trimmedAmount) {
    const quantity = Number(trimmedAmount);
    if (!Number.isFinite(quantity)) {
      errors.amount = 'Amount must be a number.';
    } else if (quantity <= 0) {
      errors.amount = 'Amount must be greater than 0.';
    }

    if (!trimmedUnit) {
      errors.unit = 'Unit is required when amount is set.';
    }
  }

  return errors;
}

export function validateStepText(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Step description is required.';
  if (trimmed.length > 500) return 'Step must be at most 500 characters.';
  return null;
}
