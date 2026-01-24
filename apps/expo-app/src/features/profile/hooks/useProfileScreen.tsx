import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileApi } from '@/src/features/profile/api/profileApi';
import type { Profile } from '@/src/features/profile/types';
import { routes } from '@/src/core/navigation/routes';
import { buildHref } from '@/src/core/navigation/buildHref';
import { normalizePath } from '@/src/core/navigation/normalizePath';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { toApiError } from '@/src/core/http/toApiError';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { forceLogout } from '@/src/features/auth/actions/forceLogout';
import { recipesApi } from '@/src/features/recipes/api/recipesApi';
import { weeklyPlansApi } from '@/src/features/weekly-plans/api/weeklyPlansApi';
import { shoppingListsApi } from '@/src/features/shopping-lists/api/shoppingListsApi';
import { useGlobalToast } from '@/src/shared/ui';

type ProfileScreenState = {
  isLoading: boolean;
  isRefreshing: boolean;
  error: UiError | null;
};

type ProfileScreenData = {
  profile: Profile | null;
  initials: string;
  displayName: string;
  memberSince: string;
  recipeCount: number;
  planCount: number;
  listCount: number;
};

type ProfileScreenActions = {
  load: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  openEdit: () => void;
  logout: () => Promise<void>;
  handleBack: () => void;
};

type ProfileScreenView = {
  state: ProfileScreenState;
  data: ProfileScreenData;
  actions: ProfileScreenActions;
  toast: {
    state: ReturnType<typeof useToastState>;
    showToast: boolean;
    topInset: number;
  };
};

function getInitials(name: string | null): string {
  if (!name) return 'ME';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ME';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function useProfileScreen(): ProfileScreenView {
  const params = useLocalSearchParams<{ toast?: string; returnTo?: string }>();
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const returnTo = normalizePath(typeof params.returnTo === 'string' ? params.returnTo : null);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const toastState = useToastState();
  const { showError } = useGlobalToast();
  const [showToast, setShowToast] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recipeCount, setRecipeCount] = useState(0);
  const [planCount, setPlanCount] = useState(0);
  const [listCount, setListCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const results = await Promise.allSettled([
      profileApi.get(),
      recipesApi.list(),
      weeklyPlansApi.list(),
      shoppingListsApi.list('archived'),
    ]);

    const profileResult = results[0];
    if (profileResult.status === 'fulfilled') {
      setProfile(profileResult.value);
    } else {
      const uiErr = mapCommonError(toApiError(profileResult.reason));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
      return;
    }

    const recipesResult = results[1];
    if (recipesResult.status === 'fulfilled') {
      setRecipeCount(recipesResult.value.length);
    }

    const plansResult = results[2];
    if (plansResult.status === 'fulfilled') {
      setPlanCount(plansResult.value.length);
    }

    const archivedListsResult = results[3];
    if (archivedListsResult.status === 'fulfilled') {
      setListCount(archivedListsResult.value.length);
    }
  }, [showError]);

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
      if (toastParam === 'updated') {
        toastState.show({ variant: 'success', message: 'Profile updated.' });
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

  const openEdit = useCallback(() => {
    router.push(
      buildHref(routes.profileEdit, {
        returnTo: routes.profile,
        parentReturnTo: returnTo ?? undefined,
      }),
    );
  }, [returnTo]);

  const handleBack = useCallback(() => {
    if (returnTo) {
      router.replace(buildHref(returnTo));
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(routes.settings);
  }, [returnTo]);

  const logout = useCallback(async () => {
    await forceLogout();
  }, []);

  const data = useMemo<ProfileScreenData>(() => {
    const displayName = profile?.displayName?.trim() || 'Your profile';
    const createdAt = profile?.createdAt ? new Date(profile.createdAt) : null;
    const memberSince = createdAt
      ? createdAt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : '—';
    return {
      profile,
      initials: getInitials(profile?.displayName ?? null),
      displayName,
      memberSince,
      recipeCount,
      planCount,
      listCount,
    };
  }, [listCount, planCount, profile, recipeCount]);

  const state = useMemo<ProfileScreenState>(
    () => ({ isLoading, isRefreshing, error }),
    [error, isLoading, isRefreshing],
  );

  const actions = useMemo<ProfileScreenActions>(
    () => ({ load, handleRefresh, openEdit, logout, handleBack }),
    [handleBack, handleRefresh, load, logout, openEdit],
  );

  return useMemo(
    () => ({
      state,
      data,
      actions,
      toast: {
        state: toastState,
        showToast,
        topInset: insets.top,
      },
    }),
    [actions, data, insets.top, showToast, state, toastState],
  );
}
