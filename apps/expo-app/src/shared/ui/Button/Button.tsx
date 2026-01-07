import { Pressable, Text, StyleSheet } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  title,
  onPress,
  disabled,
  variant = 'secondary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant].container,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.text, variantStyles[variant].text]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s4,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  text: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: {
      backgroundColor: theme.colors.primaryDark,
      borderColor: theme.colors.primaryDark,
    },
    text: {
      color: theme.colors.textOnPrimary,
    },
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: theme.colors.bgLight,
      borderColor: theme.colors.borderNeutral,
    },
    text: {
      color: theme.colors.text,
    },
  }),
  danger: StyleSheet.create({
    container: {
      backgroundColor: theme.colors.errorBg,
      borderColor: theme.colors.error,
    },
    text: {
      color: theme.colors.error,
    },
  }),
} satisfies Record<Variant, { container: any; text: any }>;
