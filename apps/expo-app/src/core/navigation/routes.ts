import type { Href } from 'expo-router';

export const routes = {
  // Auth (group segments are NOT part of the URL)
  login: '/login' as const,
  register: '/register' as const,
  verifyEmail: (email: string) =>
    ({
      pathname: '/verify-email',
      params: { email },
    }) as unknown as Href,
  forgotPassword: '/forgot-password' as Href,
  resetPassword: (email: string) =>
    ({
      pathname: '/reset-password',
      params: { email },
    }) as unknown as Href,

  // Tabs
  overview: '/overview' as const,
  profile: '/profile' as const,
  profileEdit: '/profile/edit' as const,
  shoppingList: '/shopping-list' as const,
  shoppingListWithToast: (toast: string) =>
    ({
      pathname: '/shopping-list',
      params: { toast },
    }) as Href,
  shoppingListDetail: (id: string) => `/shopping-list/${id}` as Href,
  settings: '/settings' as const,
  settingsLegal: '/settings/legal' as const,
  settingsDeveloper: '/settings/developer' as const,
  settingsWithToast: (toast: string) =>
    ({
      pathname: '/settings',
      params: { toast },
    }) as Href,

  recipes: '/recipes' as const,
  recipesWithToast: (toast: string) =>
    ({
      pathname: '/recipes',
      params: { toast },
    }) as Href,
  recipeNew: '/recipes/new' as const,
  recipeVoice: '/recipes/voice' as Href,
  recipeImport: '/recipes/import' as Href,
  recipeImportReview: (jobId: string, videoUri?: string, videoDurationMs?: number) =>
    ({
      pathname: '/recipes/import/[jobId]',
      params: {
        jobId,
        videoUri,
        videoDurationMs: typeof videoDurationMs === 'number' ? String(videoDurationMs) : undefined,
      },
    }) as unknown as Href,

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
