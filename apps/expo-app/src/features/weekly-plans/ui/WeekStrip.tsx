import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

export type WeekStripDay = {
  key: string;
  label: string;
  dateLabel: string;
};

type Props = {
  weekDays: WeekStripDay[];
  dayMealCounts: Record<string, number>;
  activeDayKey?: string | null;
  tone?: 'dark' | 'light';
  size?: 'default' | 'compact';
  showDots?: boolean;
  spacing?: 'default' | 'tight';
};

export function WeekStrip({
  weekDays,
  dayMealCounts,
  activeDayKey,
  tone = 'light',
  size = 'default',
  spacing = 'default',
  showDots = true,
}: Props) {
  const isDark = tone === 'dark';
  const compact = size === 'compact';
  const tight = spacing === 'tight';

  return (
    <View style={[styles.row, compact ? styles.rowCompact : null, tight ? styles.rowTight : null]}>
      {weekDays.map((day) => {
        const isActive = Boolean(activeDayKey) && day.key === activeDayKey;
        const count = dayMealCounts[day.key] ?? 0;
        const dotCount = Math.min(3, count);

        return (
          <View key={day.key} style={styles.column}>
            <View
              style={[
                styles.chip,
                compact ? styles.chipCompact : null,
                isDark ? styles.chipDark : styles.chipLight,
                isActive ? (isDark ? styles.chipDarkActive : styles.chipLightActive) : null,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  compact ? styles.labelCompact : null,
                  isDark ? styles.labelDark : styles.labelLight,
                  isActive ? (isDark ? styles.labelDarkActive : styles.labelLightActive) : null,
                ]}
              >
                {day.label}
              </Text>
              <Text
                style={[
                  styles.date,
                  compact ? styles.dateCompact : null,
                  isDark ? styles.dateDark : styles.dateLight,
                  isActive ? (isDark ? styles.dateDarkActive : styles.dateLightActive) : null,
                ]}
              >
                {day.dateLabel}
              </Text>
            </View>

            {showDots ? (
              <View style={[styles.dotsRow, tight ? styles.dotsRowTight : null]}>
                {dotCount === 0
                  ? null
                  : Array.from({ length: dotCount }, (_, idx) => (
                      <View
                        key={`${day.key}-dot-${idx}`}
                        style={[
                          styles.dot,
                          isDark ? styles.dotDark : styles.dotLight,
                          isActive ? (isDark ? styles.dotDarkActive : styles.dotLightActive) : null,
                        ]}
                      />
                    ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: theme.spacing.s1,
    marginTop: theme.spacing.s3,
  },
  rowCompact: {
    marginTop: theme.spacing.s2,
  },
  rowTight: {
    marginTop: 0,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  chip: {
    width: '100%',
    borderRadius: 8,
    alignItems: 'center',
    paddingVertical: 6,
    minHeight: 58,
    justifyContent: 'space-between',
  },
  chipCompact: {
    minHeight: 48,
    paddingVertical: 5,
  },
  chipDark: {
    backgroundColor: theme.colors.primary,
  },
  chipDarkActive: {
    backgroundColor: theme.colors.surface,
  },
  chipLight: {
    backgroundColor: theme.colors.bgLight,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  chipLightActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primaryDark,
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: '700',
  },
  labelCompact: {
    fontSize: 9,
  },
  labelDark: {
    color: theme.colors.primaryLight,
  },
  labelDarkActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  labelLight: {
    color: theme.colors.textMuted,
  },
  labelLightActive: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
  },
  date: {
    marginTop: 5,
    fontSize: 16,
    fontWeight: '800',
  },
  dateCompact: {
    fontSize: 14,
  },
  dateDark: {
    color: theme.colors.textOnPrimary,
  },
  dateDarkActive: {
    color: theme.colors.primaryDark,
    fontWeight: '900',
  },
  dateLight: {
    color: theme.colors.text,
  },
  dateLightActive: {
    color: theme.colors.primaryDark,
    fontWeight: '900',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    marginTop: theme.spacing.s1,
    minHeight: 8,
  },
  dotsRowTight: {
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3.5,
  },
  dotDark: {
    backgroundColor: '#86EFAC',
  },
  dotDarkActive: {
    backgroundColor: theme.colors.surface,
  },
  dotLight: {
    backgroundColor: theme.colors.primaryLight,
  },
  dotLightActive: {
    backgroundColor: theme.colors.primaryDark,
  },
});
