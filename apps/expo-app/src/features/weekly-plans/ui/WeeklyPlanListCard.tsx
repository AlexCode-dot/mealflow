import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Utensils } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

export type WeeklyPlanListCardMode = 'summary' | 'upcoming';

type Props = {
  title: string;
  rangeLabel: string;
  isCurrent: boolean;
  mode: WeeklyPlanListCardMode;
  mealCount?: number;
  statusLabel?: string;
  hasPlan?: boolean;
  onPress: () => void;
};

export function WeeklyPlanListCard({
  title,
  rangeLabel,
  isCurrent,
  mode,
  mealCount,
  statusLabel,
  hasPlan = false,
  onPress,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        isCurrent ? styles.cardCurrent : null,
        !hasPlan && mode === 'upcoming' ? styles.cardEmpty : null,
      ]}
    >
      <View style={styles.row}>
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isCurrent ? styles.titleCurrent : null]}>{title}</Text>
            <Text style={[styles.range, isCurrent ? styles.rangeCurrent : null]}>
              {mode === 'summary' ? rangeLabel : `• ${rangeLabel}`}
            </Text>
          </View>
          {mode === 'summary' ? (
            <View style={styles.metaRow}>
              <Utensils size={16} color={theme.colors.textMuted} strokeWidth={2.2} />
              <Text style={styles.metaText}>{mealCount ?? 0} meals planned</Text>
            </View>
          ) : statusLabel ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusPill, hasPlan ? styles.statusPillActive : null]}>
                <Text style={[styles.statusText, hasPlan ? styles.statusTextActive : null]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
        <ChevronRight
          size={22}
          color={isCurrent ? theme.colors.primaryDark : theme.colors.textMuted}
          strokeWidth={2.2}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
    padding: theme.spacing.s3,
  },
  cardCurrent: {
    backgroundColor: theme.colors.successBanner,
    borderColor: theme.colors.primary,
  },
  cardEmpty: {
    backgroundColor: theme.colors.bgLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.s2,
  },
  content: {
    flex: 1,
    gap: theme.spacing.s1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.text,
  },
  titleCurrent: {
    color: theme.colors.primaryDark,
  },
  range: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  rangeCurrent: {
    color: theme.colors.primaryDark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  statusRow: {
    alignItems: 'flex-start',
  },
  statusPill: {
    backgroundColor: theme.colors.bgLight,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  statusPillActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  statusText: {
    color: theme.colors.textMuted,
    fontWeight: '800',
    fontSize: 12,
  },
  statusTextActive: {
    color: theme.colors.textOnPrimary,
  },
});
