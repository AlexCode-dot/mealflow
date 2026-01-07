import { Pressable, Text, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;

  fullWidth?: boolean;
  size?: 'md' | 'lg';
};

export function GradientButton({
  title,
  onPress,
  disabled,
  fullWidth = false,
  size = 'md',
}: Props) {
  const sizeStyle = sizeStyles[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.wrap,
        fullWidth ? styles.fullWidth : null,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {/* Outer “glow” */}
      <View style={[styles.glow, fullWidth ? styles.fullWidth : null]}>
        <LinearGradient
          // Slightly punchier than before
          colors={['#1F3415', theme.colors.primaryDark, theme.colors.primary]}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, sizeStyle.gradient]}
        >
          <Text style={[styles.text, sizeStyle.text]}>{title}</Text>
        </LinearGradient>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: theme.radius.pill,
  },

  fullWidth: {
    alignSelf: 'stretch',
  },

  glow: {
    borderRadius: theme.radius.pill,
    // Premium lift
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  } satisfies ViewStyle,

  gradient: {
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(245,241,230,0.22)',
  },

  text: {
    color: theme.colors.textOnPrimary,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  pressed: {
    opacity: 0.92,
    transform: [{ translateY: 1 }],
  },

  disabled: {
    opacity: 0.55,
  },
});

const sizeStyles = {
  md: StyleSheet.create({
    gradient: {
      paddingVertical: 14,
      paddingHorizontal: 18,
    },
    text: {
      fontSize: 14,
    },
  }),
  lg: StyleSheet.create({
    gradient: {
      paddingVertical: 16,
      paddingHorizontal: 18,
    },
    text: {
      fontSize: 15,
    },
  }),
} satisfies Record<'md' | 'lg', { gradient: ViewStyle; text: any }>;
