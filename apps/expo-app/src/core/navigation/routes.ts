import type { Href } from 'expo-router';

export const routes = {
  // Auth (group segments are NOT part of the URL)
  login: '/login' as const,
  register: '/register' as const,

  // Tabs
  overview: '/overview' as const,
  profile: '/profile' as const,
  shoppingList: '/shopping-list' as const,
  settings: '/settings' as const,

  recipes: '/recipes' as const,
  recipesWithToast: (toast: string) =>
    ({
      pathname: '/recipes',
      params: { toast },
    }) as Href,
  recipeNew: '/recipes/new' as const,

  // Dynamic
  recipe: (id: string) => `/recipes/${id}` as Href,
  recipeEdit: (id: string) => `/recipes/${id}/edit` as Href,
  inspirationRecipe: (id: string) => `/recipes/inspiration/${id}` as Href,
  recipeView: (id: string, toast?: string) =>
    ({
      pathname: '/recipes/[id]',
      params: {
        id,
        toast,
      },
    }) as Href,
  weeklyPlanner: '/weekly-planner' as const,
  weeklyPlan: (id: string) => `/weekly-planner/${id}` as Href,
  weeklyPlanEdit: (id: string, editEntryId?: string, editDay?: string) =>
    ({
      pathname: '/weekly-planner/[id]',
      params: {
        id,
        editEntryId,
        editDay,
      },
    }) as Href,
  recipeWithWeeklyPlanReturn: (recipeId: string, planId: string, entryId: string, day: string) =>
    ({
      pathname: '/recipes/[id]',
      params: {
        id: recipeId,
        returnPlanId: planId,
        returnEntryId: entryId,
        returnDay: day,
      },
    }) as Href,
};
