export type IngredientDto = {
  id?: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type RecipeListItem = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  cookingTimeMinutes?: number | null;
  ingredientCount?: number | null;
  portions?: number | null;
  ingredientNames?: string[] | null;
  category?: string | null;
  fromExternal: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  ingredients: IngredientDto[];
  steps: string[];
  cookingTimeMinutes?: number | null;
  portions?: number | null;
  category?: string | null;
  fromExternal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipeRequest = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  ingredients?: IngredientDto[];
  steps?: string[];
  cookingTimeMinutes?: number | null;
  portions?: number | null;
  category?: string | null;
  fromExternal?: boolean;
};

export type UpdateRecipeRequest = {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  ingredients?: IngredientDto[] | null;
  steps?: string[] | null;
  cookingTimeMinutes?: number | null;
  portions?: number | null;
  category?: string | null;
  fromExternal?: boolean | null;
};

export type InspirationListItem = {
  id: string;
  title: string;
  imageUrl?: string | null;
  category?: string | null;
  area?: string | null;
};

export type InspirationIngredient = {
  name: string;
  measure?: string | null;
};

export type InspirationRecipe = {
  id: string;
  title: string;
  imageUrl?: string | null;
  category?: string | null;
  area?: string | null;
  ingredients: InspirationIngredient[];
  steps: string[];
};
