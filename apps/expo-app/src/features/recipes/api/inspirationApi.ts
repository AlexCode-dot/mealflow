import { httpClient } from '@/src/core/http/httpClient';
import type { InspirationListItem, InspirationRecipe } from '@/src/features/recipes/types';

type InspirationListParams = {
  q?: string;
  ingredient?: string;
  category?: string;
  area?: string;
  limit?: number;
};

function buildQuery(params?: InspirationListParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.ingredient) search.set('ingredient', params.ingredient);
  if (params.category) search.set('category', params.category);
  if (params.area) search.set('area', params.area);
  if (params.limit) search.set('limit', String(params.limit));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const inspirationApi = {
  list(params?: InspirationListParams): Promise<InspirationListItem[]> {
    const query = buildQuery(params);
    return httpClient.appApi.get<InspirationListItem[]>(`/api/inspiration${query}`);
  },

  get(id: string): Promise<InspirationRecipe> {
    return httpClient.appApi.get<InspirationRecipe>(`/api/inspiration/${id}`);
  },

  random(count = 6): Promise<InspirationListItem[]> {
    return httpClient.appApi.get<InspirationListItem[]>(`/api/inspiration/random?count=${count}`);
  },
};
