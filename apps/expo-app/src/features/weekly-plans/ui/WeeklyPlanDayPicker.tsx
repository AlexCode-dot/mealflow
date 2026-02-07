import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

export type WeekDayTab = {
  key: string;
  label: string;
  dateLabel: string;
};

type Props = {
  days: WeekDayTab[];
  activeDay: string | null;
  todayKey: string | null;
  onSelect: (dayKey: string) => void;
};

export function WeeklyPlanDayPicker({ days, activeDay, todayKey, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {days.map((day) => {
          const active = day.key === activeDay;
          const isToday = day.key === todayKey;
          return (
            <Pressable
              key={day.key}
              onPress={() => onSelect(day.key)}
              style={[styles.chip, active ? styles.chipActive : null]}
            >
              <View style={styles.labelWrap}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="clip"
                  style={[styles.label, active ? styles.labelActive : null]}
                >
                  {day.label}
                </Text>
                {isToday ? (
                  <View style={[styles.underline, active ? styles.underlineActive : null]} />
                ) : null}
              </View>
              <View style={[styles.circle, active ? styles.circleActive : null]}>
                <Text style={[styles.date, active ? styles.dateActive : null]}>
                  {day.dateLabel}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.s2,
      borderWidth: 1,
      borderColor: theme.colors.borderGreen,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.s1,
    },
    chip: {
      alignItems: 'center',
      borderRadius: theme.radius.md,
      paddingVertical: 8,
      paddingHorizontal: 6,
      backgroundColor: 'transparent',
      flex: 1,
    },
    chipActive: {
      backgroundColor: theme.colors.bgLight,
    },
    labelWrap: {
      alignItems: 'center',
      position: 'relative',
    },
    label: {
      color: theme.colors.iconMutedOnPrimary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    labelActive: {
      color: theme.colors.primaryDark,
    },
    underline: {
      position: 'absolute',
      bottom: -2,
      width: 14,
      height: 2,
      borderRadius: 1,
      backgroundColor: theme.colors.textOnPrimary,
    },
    underlineActive: {
      backgroundColor: theme.colors.primaryDark,
    },
    circle: {
      height: 30,
      width: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.bgLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 6,
    },
    circleActive: {
      backgroundColor: theme.colors.primary,
    },
    date: {
      color: theme.colors.primaryDark,
      fontSize: 14,
      fontWeight: '800',
    },
    dateActive: {
      color: theme.colors.textOnPrimary,
    },
  });
