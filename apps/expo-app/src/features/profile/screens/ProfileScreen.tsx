import type { ReactNode } from 'react';
import { Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  ChevronRight,
  Copy,
  FileText,
  ListChecks,
  LogOut,
  Mail,
  NotebookText,
  Pencil,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useProfileScreen } from '@/src/features/profile/hooks/useProfileScreen';
import { Card, LoadingScreen, Screen, ToastBanner, useGlobalToast } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  showBack?: boolean;
};

export function ProfileScreen({ showBack = false }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const view = useProfileScreen();
  const { state, data, actions, toast } = view;
  const { toast: globalToast, showValidationError, show } = useGlobalToast();
  const legal = Constants.expoConfig?.extra?.legal as
    | { privacyUrl?: string; termsUrl?: string }
    | undefined;
  const support = Constants.expoConfig?.extra?.support as { email?: string } | undefined;

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

  const copySupportEmail = async (email?: string) => {
    if (!email) {
      showValidationError(t('errors.supportEmailNotConfigured'));
      return;
    }
    await Clipboard.setStringAsync(email);
    show({ variant: 'success', message: t('errors.supportEmailCopied') });
  };

  const openEmail = async (email?: string) => {
    if (!email) {
      showValidationError(t('errors.supportEmailNotConfigured'));
      return;
    }
    const url = `mailto:${email}`;
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      await copySupportEmail(email);
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
        title={t('profile.title')}
        scroll
        showBack={showBack}
        onBack={actions.handleBack}
        showProfileIcon={false}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
      >
        {toastBanner}

        <View style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <UserRound size={30} color={theme.colors.primaryDark} strokeWidth={2.4} />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{data.displayName}</Text>
            <Text style={styles.heroSubtitle}>{t('profile.memberLabel')}</Text>
            <Pressable style={styles.heroEdit} onPress={actions.openEdit}>
              <Pencil size={16} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
              <Text style={styles.heroEditText}>{t('profile.editProfile')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label={t('profile.recipes')}
            value={data.recipeCount}
            icon={<NotebookText size={22} color="#1E5EC8" strokeWidth={2.3} />}
            iconBg="#DCE7FF"
            styles={styles}
          />
          <StatCard
            label={t('profile.plans')}
            value={data.planCount}
            icon={<CalendarDays size={22} color="#1E8E3E" strokeWidth={2.3} />}
            iconBg="#E1F6E7"
            styles={styles}
          />
          <StatCard
            label={t('profile.lists')}
            value={data.listCount}
            icon={<ListChecks size={22} color="#C57B13" strokeWidth={2.3} />}
            iconBg="#FFF0D6"
            styles={styles}
          />
        </View>

        <Card style={styles.infoCard} variant="premium">
          <Text style={styles.infoTitle}>{t('profile.contactInfo')}</Text>
          <View style={styles.infoDivider} />
          <InfoRow
            label={t('profile.emailLabel')}
            value={t('profile.notAvailable')}
            icon={<Mail size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
            styles={styles}
          />
          <InfoRow
            label={t('profile.memberSince')}
            value={data.memberSince}
            icon={<CalendarDays size={20} color="#7A3EE6" strokeWidth={2.4} />}
            iconBg="#F0E9FF"
            styles={styles}
          />
        </Card>

        <Card style={styles.infoCard} variant="premium">
          <Text style={styles.infoTitle}>{t('profile.legal')}</Text>
          <View style={styles.infoDivider} />
          <LegalRow
            label={t('profile.privacyPolicy')}
            onPress={() => openLegalUrl(legal?.privacyUrl)}
            icon={<ShieldCheck size={20} color="#0F9D58" strokeWidth={2.4} />}
            iconBg="#E3F7EB"
            styles={styles}
            theme={theme}
          />
          <LegalRow
            label={t('profile.termsOfService')}
            onPress={() => openLegalUrl(legal?.termsUrl)}
            icon={<FileText size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
            styles={styles}
            theme={theme}
          />
        </Card>

        <Card style={styles.infoCard} variant="premium">
          <Text style={styles.infoTitle}>{t('profile.support')}</Text>
          <View style={styles.infoDivider} />
          <SupportRow
            label={t('profile.contactSupport')}
            value={support?.email ?? t('legal.supportEmail')}
            icon={<Mail size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
            onPress={() => openEmail(support?.email)}
            onCopy={() => copySupportEmail(support?.email)}
            styles={styles}
            theme={theme}
          />
        </Card>

        <Pressable style={styles.signOut} onPress={actions.logout}>
          <LogOut size={18} color={theme.colors.error} strokeWidth={2.4} />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </Pressable>
      </Screen>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    heroCard: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.s5,
      flexDirection: 'row',
      gap: theme.spacing.s4,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
      alignItems: 'center',
    },
    heroAvatar: {
      width: 84,
      height: 84,
      borderRadius: 22,
      backgroundColor: theme.colors.bgLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroContent: {
      flex: 1,
      gap: theme.spacing.s1,
    },
    heroName: {
      fontSize: 22,
      fontWeight: '900',
      color: theme.colors.textOnPrimary,
    },
    heroSubtitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.iconMutedOnPrimary,
    },
    heroEdit: {
      marginTop: theme.spacing.s2,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: theme.radius.pill,
      paddingVertical: 8,
      paddingHorizontal: theme.spacing.s4,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    heroEditText: {
      color: theme.colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.s2,
    },
    statCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.s4,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
      gap: theme.spacing.s1,
    },
    statIconWrap: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    infoCard: {
      gap: theme.spacing.s3,
      padding: theme.spacing.s5,
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 0.8,
      color: theme.colors.text,
      textTransform: 'uppercase',
    },
    infoDivider: {
      height: 1,
      backgroundColor: theme.colors.dividerSoft,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
    },
    infoIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoText: {
      gap: 2,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    legalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
    },
    legalText: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    supportRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingVertical: theme.spacing.s2,
    },
    supportMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
    },
    supportText: {
      flex: 1,
      gap: 2,
    },
    supportLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    supportValue: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.text,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s1,
      paddingVertical: 6,
      paddingHorizontal: theme.spacing.s3,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.surface,
    },
    copyText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.text,
    },
    signOut: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.error,
      paddingVertical: theme.spacing.s4,
      alignItems: 'center',
      backgroundColor: theme.colors.errorBg,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 3,
      flexDirection: 'row',
      gap: theme.spacing.s2,
      justifyContent: 'center',
    },
    signOutText: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.error,
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
  });

type StatCardProps = {
  value: number;
  label: string;
  icon: ReactNode;
  iconBg: string;
  styles: ReturnType<typeof createStyles>;
};

function StatCard({ value, label, icon, iconBg, styles }: StatCardProps) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
  iconBg,
  styles,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={styles.infoText}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LegalRow({
  label,
  icon,
  iconBg,
  onPress,
  styles,
  theme,
}: {
  label: string;
  icon: ReactNode;
  iconBg: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <Pressable onPress={onPress}>
      <View style={styles.legalRow}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <Text style={styles.legalText}>{label}</Text>
        <ChevronRight size={20} color={theme.colors.textMuted} strokeWidth={2.4} />
      </View>
    </Pressable>
  );
}

function SupportRow({
  label,
  value,
  icon,
  iconBg,
  onPress,
  onCopy,
  styles,
  theme,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
  onPress: () => void;
  onCopy: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: Theme;
}) {
  return (
    <View style={styles.supportRow}>
      <Pressable style={styles.supportMain} onPress={onPress}>
        <View style={[styles.infoIconWrap, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={styles.supportText}>
          <Text style={styles.supportLabel}>{label}</Text>
          <Text style={styles.supportValue}>{value}</Text>
        </View>
      </Pressable>
      <Pressable style={styles.copyButton} onPress={onCopy}>
        <Copy size={14} color={theme.colors.textMuted} strokeWidth={2.2} />
        <Text style={styles.copyText}>{t('profile.copyLabel')}</Text>
      </Pressable>
    </View>
  );
}
