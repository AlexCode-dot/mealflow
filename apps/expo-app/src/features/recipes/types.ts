export type IngredientDto = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type RecipeListItem = {
  id: string;
  title: string;
  description?: string | null;
  fromExternal: boolean;
};

export type Recipe = {
  id: string;
  title: string;
  description?: string | null;
  ingredients: IngredientDto[];
  steps: string[];
  fromExternal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRecipeRequest = {
  title: string;
  description?: string | null;
  ingredients?: IngredientDto[];
  steps?: string[];
  fromExternal?: boolean;
};

export type UpdateRecipeRequest = {
  title?: string | null;
  description?: string | null;
  ingredients?: IngredientDto[] | null;
  steps?: string[] | null;
  fromExternal?: boolean | null;
};
