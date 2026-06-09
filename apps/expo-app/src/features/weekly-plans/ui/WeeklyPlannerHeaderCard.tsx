import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Card } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { WeekStrip } from './WeekStrip';

export type WeekDayChip = {
  key: string;
  label: string;
  dateLabel: string;
};

type Props = {
  title: string;
  rangeLabel: string;
  plannedCount: number;
  weekDays: WeekDayChip[];
  dayMealCounts: Record<string, number>;
  activeDayKey?: string | null;
  weekOffset: number;
  onPrev: () => void;
  onNext: () => void;
  onOpen: () => void;
  isCreating: boolean;
  hasPlan: boolean;
};

export function WeeklyPlannerHeaderCard({
  title,
  rangeLabel,
  plannedCount,
  weekDays,
  dayMealCounts,
  activeDayKey,
  weekOffset,
  onPrev,
  onNext,
  onOpen,
  isCreating,
  hasPlan,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <Card style={styles.card} variant="premium">
      <View style={styles.header}>
        <Pressable
          onPress={onPrev}
          accessibilityLabel={t('weeklyPlans.previousWeek')}
          disabled={weekOffset === -2}
          style={({ pressed }) => [
            styles.navButton,
            weekOffset === -2 ? styles.navDisabled : null,
            pressed ? styles.navPressed : null,
          ]}
        >
          <ChevronLeft size={22} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.range}>{rangeLabel}</Text>
          <Text style={styles.subtitle}>Planned: {plannedCount} meals</Text>
        </View>
        <Pressable
          onPress={onNext}
          accessibilityLabel={t('weeklyPlans.nextWeek')}
          disabled={weekOffset === 2}
          style={({ pressed }) => [
            styles.navButton,
            weekOffset === 2 ? styles.navDisabled : null,
            pressed ? styles.navPressed : null,
          ]}
        >
          <ChevronRight size={22} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
        </Pressable>
      </View>

      <WeekStrip
        weekDays={weekDays}
        dayMealCounts={dayMealCounts}
        activeDayKey={activeDayKey}
        tone="dark"
      />

      <View style={styles.action}>
        <Pressable
          onPress={onOpen}
          disabled={isCreating}
          style={({ pressed }) => [
            styles.openButton,
            pressed ? styles.openPressed : null,
            isCreating ? styles.openDisabled : null,
          ]}
        >
          <View style={styles.openButtonRow}>
            <CalendarDays size={20} color={theme.colors.primary} strokeWidth={2.6} />
            <Text style={styles.openText}>{t('weeklyPlans.viewWeekDetails')}</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.weekDots}>
        {[-2, -1, 0, 1, 2].map((offset) => (
          <View
            key={`dot-${offset}`}
            style={[styles.weekDot, offset === weekOffset ? styles.weekDotActive : null]}
          />
        ))}
      </View>

      <Text style={styles.swipeHint}>← Swipe to navigate weeks →</Text>
    </Card>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    card: {
      padding: theme.spacing.s5,
      backgroundColor: theme.colors.primaryDark,
      borderColor: theme.colors.primaryDark,
      marginBottom: theme.spacing.s4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCenter: {
      alignItems: 'center',
      gap: theme.spacing.s1,
      flex: 1,
    },
    title: {
      color: theme.colors.textOnPrimary,
      fontSize: 19,
      fontWeight: '800',
    },
    range: {
      color: theme.colors.iconMutedOnPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    subtitle: {
      color: theme.colors.iconMutedOnPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
    navButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      borderWidth: 0,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navPressed: {
      opacity: 0.85,
    },
    navDisabled: {
      opacity: 0.5,
    },
    weekDots: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.s1,
      marginTop: theme.spacing.s2,
    },
    weekDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.45)',
    },
    weekDotActive: {
      width: 32,
      backgroundColor: theme.colors.surface,
    },
    action: {
      marginTop: theme.spacing.s2,
    },
    openButton: {
      borderRadius: theme.radius.md,
      paddingVertical: theme.spacing.s4,
      paddingHorizontal: theme.spacing.s4,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    openButtonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    openText: {
      fontWeight: '700',
      fontSize: 16,
      color: theme.colors.primary,
    },
    openPressed: {
      opacity: 0.9,
    },
    openDisabled: {
      opacity: 0.6,
    },
    swipeHint: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.iconMutedOnPrimary,
      textAlign: 'center',
    },
  });
