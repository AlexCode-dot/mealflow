import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, GripVertical } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  index: number;
  text: string;
  onDrag?: () => void;
  showHandle?: boolean;
  onPress?: () => void;
  showDisclosure?: boolean;
  maxLines?: number;
};

export function RecipeStepRow({
  index,
  text,
  onDrag,
  showHandle = false,
  onPress,
  showDisclosure = false,
  maxLines = 2,
}: Props) {
  const label = Number.isFinite(index) ? String(index) : '';
  const hasHandle = Boolean(onDrag) || showHandle;
  const showChevron = !hasHandle && showDisclosure;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, pressed && onPress ? styles.rowPressed : null]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
      <Text style={styles.text} numberOfLines={maxLines}>
        {text}
      </Text>
      {hasHandle ? (
        onDrag ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reorder step"
            onLongPress={onDrag}
            hitSlop={8}
            style={styles.dragHandle}
          >
            <GripVertical color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
          </Pressable>
        ) : (
          <View style={[styles.dragHandle, { pointerEvents: 'none' }]}>
            <GripVertical color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
          </View>
        )
      ) : showChevron ? (
        <View style={styles.chevron}>
          <ChevronRight color={theme.colors.primaryDark} size={18} strokeWidth={2.5} />
        </View>
      ) : null}
    </Pressable>
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
  rowPressed: {
    opacity: 0.92,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: theme.colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  text: {
    flex: 1,
    color: theme.colors.text,
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
  chevron: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
