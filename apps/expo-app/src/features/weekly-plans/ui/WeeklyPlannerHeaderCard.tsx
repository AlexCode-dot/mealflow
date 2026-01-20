import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { Button, Card } from '@/src/shared/ui';
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
          disabled={weekOffset === -1}
          style={({ pressed }) => [
            styles.navButton,
            weekOffset === -1 ? styles.navDisabled : null,
            pressed ? styles.navPressed : null,
          ]}
        >
          <ChevronLeft size={22} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.range}>{rangeLabel}</Text>
        </View>
        <Pressable
          onPress={onNext}
          accessibilityLabel="Next week"
          disabled={weekOffset === 1}
          style={({ pressed }) => [
            styles.navButton,
            weekOffset === 1 ? styles.navDisabled : null,
            pressed ? styles.navPressed : null,
          ]}
        >
          <ChevronRight size={22} color={theme.colors.textOnPrimary} strokeWidth={2.6} />
        </Pressable>
      </View>

      <Text style={styles.subtitle}>Planned: {plannedCount} meals</Text>

      <View style={styles.weekDaysRow}>
        {weekDays.map((day) => {
          const isActive = Boolean(activeDayKey) && day.key === activeDayKey;
          return (
            <View
              key={day.key}
              style={[styles.weekDayChip, isActive ? styles.weekDayChipActive : null]}
            >
              <Text style={[styles.weekDayLabel, isActive ? styles.weekDayLabelActive : null]}>
                {day.label}
              </Text>
              <Text style={[styles.weekDayDate, isActive ? styles.weekDayDateActive : null]}>
                {day.dateLabel}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.weekDots}>
        {[-1, 0, 1].map((offset) => (
          <View
            key={`dot-${offset}`}
            style={[styles.weekDot, offset === weekOffset ? styles.weekDotActive : null]}
          />
        ))}
      </View>

      <View style={styles.action}>
        <Button
          title={hasPlan ? 'Open Week' : 'Create Week'}
          onPress={onOpen}
          disabled={isCreating}
          variant="secondary"
          containerStyle={styles.openButton}
          textStyle={styles.openText}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primary,
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
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: theme.colors.iconMutedOnPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: theme.spacing.s2,
  },
  range: {
    color: theme.colors.textOnPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  navButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.colors.primaryDark,
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
  weekDayChip: {
    flex: 1,
    backgroundColor: theme.colors.primaryDark,
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 62,
    justifyContent: 'space-between',
  },
  weekDayChipActive: {
    backgroundColor: theme.colors.surface,
  },
  weekDayLabel: {
    color: theme.colors.textOnPrimary,
    fontSize: 11,
    fontWeight: '800',
  },
  weekDayLabelActive: {
    color: theme.colors.primaryDark,
  },
  weekDayDate: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  weekDayDateActive: {
    color: theme.colors.primaryDark,
  },
  weekDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.s1,
    marginTop: theme.spacing.s3,
  },
  weekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  weekDotActive: {
    width: 30,
    backgroundColor: theme.colors.surface,
  },
  action: {
    marginTop: theme.spacing.s3,
  },
  openButton: {
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.s4,
  },
  openText: {
    fontWeight: '800',
    fontSize: 18,
    color: theme.colors.primaryDark,
  },
});
