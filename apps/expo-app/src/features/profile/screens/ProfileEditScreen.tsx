import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, ChevronRight, UserRound, XCircle } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useProfileEditScreen } from '@/src/features/profile/hooks/useProfileEditScreen';
import { ThemePickerSheet } from '@/src/features/settings/ui/ThemePickerSheet';
import {
  Card,
  ErrorText,
  LoadingScreen,
  Screen,
  TextField,
  ToastBanner,
  ListRow,
  useBottomBarActions,
} from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { TAB_BAR } from '@/src/shared/ui/layout/tabBar';

export function ProfileEditScreen() {
  const view = useProfileEditScreen();
  const { state, form, data, actions, toast } = view;
  const [themeOpen, setThemeOpen] = useState(false);
  const isFocused = useIsFocused();

  const actionItems = useMemo(
    () => [
      {
        key: 'cancel',
        label: 'Cancel',
        icon: (
          <XCircle color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.4} />
        ),
        onPress: actions.cancel,
        disabled: state.isSaving,
      },
      {
        key: 'save',
        label: state.isSaving ? 'Saving' : 'Save',
        icon: (
          <Check color={theme.colors.textOnPrimary} size={TAB_BAR.ICON_SIZE} strokeWidth={2.6} />
        ),
        onPress: actions.save,
        disabled: state.isSaving,
      },
    ],
    [actions.cancel, actions.save, state.isSaving],
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
        title="Edit Profile"
        scroll
        showBack
        onBack={actions.cancel}
        showProfileIcon={false}
        contentStyle={{ paddingBottom: state.contentPaddingBottom }}
      >
        {state.error ? (
          <View style={styles.errorBlock}>
            <ErrorText>{state.error}</ErrorText>
          </View>
        ) : null}

        <Card style={styles.avatarCard} variant="premium">
          <View style={styles.avatarCircle}>
            <UserRound size={30} color={theme.colors.primaryDark} strokeWidth={2.6} />
          </View>
          <Text style={styles.avatarLabel}>Profile avatar</Text>
        </Card>

        <Card style={styles.formCard} variant="premium">
          <TextField
            label="Display name"
            value={form.displayName}
            onChangeText={form.setDisplayName}
            placeholder="Your name"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View style={styles.readOnlyBlock}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyText}>Not available</Text>
            </View>
          </View>

          <View style={styles.themeBlock}>
            <Text style={styles.label}>Theme</Text>
            <ListRow
              title={themeLabel}
              subtitle="Choose your look"
              onPress={() => setThemeOpen(true)}
              right={<ChevronRight size={18} color={theme.colors.textMuted} strokeWidth={2.4} />}
            />
          </View>
        </Card>

        {toast.toast ? (
          <ToastBanner
            variant={toast.toast.variant}
            title={toast.toast.title}
            message={toast.toast.message}
            onTimeout={toast.clear}
          />
        ) : null}
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  errorBlock: {
    gap: theme.spacing.s3,
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
