import { Pressable, StyleSheet } from 'react-native';
import { ArrowUp } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  visible: boolean;
  onPress: () => void;
};

export function ScrollToTopFab({ visible, onPress }: Props) {
  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed ? styles.pressed : null]}
    >
      <ArrowUp color={theme.colors.textOnPrimary} size={18} strokeWidth={2.5} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    right: theme.spacing.s4,
    bottom: theme.spacing.s5,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pressed: {
    opacity: 0.85,
  },
});
