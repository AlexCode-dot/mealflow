import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Theme, useThemedStyles } from '@/src/shared/theme';
import { GradientButton } from '@/src/shared/ui/GradientButton';

type Props = {
  text: string;
  buttonTitle: string;
  onPress: () => void;
};

export function AuthBottomCta({ text, buttonTitle, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();

  // Lift it a bit above bottom safe area for that “floating” feel
  const bottom = Math.max(18, insets.bottom + 16);

  return (
    <View style={[styles.root, { bottom, pointerEvents: 'box-none' }]}>
      <Text style={styles.text}>{text}</Text>

      <GradientButton title={buttonTitle} onPress={onPress} fullWidth size="lg" />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      position: 'absolute',
      left: theme.spacing.s4,
      right: theme.spacing.s4,
      alignItems: 'center',
      gap: 10,
    },

    text: {
      color: 'rgba(245,241,230,0.82)',
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
      letterSpacing: 0.2,
    },
  });
