import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileApi } from '@/src/features/profile/api/profileApi';
import { mapCommonError } from '@/src/shared/errors/mapCommonError';
import type { UiError } from '@/src/shared/errors/errorTypes';
import { toApiError } from '@/src/core/http/toApiError';
import { routes } from '@/src/core/navigation/routes';
import { buildHref } from '@/src/core/navigation/buildHref';
import { normalizePath } from '@/src/core/navigation/normalizePath';
import { useToastState } from '@/src/shared/hooks/useToastState';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { useGlobalToast } from '@/src/shared/ui';

type ThemeOption = {
  label: string;
  value: string;
};

type ProfileEditState = {
  isLoading: boolean;
  isSaving: boolean;
  error: UiError | null;
  contentPaddingBottom: number;
};

type ProfileEditForm = {
  displayName: string;
  theme: string;
  setDisplayName: (value: string) => void;
  setTheme: (value: string) => void;
};

type ProfileEditData = {
  themeOptions: ThemeOption[];
};

type ProfileEditActions = {
  load: () => Promise<void>;
  save: () => Promise<void>;
  cancel: () => void;
};

type ProfileEditView = {
  state: ProfileEditState;
  form: ProfileEditForm;
  data: ProfileEditData;
  actions: ProfileEditActions;
  toast: ReturnType<typeof useToastState>;
};

const THEME_OPTIONS: ThemeOption[] = [
  { label: 'Default', value: 'default' },
  { label: 'Olive', value: 'olive' },
  { label: 'Sage', value: 'sage' },
];

export function useProfileEditScreen(): ProfileEditView {
  const params = useLocalSearchParams<{ returnTo?: string; parentReturnTo?: string }>();
  const returnTo = normalizePath(typeof params.returnTo === 'string' ? params.returnTo : null);
  const parentReturnTo = normalizePath(
    typeof params.parentReturnTo === 'string' ? params.parentReturnTo : null,
  );
  const insets = useSafeAreaInsets();
  const toast = useToastState();
  const { showError } = useGlobalToast();
  const [displayName, setDisplayName] = useState('');
  const [theme, setTheme] = useState('default');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<UiError | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await profileApi.get();
      setDisplayName(res.displayName ?? '');
      setTheme(res.theme ?? 'default');
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setError(uiErr);
      showError(uiErr, { onRetry: load });
    }
  }, [showError]);

  useEffect(() => {
    setIsLoading(true);
    void load().finally(() => setIsLoading(false));
  }, [load]);

  const save = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      await profileApi.patch({
        displayName: displayName.trim() || undefined,
        theme: theme || undefined,
      });
      if (returnTo) {
        if (returnTo === routes.profile && parentReturnTo) {
          router.replace(
            buildHref(returnTo, {
              toast: 'updated',
              returnTo: parentReturnTo ?? undefined,
            }),
          );
        } else {
          router.replace(buildHref(returnTo, { toast: 'updated' }));
        }
      } else {
        router.replace(routes.settingsWithToast('updated'));
      }
    } catch (err) {
      const uiErr = mapCommonError(toApiError(err));
      setError(uiErr);
      showError(uiErr, { onRetry: save });
    } finally {
      setIsSaving(false);
    }
  }, [displayName, isSaving, parentReturnTo, returnTo, showError, theme]);

  const cancel = useCallback(() => {
    if (returnTo) {
      if (returnTo === routes.profile && parentReturnTo) {
        router.replace(buildHref(returnTo, { returnTo: parentReturnTo ?? undefined }));
      } else {
        router.replace(buildHref(returnTo));
      }
      return;
    }
    router.back();
  }, [parentReturnTo, returnTo]);

  const state = useMemo<ProfileEditState>(
    () => ({
      isLoading,
      isSaving,
      error,
      contentPaddingBottom: TAB_BAR.BOX_HEIGHT + TAB_BAR.PADDING_TOP + insets.bottom + 24,
    }),
    [error, insets.bottom, isLoading, isSaving],
  );

  const form = useMemo<ProfileEditForm>(
    () => ({ displayName, theme, setDisplayName, setTheme }),
    [displayName, theme],
  );

  const data = useMemo<ProfileEditData>(
    () => ({
      themeOptions: THEME_OPTIONS,
    }),
    [],
  );

  const actions = useMemo<ProfileEditActions>(() => ({ load, save, cancel }), [cancel, load, save]);

  return useMemo(
    () => ({ state, form, data, actions, toast }),
    [actions, data, form, state, toast],
  );
}
