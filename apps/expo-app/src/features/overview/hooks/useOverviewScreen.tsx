import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import { inspirationApi } from '@/src/features/recipes/api/inspirationApi';
import type { WeeklyPlan, WeeklyPlanListItem } from '@/src/features/weekly-plans/types';
import type { ShoppingListListItem } from '@/src/features/shopping-lists/types';
import type { InspirationListItem } from '@/src/features/recipes/types';
import {
  currentWeekStartIso,
  formatWeekRange,
  getIsoWeekNumber,
} from '@/src/features/weekly-plans/utils/weeklyPlanDates';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { toApiError } from '@/src/core/http/toApiError';
import { routes } from '@/src/core/navigation/routes';
import { buildHref } from '@/src/core/navigation/buildHref';
import { useGlobalToast } from '@/src/shared/ui';

export type OverviewState = {
  isLoading: boolean;
  isRefreshing: boolean;
  error: UiError | null;
};

export type OverviewData = {
  weekStart: string;
  weekRangeLabel: string;
  weekNumber: number;
  planId: string | null;
  plannedCount: number;
  recipeCount: number;
  inspiration: InspirationListItem[];
  dayMealCounts: Record<string, number>;
  activeListId: string | null;
  activeListTitle: string;
  activeListCount: number;
  activeItemCount: number;
};

export type OverviewActions = {
  load: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  openWeeklyPlan: () => void;
  openRecipes: () => void;
  openDiscovery: () => void;
  openNewRecipe: () => void;
  openShoppingList: () => void;
  openActiveList: () => void;
  openInspiration: (id: string) => void;
};

export type OverviewView = {
  state: OverviewState;
  data: OverviewData;
  actions: OverviewActions;
};

const EMPTY_LIST: ShoppingListListItem[] = [];

export function useOverviewScreen(): OverviewView {
  const { showError } = useGlobalToast();
  const [weekPlan, setWeekPlan] = useState<WeeklyPlanListItem | null>(null);
  const [weekPlanDetails, setWeekPlanDetails] = useState<WeeklyPlan | null>(null);
  const [activeLists, setActiveLists] = useState<ShoppingListListItem[]>(EMPTY_LIST);
  const [inspiration, setInspiration] = useState<InspirationListItem[]>([]);
  const [recipeCount, setRecipeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const weekStart = currentWeekStartIso();

  const load = useCallback(async () => {
    setError(null);

    const inspirationPromise = inspirationApi
      .random(6)
      .then((items) => setInspiration(items))
      .catch((err) => {
        setInspiration([]);
        const uiErr = mapCommonError(toApiError(err));
        setError(uiErr);
        showError(uiErr, { onRetry: load });
      });

    const results = await Promise.allSettled([
      weeklyPlansApi.list(weekStart),
      recipesApi.list(),
      shoppingListsApi.list('active'),
    ]);

    const errors = results
      .map((result) => (result.status === 'rejected' ? result.reason : null))
      .filter(Boolean);

    if (errors.length > 0) {
      const uiErr = mapCommonError(toApiError(errors[0]));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
    }

    const plansResult = results[0];
    if (plansResult.status === 'fulfilled') {
      const plan = plansResult.value.find((item) => item.weeklyStart === weekStart) ?? null;
      setWeekPlan(plan);
      if (plan) {
        void weeklyPlansApi
          .get(plan.id)
          .then((details) => setWeekPlanDetails(details))
          .catch(() => setWeekPlanDetails(null));
      } else {
        setWeekPlanDetails(null);
      }
    }

    const recipesResult = results[1];
    if (recipesResult.status === 'fulfilled') {
      setRecipeCount(recipesResult.value.length);
    }

    const listsResult = results[2];
    if (listsResult.status === 'fulfilled') {
      setActiveLists(listsResult.value);
    }

    void inspirationPromise;
  }, [showError, weekStart]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void load().finally(() => setIsLoading(false));
    }, [load]),
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const openWeeklyPlan = useCallback(() => {
    if (weekPlan) {
      router.push(buildHref(routes.weeklyPlan(weekPlan.id), { returnTo: routes.overview }));
      return;
    }
    router.push(routes.weeklyPlanner);
  }, [weekPlan]);

  const openRecipes = useCallback(() => {
    router.push({ pathname: routes.recipes, params: { tab: 'saved' } });
  }, []);

  const openDiscovery = useCallback(() => {
    router.push({ pathname: routes.recipes, params: { tab: 'inspiration' } });
  }, []);

  const openNewRecipe = useCallback(() => {
    router.push(buildHref(routes.recipeNew, { returnTo: routes.overview }));
  }, []);

  const openShoppingList = useCallback(() => {
    router.push(routes.shoppingList);
  }, []);

  const openActiveList = useCallback(() => {
    if (!activeLists[0]) {
      router.push(routes.shoppingList);
      return;
    }
    router.push(
      buildHref(routes.shoppingListDetail(activeLists[0].id), { returnTo: routes.overview }),
    );
  }, [activeLists]);

  const openInspiration = useCallback((id: string) => {
    router.push(buildHref(routes.inspirationRecipe(id), { returnTo: routes.overview }));
  }, []);

  const data = useMemo<OverviewData>(() => {
    const activeList = activeLists[0] ?? null;
    const activeItemCount = activeLists.reduce((sum, list) => sum + list.itemCount, 0);
    const dayMealCounts: Record<string, number> = {};
    if (weekPlanDetails?.entries) {
      for (const entry of weekPlanDetails.entries) {
        const key = entry.day;
        if (!key) continue;
        dayMealCounts[key] = (dayMealCounts[key] ?? 0) + 1;
      }
    }

    return {
      weekStart,
      weekRangeLabel: formatWeekRange(weekStart),
      weekNumber: getIsoWeekNumber(weekStart),
      planId: weekPlan?.id ?? null,
      plannedCount: weekPlan?.entryCount ?? 0,
      recipeCount,
      inspiration,
      dayMealCounts,
      activeListId: activeList?.id ?? null,
      activeListTitle: activeList?.title?.trim() || 'Active list',
      activeListCount: activeLists.length,
      activeItemCount,
    };
  }, [activeLists, inspiration, recipeCount, weekPlan, weekPlanDetails, weekStart]);

  const state = useMemo<OverviewState>(
    () => ({ isLoading, isRefreshing, error }),
    [error, isLoading, isRefreshing],
  );

  const actions = useMemo<OverviewActions>(
    () => ({
      load,
      handleRefresh,
      openWeeklyPlan,
      openRecipes,
      openDiscovery,
      openNewRecipe,
      openShoppingList,
      openActiveList,
      openInspiration,
    }),
    [
      handleRefresh,
      load,
      openActiveList,
      openDiscovery,
      openInspiration,
      openNewRecipe,
      openRecipes,
      openShoppingList,
      openWeeklyPlan,
    ],
  );

  return useMemo<OverviewView>(() => ({ state, data, actions }), [actions, data, state]);
}
