import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, GripVertical } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  name: string;
  amount?: string;
  onDrag?: () => void;
  showHandle?: boolean;
};

export function RecipeIngredientRow({ name, amount, onDrag, showHandle = false }: Props) {
  const hasHandle = Boolean(onDrag) || showHandle;

  return (
    <View style={styles.row}>
      <View style={styles.checkBadge}>
        <Check color={theme.colors.primaryDark} size={16} strokeWidth={2.5} />
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {name}
        {amount ? <Text style={styles.amountInline}>{` | ${amount}`}</Text> : null}
      </Text>
      {hasHandle ? (
        onDrag ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reorder ingredient"
            onLongPress={onDrag}
            hitSlop={8}
            style={styles.dragHandle}
          >
            <GripVertical color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={styles.dragHandle} pointerEvents="none">
            <GripVertical color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.borderNeutral,
    backgroundColor: theme.colors.bgLight,
    gap: theme.spacing.s2,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  amountInline: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  dragHandle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
