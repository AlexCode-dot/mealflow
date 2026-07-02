import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight, UserRound, XCircle } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useProfileEditScreen } from '@/src/features/profile/hooks/useProfileEditScreen';
import { useAccountEmail } from '@/src/features/profile/hooks/useAccountEmail';
import { ThemePickerSheet } from '@/src/features/settings/ui/ThemePickerSheet';
import {
  Card,
  LoadingScreen,
  Screen,
  TextField,
  ToastBanner,
  ListRow,
  useBottomBarActions,
  useGlobalToast,
  resolveBottomActionBarColor,
} from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ProfileEditScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const view = useProfileEditScreen();
  const accountEmail = useAccountEmail();
  const { state, form, data, actions, toast } = view;
  const [themeOpen, setThemeOpen] = useState(false);
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const { toast: globalToast } = useGlobalToast();
  const actionColor = resolveBottomActionBarColor(theme);

  const actionItems = useMemo(
    () => [
      {
        key: 'cancel',
        label: t('common.cancel'),
        icon: <XCircle color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.4} />,
        onPress: actions.cancel,
        disabled: state.isSaving,
      },
      {
        key: 'save',
        label: state.isSaving ? t('common.saving') : t('common.save'),
        icon: <Check color={actionColor} size={TAB_BAR.ICON_SIZE} strokeWidth={2.6} />,
        onPress: actions.save,
        disabled: state.isSaving,
      },
    ],
    [actionColor, actions.cancel, actions.save, state.isSaving, t],
  );

  useBottomBarActions(isFocused ? actionItems : null);

  const themeLabel = useMemo(() => {
    return data.themeOptions.find((option) => option.value === form.theme)?.label ?? form.theme;
  }, [data.themeOptions, form.theme]);

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root}>
      <Screen
        title={t('profile.editProfile')}
        scroll
        showBack
        onBack={actions.cancel}
        showProfileIcon={false}
        contentStyle={{ paddingBottom: state.contentPaddingBottom }}
      >
        {toast.toast && !globalToast ? (
          <View style={[styles.toastOverlay, { pointerEvents: 'box-none' }]}>
            <View style={[styles.toastWrap, { marginTop: insets.top + 8, pointerEvents: 'none' }]}>
              <ToastBanner
                variant={toast.toast.variant}
                title={toast.toast.title}
                message={toast.toast.message}
                onTimeout={toast.clear}
              />
            </View>
          </View>
        ) : null}

        <Card style={styles.avatarCard} variant="premium">
          <View style={styles.avatarCircle}>
            <UserRound size={30} color={theme.colors.primaryDark} strokeWidth={2.6} />
          </View>
          <Text style={styles.avatarLabel}>{t('profile.profileAvatar')}</Text>
        </Card>

        <Card style={styles.formCard} variant="premium">
          <TextField
            label={t('profile.displayName')}
            value={form.displayName}
            onChangeText={form.setDisplayName}
            placeholder={t('profile.yourName')}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View style={styles.readOnlyBlock}>
            <Text style={styles.label}>{t('profile.emailLabel')}</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>{accountEmail ?? t('profile.notAvailable')}</Text>
            </View>
          </View>

          <View style={styles.themeBlock}>
            <Text style={styles.label}>{t('profile.theme')}</Text>
            <ListRow
              title={themeLabel}
              subtitle={t('profile.chooseYourLook')}
              onPress={() => setThemeOpen(true)}
              right={<ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.4} />}
            />
          </View>
        </Card>
      </Screen>

      <ThemePickerSheet
        visible={themeOpen}
        value={form.theme}
        options={data.themeOptions}
        onChange={form.setTheme}
        onClose={() => setThemeOpen(false)}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
    },
    toastOverlay: {
      position: 'absolute',
      top: 0,
      left: theme.spacing.s3,
      right: theme.spacing.s3,
      zIndex: 10,
    },
    toastWrap: {
      width: '100%',
    },
    avatarCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.s6,
      gap: theme.spacing.s2,
    },
    avatarCircle: {
      width: 92,
      height: 92,
      borderRadius: 26,
      backgroundColor: theme.colors.primaryLight,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
    },
    avatarLabel: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    formCard: {
      gap: theme.spacing.s4,
    },
    themeBlock: {
      gap: theme.spacing.s2,
    },
    label: {
      fontSize: 13,
      fontWeight: '800',
      color: theme.colors.text,
    },
    readOnlyBlock: {
      gap: theme.spacing.s2,
    },
    readOnlyField: {
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 12,
    },
    readOnlyText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
  });
