import { httpClient } from '@/src/core/http/httpClient';
import type {
  Recipe,
  RecipeListItem,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  RecipeImageUploadResponse,
} from '@/src/features/recipes/types';

export const recipesApi = {
  list(params?: { limit?: number; offset?: number }): Promise<RecipeListItem[]> {
    const search = new URLSearchParams();
    if (params?.limit != null) search.set('limit', String(params.limit));
    if (params?.offset != null) search.set('offset', String(params.offset));
    const query = search.toString();
    return httpClient.appApi.get<RecipeListItem[]>(`/api/recipes${query ? `?${query}` : ''}`);
  },

  get(id: string): Promise<Recipe> {
    return httpClient.appApi.get<Recipe>(`/api/recipes/${id}`);
  },

  create(body: CreateRecipeRequest): Promise<Recipe> {
    return httpClient.appApi.post<Recipe>('/api/recipes', body);
  },

  patch(id: string, body: UpdateRecipeRequest): Promise<Recipe> {
    return httpClient.appApi.patch<Recipe>(`/api/recipes/${id}`, body);
  },

  remove(id: string): Promise<void> {
    return httpClient.appApi.delete<void>(`/api/recipes/${id}`);
  },

  uploadImage(formData: FormData, recipeId?: string): Promise<RecipeImageUploadResponse> {
    const query = recipeId ? `?recipeId=${encodeURIComponent(recipeId)}` : '';
    return httpClient.appApi.upload<RecipeImageUploadResponse>(
      `/api/recipes/images${query}`,
      formData,
    );
  },

  removeImage(id: string): Promise<void> {
    return httpClient.appApi.delete<void>(`/api/recipes/${id}/image`);
  },
};
