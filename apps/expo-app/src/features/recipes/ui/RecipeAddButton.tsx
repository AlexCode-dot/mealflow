import { Pressable, StyleSheet, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  label: string;
  onPress?: () => void;
};

export function RecipeAddButton({ label, onPress }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Plus color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s2,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
  },
  label: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
});
