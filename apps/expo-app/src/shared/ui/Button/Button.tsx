import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { type Theme, useThemedStyles } from '@/src/shared/theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: Variant;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function Button({
  title,
  onPress,
  disabled,
  variant = 'secondary',
  containerStyle,
  textStyle,
}: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles.variants[variant].container,
        containerStyle,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.text, styles.variants[variant].text, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const createStyles = (theme: Theme) => {
  const base = StyleSheet.create({
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

  const variants: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: {
        backgroundColor: theme.colors.primaryDark,
        borderColor: theme.colors.primaryDark,
      },
      text: {
        color: theme.colors.textOnPrimary,
      },
    },
    secondary: {
      container: {
        backgroundColor: theme.colors.bgLight,
        borderColor: theme.colors.borderNeutral,
      },
      text: {
        color: theme.colors.text,
      },
    },
    danger: {
      container: {
        backgroundColor: theme.colors.errorBg,
        borderColor: theme.colors.error,
      },
      text: {
        color: theme.colors.error,
      },
    },
  };

  return { ...base, variants };
};
