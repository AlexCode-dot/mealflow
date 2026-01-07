import type { ReactNode } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'premium';
};

export function Card({ children, style, variant = 'default' }: Props) {
  return <View style={[styles.base, variantStyles[variant], style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    padding: theme.spacing.s4,
    gap: theme.spacing.s3,
  },
});

const variantStyles = {
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
