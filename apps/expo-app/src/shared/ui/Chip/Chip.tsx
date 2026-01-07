import { Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected = false, onPress }: Props) {
  const pressable = Boolean(onPress);

  return (
    <Pressable
      onPress={onPress}
      disabled={!pressable}
      style={({ pressed }) => [
        styles.base,
        selected ? styles.selected : styles.unselected,
        pressable && pressed ? styles.pressed : null,
      ]}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  unselected: {
    backgroundColor: theme.colors.bgLight,
    borderColor: theme.colors.borderNeutral,
  },
  selected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.borderGreen,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 12,
    fontWeight: '800',
  },
  textUnselected: {
    color: theme.colors.text,
  },
  textSelected: {
    color: theme.colors.primaryDark,
  },
});
