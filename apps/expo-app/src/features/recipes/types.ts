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
  imageFileId?: string | null;
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
  imageFileId?: string | null;
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
  imageFileId?: string | null;
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
  ingredientCount?: number | null;
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

export type RecipeImageUploadResponse = {
  imageUrl: string;
  imageFileId: string;
};

export type ExtractionStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED' | 'ACCEPTED';

export type ExtractionDraftIngredient = {
  name: string;
  quantity?: number | null;
  unit?: string | null;
};

export type ExtractionDraft = {
  title?: string | null;
  description?: string | null;
  ingredients: ExtractionDraftIngredient[];
  steps: string[];
  cookingTimeMinutes?: number | null;
  portions?: number | null;
  category?: string | null;
  language?: string | null;
  uncertainFields: string[];
};

export type ExtractionJob = {
  jobId: string;
  status: ExtractionStatus;
  sourceType: 'IMAGE' | 'VIDEO' | null;
  locale?: string | null;
  draft?: ExtractionDraft | null;
  thumbnailUrl?: string | null;
  thumbnailFileId?: string | null;
  acceptedRecipeId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AcceptExtractionRequest = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageFileId?: string | null;
  ingredients?: IngredientDto[];
  steps?: string[];
  cookingTimeMinutes?: number | null;
  portions?: number | null;
  category?: string | null;
};
