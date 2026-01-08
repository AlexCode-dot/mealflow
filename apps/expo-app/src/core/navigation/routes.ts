import type { Href } from 'expo-router';

export const routes = {
  // Auth (group segments are NOT part of the URL)
  login: '/login' as const,
  register: '/register' as const,

  // Tabs
  overview: '/overview' as const,
  profile: '/profile' as const,

  recipes: '/recipes' as const,
  recipeNew: '/recipes/new' as const,

  // Dynamic
  recipe: (id: string) => `/recipes/${id}` as Href,
  recipeEdit: (id: string) => `/recipes/${id}/edit` as Href,
};
