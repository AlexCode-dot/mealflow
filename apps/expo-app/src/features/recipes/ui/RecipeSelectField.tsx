import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  icon?: ReactNode;
  prefix?: string;
  value?: string;
  placeholder?: string;
  onPress?: () => void;
};

export function RecipeSelectField({ icon, prefix, value, placeholder, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasValue = value !== undefined && value !== '';
  const display = hasValue ? value : (placeholder ?? '');

  return (
    <Pressable style={styles.field} onPress={onPress}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
      <View style={styles.textRow}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        {prefix ? <View style={styles.divider} /> : null}
        <Text style={[styles.value, !hasValue ? styles.placeholder : null]} numberOfLines={1}>
          {display}
        </Text>
      </View>
      <ChevronDown color={theme.colors.textMuted} size={18} strokeWidth={2.5} />
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.bgLight,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: 10,
      gap: theme.spacing.s2,
      minHeight: 44,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    textRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s2,
    },
    prefix: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    divider: {
      width: 1,
      height: 18,
      backgroundColor: theme.colors.borderNeutral,
    },
    value: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    placeholder: {
      color: theme.colors.textMuted,
    },
  });
