export type RecipeFieldErrors = {
  title?: string;
  description?: string;
};

export function validateRecipeBasics(title: string, description: string): RecipeFieldErrors {
  const errors: RecipeFieldErrors = {};

  const t = title.trim();
  if (!t) errors.title = 'Title is required.';
  else if (t.length < 2) errors.title = 'Title must be at least 2 characters.';
  else if (t.length > 80) errors.title = 'Title must be at most 80 characters.';

  const d = description.trim();
  if (d.length > 280) errors.description = 'Description must be at most 280 characters.';

  return errors;
}

export function validateRecipeTitle(title: string): string | null {
  if (!title.trim()) return 'Title is required.';
  return null;
}
