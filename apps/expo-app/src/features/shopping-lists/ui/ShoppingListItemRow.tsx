import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, Trash2 } from 'lucide-react-native';
import type { ShoppingListItem } from '@/src/features/shopping-lists/types';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  item: ShoppingListItem;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const buildQuantityLabel = (item: ShoppingListItem) => {
  if (item.quantity == null) return null;
  const unit = item.unit?.trim() ? ` ${item.unit}` : '';
  return `${item.quantity}${unit}`;
};

export function ShoppingListItemRow({ item, onToggle, onEdit, onDelete }: Props) {
  const quantityLabel = buildQuantityLabel(item);

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
    >
      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        style={[styles.check, item.checked ? styles.checkActive : styles.checkIdle]}
        hitSlop={10}
      >
        {item.checked ? <Check size={18} color={theme.colors.textOnPrimary} /> : null}
      </Pressable>

      <View style={styles.textBlock}>
        <Text style={[styles.name, item.checked ? styles.nameChecked : null]}>{item.name}</Text>
        {quantityLabel ? (
          <Text style={[styles.quantity, item.checked ? styles.quantityChecked : null]}>
            {quantityLabel}
          </Text>
        ) : null}
      </View>

      <Pressable
        onPress={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        style={({ pressed }) => [styles.delete, pressed ? styles.deletePressed : null]}
        hitSlop={10}
      >
        <Trash2 size={18} color={theme.colors.error} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s3,
    paddingHorizontal: theme.spacing.s3,
    paddingVertical: theme.spacing.s3 + 2,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderNeutral,
  },
  rowPressed: {
    opacity: 0.9,
  },
  check: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  checkIdle: {
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.bgLight,
  },
  checkActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  nameChecked: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  quantity: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  quantityChecked: {
    color: theme.colors.textMuted,
    textDecorationLine: 'line-through',
  },
  delete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: theme.colors.errorBg,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  deletePressed: {
    opacity: 0.8,
  },
});
