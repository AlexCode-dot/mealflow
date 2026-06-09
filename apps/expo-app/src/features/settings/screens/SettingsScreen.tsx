import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  FileText,
  KeyRound,
  Languages,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react-native';
import { useSettingsScreen } from '@/src/features/settings/hooks/useSettingsScreen';
import { ThemePickerSheet } from '@/src/features/settings/ui/ThemePickerSheet';
import { LanguagePickerSheet } from '@/src/features/settings/ui/LanguagePickerSheet';
import { ConfirmSheet, ToastBanner, LoadingScreen, Screen, useGlobalToast } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

export function SettingsScreen() {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const view = useSettingsScreen();
  const { state, data, actions, modal, toast } = view;
  const { toast: globalToast, showValidationError, show } = useGlobalToast();
  const { t } = useTranslation();

  const appVersion = Constants.expoConfig?.version ?? Constants.expoConfig?.sdkVersion ?? '0.1';
  const legal = Constants.expoConfig?.extra?.legal as
    | { privacyUrl?: string; termsUrl?: string }
    | undefined;
  const support = Constants.expoConfig?.extra?.support as { email?: string } | undefined;

  const themeLabel = useMemo(() => {
    return data.themeOptions.find((option) => option.value === data.theme)?.label ?? data.theme;
  }, [data.theme, data.themeOptions]);

  const languageLabel = useMemo(() => {
    return data.languageOptions.find((option) => option.value === data.language)?.label ?? data.language;
  }, [data.language, data.languageOptions]);

  const openLegalUrl = async (url?: string) => {
    if (!url) {
      showValidationError(t('errors.legalLinkNotConfigured'));
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      showValidationError(t('errors.unableToOpenLink'));
      return;
    }
    await Linking.openURL(url);
  };

  const openEmail = async (email?: string) => {
    if (!email) {
      showValidationError(t('errors.supportEmailNotConfigured'));
      return;
    }
    const url = `mailto:${email}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      await Clipboard.setStringAsync(email);
      show({ variant: 'success', message: t('errors.supportEmailCopied') });
      return;
    }
    await Linking.openURL(url);
  };

  const toastBanner =
    toast.state.toast && toast.showToast && !globalToast ? (
      <View style={[styles.toastOverlay, { pointerEvents: 'box-none' }]}>
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8, pointerEvents: 'none' }]}>
          <ToastBanner
            variant={toast.state.toast.variant}
            title={toast.state.toast.title}
            message={toast.state.toast.message}
            onTimeout={toast.state.clear}
          />
        </View>
      </View>
    ) : null;

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root}>
      <Screen
        title={t('settings.title')}
        scroll
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
      >
        <View style={styles.list}>
          <ProfileBanner onPress={actions.openProfileEdit} styles={styles} theme={theme} />

          <SectionHeader title={t('settings.preferences')} styles={styles} />
          <View style={styles.sectionGroup}>
            <SettingsRow
              title={t('settings.theme')}
              subtitle={themeLabel}
              onPress={actions.openThemePicker}
              icon={<Palette size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              right={<ChevronRight size={22} color={theme.colors.textMuted} strokeWidth={2.4} />}
              styles={styles}
            />
            <SettingsRow
              title={t('settings.language.title')}
              subtitle={languageLabel}
              onPress={actions.openLanguagePicker}
              icon={<Languages size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              right={<ChevronRight size={22} color={theme.colors.textMuted} strokeWidth={2.4} />}
              styles={styles}
            />
            <SettingsRow
              title={t('settings.aboutAndLegal')}
              subtitle={t('common.version', { version: appVersion })}
              onPress={actions.openLegal}
              icon={<FileText size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              right={<ChevronRight size={22} color={theme.colors.textMuted} strokeWidth={2.4} />}
              styles={styles}
            />
          </View>

          <SectionHeader title={t('settings.legal')} styles={styles} />
          <View style={styles.sectionGroup}>
            <SettingsRow
              title={t('settings.privacyPolicy')}
              subtitle={t('settings.readPrivacyPolicy')}
              onPress={() => openLegalUrl(legal?.privacyUrl)}
              icon={<ShieldCheck size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              styles={styles}
            />
            <SettingsRow
              title={t('settings.termsOfService')}
              subtitle={t('settings.readTermsOfService')}
              onPress={() => openLegalUrl(legal?.termsUrl)}
              icon={<FileText size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              styles={styles}
            />
          </View>

          <SectionHeader title={t('settings.support')} styles={styles} />
          <View style={styles.sectionGroup}>
            <SettingsRow
              title={t('settings.contactSupport')}
              subtitle={support?.email ?? t('settings.sendUsAnEmail')}
              onPress={() => openEmail(support?.email)}
              icon={<Mail size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              styles={styles}
            />
          </View>

          <SectionHeader title={t('settings.developer')} styles={styles} />
          <View style={styles.sectionGroup}>
            <SettingsRow
              title={t('settings.developerAccess')}
              subtitle={t('settings.developerAccessSubtitle')}
              onPress={actions.openDeveloperAccess}
              icon={<KeyRound size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              right={<ChevronRight size={22} color={theme.colors.textMuted} strokeWidth={2.4} />}
              styles={styles}
            />
          </View>

          <SectionHeader title={t('settings.account')} styles={styles} />
          <View style={styles.sectionGroup}>
            <SettingsRow
              title={t('settings.logout')}
              subtitle={t('settings.signOutOfMealFlow')}
              onPress={actions.logout}
              icon={<LogOut size={22} color={theme.colors.textMuted} strokeWidth={2.3} />}
              iconBg={theme.colors.bgLight}
              styles={styles}
            />
            <SettingsRow
              title={t('settings.deleteAccount')}
              subtitle={t('settings.permanentlyRemoveData')}
              onPress={actions.openDeleteConfirm}
              icon={<Trash2 size={22} color={theme.colors.error} strokeWidth={2.3} />}
              iconBg={theme.colors.errorBg}
              danger
              styles={styles}
            />
          </View>
        </View>
      </Screen>
      {toastBanner}

      <ThemePickerSheet
        visible={modal.themeOpen}
        value={data.theme}
        options={data.themeOptions}
        onChange={actions.setTheme}
        onClose={actions.closeThemePicker}
      />

      <LanguagePickerSheet
        visible={modal.languageOpen}
        value={data.language}
        onChange={actions.setLanguage}
        onClose={actions.closeLanguagePicker}
      />

      <ConfirmSheet
        visible={modal.deleteOpen}
        title={t('settings.deleteAccountConfirmTitle')}
        description={t('settings.deleteAccountConfirmBody')}
        confirmLabel={state.isDeleting ? t('settings.deletingAccount') : t('settings.deleteAccount')}
        confirmVariant="danger"
        disabled={state.isDeleting}
        cancelLabel={t('common.cancel')}
        onConfirm={actions.confirmDelete}
        onCancel={actions.closeDeleteConfirm}
      />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    list: {
      gap: theme.spacing.s4,
    },
    toastOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 20,
    },
    toastWrap: {
      paddingHorizontal: theme.spacing.s4,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s4,
      paddingVertical: theme.spacing.s4,
      paddingHorizontal: theme.spacing.s4,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    rowPressed: {
      opacity: 0.9,
    },
    iconBadge: {
      width: 54,
      height: 54,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.dividerSoft,
    },
    rowText: {
      flex: 1,
      gap: theme.spacing.s1,
    },
    rowTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: theme.colors.text,
    },
    rowSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    rowDanger: {
      backgroundColor: theme.colors.errorBg,
      borderColor: theme.colors.error,
    },
    rowTitleDanger: {
      color: theme.colors.error,
    },
    iconBadgeDanger: {
      borderColor: theme.colors.error,
    },
    sectionHeader: {
      fontSize: 14,
      fontWeight: '800',
      letterSpacing: 1.8,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      marginTop: theme.spacing.s2,
    },
    sectionGroup: {
      gap: theme.spacing.s2,
    },
    profileCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.s5,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s4,
      shadowColor: '#000',
      shadowOpacity: 0.16,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
    profileIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    profileTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.textOnPrimary,
    },
    profileSubtitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.iconMutedOnPrimary,
    },
    profileChevron: {
      marginLeft: 'auto',
    },
  });

type SettingsRowProps = {
  title: string;
  subtitle: string;
  icon: ReactNode;
  iconBg: string;
  onPress: () => void;
  right?: ReactNode;
  danger?: boolean;
  styles: ReturnType<typeof createStyles>;
};

function SettingsRow({
  title,
  subtitle,
  icon,
  iconBg,
  onPress,
  right,
  danger = false,
  styles,
}: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.rowPressed : null)}>
      <View style={[styles.rowCard, danger ? styles.rowDanger : null]}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: iconBg },
            danger ? styles.iconBadgeDanger : null,
          ]}
        >
          {icon}
        </View>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, danger ? styles.rowTitleDanger : null]}>{title}</Text>
          <Text style={styles.rowSubtitle}>{subtitle}</Text>
        </View>
        {right ? <View>{right}</View> : null}
      </View>
    </Pressable>
  );
}

function SectionHeader({
  title,
  styles,
}: {
  title: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function ProfileBanner({
  onPress,
  styles,
  theme,
}: {
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.rowPressed : null)}>
      <View style={styles.profileCard}>
        <View style={styles.profileIconWrap}>
          <UserRound size={28} color={theme.colors.textOnPrimary} strokeWidth={2.4} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.profileTitle}>{t('settings.myProfile')}</Text>
          <Text style={styles.profileSubtitle}>{t('settings.editYourDetails')}</Text>
        </View>
        <ChevronRight
          size={24}
          color={theme.colors.textOnPrimary}
          strokeWidth={2.4}
          style={styles.profileChevron}
        />
      </View>
    </Pressable>
  );
}
