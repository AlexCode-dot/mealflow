import type { ReactNode } from 'react';
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import {
  CalendarDays,
  ListChecks,
  LogOut,
  Mail,
  NotebookText,
  Pencil,
  UserRound,
} from 'lucide-react-native';
import { useProfileScreen } from '@/src/features/profile/hooks/useProfileScreen';
import { Button, Card, ErrorText, LoadingScreen, Screen, ToastBanner } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  showBack?: boolean;
};

export function ProfileScreen({ showBack = false }: Props) {
  const view = useProfileScreen();
  const { state, data, actions, toast } = view;

  const toastBanner =
    toast.state.toast && toast.showToast ? (
      <View style={styles.toastOverlay} pointerEvents="box-none">
        <View style={[styles.toastWrap, { marginTop: toast.topInset + 8 }]} pointerEvents="none">
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
        title="Profile"
        scroll
        showBack={showBack}
        onBack={actions.handleBack}
        showProfileIcon={false}
        refreshControl={
          <RefreshControl refreshing={state.isRefreshing} onRefresh={actions.handleRefresh} />
        }
      >
        {toastBanner}

        {state.error ? (
          <View style={styles.errorBlock}>
            <ErrorText>{state.error}</ErrorText>
            <Button title="Retry" onPress={actions.load} variant="secondary" />
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroAvatar}>
            <UserRound size={30} color={theme.colors.primaryDark} strokeWidth={2.4} />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{data.displayName}</Text>
            <Text style={styles.heroSubtitle}>MealFlow member</Text>
            <Pressable style={styles.heroEdit} onPress={actions.openEdit}>
              <Pencil size={16} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
              <Text style={styles.heroEditText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsRow}>
          <StatCard
            label="Recipes"
            value={data.recipeCount}
            icon={<NotebookText size={22} color="#1E5EC8" strokeWidth={2.3} />}
            iconBg="#DCE7FF"
          />
          <StatCard
            label="Plans"
            value={data.planCount}
            icon={<CalendarDays size={22} color="#1E8E3E" strokeWidth={2.3} />}
            iconBg="#E1F6E7"
          />
          <StatCard
            label="Lists"
            value={data.listCount}
            icon={<ListChecks size={22} color="#C57B13" strokeWidth={2.3} />}
            iconBg="#FFF0D6"
          />
        </View>

        <Card style={styles.infoCard} variant="premium">
          <Text style={styles.infoTitle}>Contact Info</Text>
          <View style={styles.infoDivider} />
          <InfoRow
            label="Email"
            value="Not available"
            icon={<Mail size={20} color="#2463EB" strokeWidth={2.4} />}
            iconBg="#E6EEFF"
          />
          <InfoRow
            label="Member Since"
            value={data.memberSince}
            icon={<CalendarDays size={20} color="#7A3EE6" strokeWidth={2.4} />}
            iconBg="#F0E9FF"
          />
        </Card>

        <Pressable style={styles.signOut} onPress={actions.logout}>
          <LogOut size={18} color={theme.colors.error} strokeWidth={2.4} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
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
  errorBlock: {
    gap: theme.spacing.s3,
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
};

function StatCard({ value, label, icon, iconBg }: StatCardProps) {
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
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconBg: string;
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
