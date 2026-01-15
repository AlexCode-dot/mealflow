import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;

  variant?: 'default' | 'recipes';
  size?: 'default' | 'compact';
  style?: StyleProp<ViewStyle>;
};

export function Chip({
  label,
  selected = false,
  onPress,
  variant = 'default',
  size = 'default',
  style,
}: Props) {
  const pressable = Boolean(onPress);

  const v = variant === 'recipes' ? recipeStyles : defaultStyles;
  const s = size === 'compact' ? compactStyles : styles;

  return (
    <Pressable
      onPress={onPress}
      disabled={!pressable}
      style={({ pressed }) => [
        s.base,
        style,
        selected ? v.selected : v.unselected,
        pressable && pressed ? styles.pressed : null,
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        style={[s.text, selected ? v.textSelected : v.textUnselected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  pressed: { opacity: 0.88 },
  text: { fontSize: 14, fontWeight: '900', textAlign: 'center' },
});

const compactStyles = StyleSheet.create({
  base: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 2,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '800', textAlign: 'center' },
});

const defaultStyles = StyleSheet.create({
  unselected: {
    backgroundColor: theme.colors.bgLight,
    borderColor: theme.colors.borderNeutral,
  },
  selected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.borderGreen,
  },
  textUnselected: { color: theme.colors.text },
  textSelected: { color: theme.colors.primaryDark },
});

const recipeStyles = StyleSheet.create({
  unselected: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primaryDark,
  },
  selected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryDark,
  },
  textUnselected: { color: theme.colors.primaryDark },
  textSelected: { color: theme.colors.primaryDark },
});
