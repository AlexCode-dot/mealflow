import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'premium';
};

export function Card({ children, style, variant = 'default' }: Props) {
  const styles = useThemedStyles(createStyles);
  return <View style={[styles.base, styles.variants[variant], style]}>{children}</View>;
}

const createStyles = (theme: Theme) => {
  const base = StyleSheet.create({
    base: {
      borderRadius: theme.radius.md,
      borderWidth: 1,
      padding: theme.spacing.s4,
      gap: theme.spacing.s3,
    },
  }).base;

  const variants = {
    default: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderNeutral,
    },
    premium: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.borderNeutral,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  } satisfies Record<'default' | 'premium', ViewStyle>;

  return { base, variants };
};
