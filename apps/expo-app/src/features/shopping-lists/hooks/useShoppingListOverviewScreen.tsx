import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import type { ShoppingList, ShoppingListListItem } from '@/src/features/shopping-lists/types';
import { routes } from '@/src/core/navigation/routes';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { toApiError } from '@/src/core/http/toApiError';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import { currentWeekStartIso } from '@/src/features/weekly-plans/utils/weeklyPlanDates';

export type ShoppingListOverviewState = {
  tab: 'current' | 'archived';
  isLoading: boolean;
  isRefreshing: boolean;
  isGenerating: boolean;
  error: string | null;
};

export type ShoppingListOverviewData = {
  activeList: ShoppingList | null;
  archivedLists: ShoppingListListItem[];
  totalCount: number;
  checkedCount: number;
  uncheckedCount: number;
  progress: number;
};

export type ShoppingListOverviewActions = {
  setTab: (tab: 'current' | 'archived') => void;
  load: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  openActiveList: () => void;
  openArchivedList: (id: string) => void;
  requestGenerateFromCurrentWeek: () => void;
};

export type ShoppingListOverviewView = {
  state: ShoppingListOverviewState;
  data: ShoppingListOverviewData;
  actions: ShoppingListOverviewActions;
  confirms: {
    generateOpen: boolean;
    setGenerateOpen: (value: boolean) => void;
    confirmGenerate: () => Promise<void>;
  };
  toast: {
    state: ReturnType<typeof useToastState>;
    showToast: boolean;
    topInset: number;
  };
};

export function useShoppingListOverviewScreen(): ShoppingListOverviewView {
  const params = useLocalSearchParams<{ toast?: string }>();
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const toastState = useToastState();
  const [showToast, setShowToast] = useState(false);
  const [tab, setTab] = useState<'current' | 'archived'>('current');
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [archivedLists, setArchivedLists] = useState<ShoppingListListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [activeSummaries, archived] = await Promise.all([
        shoppingListsApi.list('active'),
        shoppingListsApi.list('archived'),
      ]);

      let active = activeSummaries[0] ?? null;
      if (!active) {
        const created = await shoppingListsApi.create({});
        active = {
          id: created.id,
          status: created.status,
          weeklyPlanId: created.weeklyPlanId ?? null,
          title: created.title ?? null,
          itemCount: created.items.length,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        };
      }

      const activeFull = active ? await shoppingListsApi.get(active.id) : null;
      setActiveList(activeFull);
      setArchivedLists(archived);
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setError(uiErr.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void load().finally(() => setIsLoading(false));
    }, [load]),
  );

  useEffect(() => {
    if (!toastParam || !isFocused) return undefined;

    setShowToast(false);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    timeoutId = setTimeout(() => {
      if (toastParam === 'archived') {
        toastState.show({ variant: 'success', message: 'List archived.' });
      }
      if (toastParam === 'deleted') {
        toastState.show({ variant: 'success', message: 'List deleted.' });
      }
      router.setParams({ toast: undefined });
    }, 320);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isFocused, toastParam, toastState]);

  useEffect(() => {
    if (!toastState.toast || !isFocused) {
      setShowToast(false);
      return;
    }
    setShowToast(true);
  }, [isFocused, toastState.toast]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  const openActiveList = useCallback(() => {
    if (!activeList) return;
    router.push(routes.shoppingListDetail(activeList.id));
  }, [activeList]);

  const openArchivedList = useCallback((id: string) => {
    router.push(routes.shoppingListDetail(id));
  }, []);

  const generateFromCurrentWeek = useCallback(async () => {
    const weekStart = currentWeekStartIso();
    setIsGenerating(true);
    try {
      const plans = await weeklyPlansApi.list(weekStart);
      const plan = plans[0] ?? null;
      if (!plan) {
        toastState.show({
          variant: 'info',
          title: 'No weekly plan',
          message: 'Create a weekly plan before generating a list.',
        });
        return;
      }
      const list = await shoppingListsApi.create({ weeklyPlanId: plan.id }, { mode: 'replace' });
      router.push(routes.shoppingListDetail(list.id));
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      toastState.show({ variant: 'error', title: 'Generate failed', message: uiErr.message });
    } finally {
      setIsGenerating(false);
    }
  }, [toastState]);

  const confirmGenerate = useCallback(async () => {
    setConfirmGenerateOpen(false);
    await generateFromCurrentWeek();
  }, [generateFromCurrentWeek]);

  const totalCount = activeList?.items.length ?? 0;
  const checkedCount = activeList?.items.filter((item) => item.checked).length ?? 0;
  const uncheckedCount = totalCount - checkedCount;
  const progress = totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  const state = useMemo(
    () => ({ tab, isLoading, isRefreshing, isGenerating, error }),
    [error, isGenerating, isLoading, isRefreshing, tab],
  );

  const data = useMemo(
    () => ({
      activeList,
      archivedLists,
      totalCount,
      checkedCount,
      uncheckedCount,
      progress,
    }),
    [activeList, archivedLists, checkedCount, progress, totalCount, uncheckedCount],
  );

  const actions = useMemo(
    () => ({
      setTab,
      load,
      handleRefresh,
      openActiveList,
      openArchivedList,
      requestGenerateFromCurrentWeek: () => {
        if (totalCount === 0) {
          void confirmGenerate();
          return;
        }
        setConfirmGenerateOpen(true);
      },
    }),
    [
      confirmGenerate,
      handleRefresh,
      load,
      openActiveList,
      openArchivedList,
      setConfirmGenerateOpen,
      totalCount,
    ],
  );

  const confirms = useMemo(
    () => ({
      generateOpen: confirmGenerateOpen,
      setGenerateOpen: setConfirmGenerateOpen,
      confirmGenerate,
    }),
    [confirmGenerate, confirmGenerateOpen],
  );

  const toast = useMemo(
    () => ({ state: toastState, showToast, topInset: insets.top }),
    [insets.top, showToast, toastState],
  );

  return useMemo(
    () => ({ state, data, actions, confirms, toast }),
    [actions, confirms, data, state, toast],
  );
}
