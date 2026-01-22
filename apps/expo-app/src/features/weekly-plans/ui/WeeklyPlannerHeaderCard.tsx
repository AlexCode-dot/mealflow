import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Card } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';

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
  return (
    <Card style={styles.card} variant="premium">
      <View style={styles.header}>
        <Pressable
          onPress={onPrev}
          accessibilityLabel="Previous week"
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
          accessibilityLabel="Next week"
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

      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => {
          const isActive = Boolean(activeDayKey) && day.key === activeDayKey;
          const count = dayMealCounts[day.key] ?? 0;
          const dotCount = Math.min(3, count);
          return (
            <View key={day.key} style={styles.weekDayColumn}>
              <View style={[styles.weekDayChip, isActive ? styles.weekDayChipActive : null]}>
                <Text style={[styles.weekDayLabel, isActive ? styles.weekDayLabelActive : null]}>
                  {day.label}
                </Text>
                <Text style={[styles.weekDayDate, isActive ? styles.weekDayDateActive : null]}>
                  {day.dateLabel}
                </Text>
              </View>
              <View style={styles.dayDotsRow}>
                {dotCount === 0
                  ? null
                  : Array.from({ length: dotCount }, (_, idx) => (
                      <View
                        key={`${day.key}-dot-${idx}`}
                        style={[styles.dayDot, isActive ? styles.dayDotActive : null]}
                      />
                    ))}
              </View>
            </View>
          );
        })}
      </View>

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
            <Text style={styles.openText}>View Week Details</Text>
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

const styles = StyleSheet.create({
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
  weekDaysRow: {
    flexDirection: 'row',
    gap: theme.spacing.s1,
    marginTop: theme.spacing.s3,
  },
  weekDayColumn: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayChip: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 58,
    justifyContent: 'space-between',
    borderWidth: 0,
    borderColor: theme.colors.primaryLight,
  },
  weekDayChipActive: {
    backgroundColor: theme.colors.surface,
    borderWidth: 0,
    borderColor: theme.colors.primary,
  },
  weekDayLabel: {
    marginTop: 5,
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  weekDayLabelActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  weekDayDate: {
    marginTop: 5,
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  weekDayDateActive: {
    color: theme.colors.primaryDark,
    fontWeight: '900',
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
  dayDotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginTop: theme.spacing.s1,
    minHeight: 8,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3.5,
    backgroundColor: '#86EFAC',
  },
  dayDotActive: {
    backgroundColor: theme.colors.surface,
  },
});
