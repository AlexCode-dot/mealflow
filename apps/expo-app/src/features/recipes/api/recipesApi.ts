import { httpClient } from '@/src/core/http/httpClient';
import type {
  Recipe,
  RecipeListItem,
  CreateRecipeRequest,
  UpdateRecipeRequest,
} from '@/src/features/recipes/types';

export const recipesApi = {
  list(): Promise<RecipeListItem[]> {
    return httpClient.appApi.get<RecipeListItem[]>('/api/recipes');
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
};
