import { Pressable, StyleSheet, Text } from 'react-native';
import { Plus } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  label: string;
  onPress?: () => void;
  compact?: boolean;
  variant?: 'outline' | 'solid';
};

export function RecipeAddButton({ label, onPress, compact = false, variant = 'outline' }: Props) {
  const isSolid = variant === 'solid';

  return (
    <Pressable
      style={[
        styles.button,
        compact ? styles.compact : null,
        isSolid ? styles.solid : null,
        isSolid ? styles.solidBorderless : null,
      ]}
      onPress={onPress}
    >
      <Plus
        color={isSolid ? theme.colors.textOnPrimary : theme.colors.primaryDark}
        size={20}
        strokeWidth={2.5}
      />
      <Text
        style={[
          styles.label,
          compact ? styles.labelCompact : null,
          isSolid ? styles.labelSolid : null,
        ]}
      >
        {label}
      </Text>
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
  compact: {
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  label: {
    color: theme.colors.primaryDark,
    fontSize: 15,
    fontWeight: '700',
  },
  solid: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryDark,
  },
  solidBorderless: {
    borderWidth: 0,
  },
  labelSolid: {
    color: theme.colors.textOnPrimary,
  },
  labelCompact: {
    fontSize: 18,
  },
});
