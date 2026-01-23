import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileApi } from '@/src/features/profile/api/profileApi';
import { routes } from '@/src/core/navigation/routes';
import { buildHref } from '@/src/core/navigation/buildHref';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import { toApiError } from '@/src/core/http/toApiError';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { forceLogout } from '@/src/features/auth/actions/forceLogout';

type ThemeOption = {
  label: string;
  value: string;
};

type SettingsState = {
  isLoading: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  error: string | null;
};

type SettingsData = {
  theme: string;
  themeOptions: ThemeOption[];
};

type SettingsActions = {
  load: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  openProfileEdit: () => void;
  logout: () => Promise<void>;
  openThemePicker: () => void;
  closeThemePicker: () => void;
  setTheme: (value: string) => void;
  openAbout: () => void;
  closeAbout: () => void;
  openDeleteConfirm: () => void;
  closeDeleteConfirm: () => void;
  confirmDelete: () => void;
};

type SettingsView = {
  state: SettingsState;
  data: SettingsData;
  actions: SettingsActions;
  modal: {
    themeOpen: boolean;
    aboutOpen: boolean;
    deleteOpen: boolean;
  };
  toast: {
    state: ReturnType<typeof useToastState>;
    showToast: boolean;
    topInset: number;
  };
};

const THEME_OPTIONS: ThemeOption[] = [
  { label: 'Default', value: 'default' },
  { label: 'Olive', value: 'olive' },
  { label: 'Sage', value: 'sage' },
];

export function useSettingsScreen(): SettingsView {
  const params = useLocalSearchParams<{ toast?: string }>();
  const toastParam = typeof params.toast === 'string' ? params.toast : null;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const toastState = useToastState();
  const [showToast, setShowToast] = useState(false);
  const [theme, setThemeValue] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [themeOpen, setThemeOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await profileApi.get();
      setThemeValue(res.theme ?? 'default');
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

  const openProfileEdit = useCallback(() => {
    router.push(buildHref(routes.profileEdit, { returnTo: routes.settings }));
  }, []);

  const logout = useCallback(async () => {
    await forceLogout();
  }, []);

  const openThemePicker = useCallback(() => setThemeOpen(true), []);
  const closeThemePicker = useCallback(() => setThemeOpen(false), []);
  const openAbout = useCallback(() => setAboutOpen(true), []);
  const closeAbout = useCallback(() => setAboutOpen(false), []);
  const openDeleteConfirm = useCallback(() => setDeleteOpen(true), []);
  const closeDeleteConfirm = useCallback(() => setDeleteOpen(false), []);

  const setTheme = useCallback(
    async (value: string) => {
      if (value === theme || isSaving) return;
      setIsSaving(true);
      setThemeValue(value);
      try {
        await profileApi.patch({ theme: value });
        toastState.show({ variant: 'success', message: 'Theme updated.' });
      } catch (err) {
        const uiErr = mapCommonError(toApiError(err));
        toastState.show({ variant: 'error', message: uiErr.message });
        setError(uiErr.message);
      } finally {
        setIsSaving(false);
        setThemeOpen(false);
      }
    },
    [isSaving, theme, toastState],
  );

  const confirmDelete = useCallback(() => {
    toastState.show({
      variant: 'info',
      message: 'Delete account is not available yet.',
    });
    setDeleteOpen(false);
  }, [toastState]);

  const state = useMemo<SettingsState>(
    () => ({ isLoading, isRefreshing, isSaving, error }),
    [error, isLoading, isRefreshing, isSaving],
  );

  const data = useMemo<SettingsData>(() => ({ theme, themeOptions: THEME_OPTIONS }), [theme]);

  const actions = useMemo<SettingsActions>(
    () => ({
      load,
      handleRefresh,
      openProfileEdit,
      logout,
      openThemePicker,
      closeThemePicker,
      setTheme,
      openAbout,
      closeAbout,
      openDeleteConfirm,
      closeDeleteConfirm,
      confirmDelete,
    }),
    [
      closeAbout,
      closeDeleteConfirm,
      closeThemePicker,
      confirmDelete,
      handleRefresh,
      load,
      openAbout,
      openDeleteConfirm,
      openProfileEdit,
      logout,
      openThemePicker,
      setTheme,
    ],
  );

  return useMemo(
    () => ({
      state,
      data,
      actions,
      modal: {
        themeOpen,
        aboutOpen,
        deleteOpen,
      },
      toast: {
        state: toastState,
        showToast,
        topInset: insets.top,
      },
    }),
    [actions, data, insets.top, showToast, state, themeOpen, aboutOpen, deleteOpen, toastState],
  );
}
