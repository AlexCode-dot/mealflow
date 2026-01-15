import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock3, ShoppingBasket, Utensils } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { formatDuration } from '@/src/features/recipes/utils/formatDuration';

type Props = {
  title: string;
  cookingTimeMinutes?: number | null;
  ingredientCount?: number | null;
  category?: string | null;
  onPress: () => void;
};

export function RecipeGridCard({
  title,
  cookingTimeMinutes,
  ingredientCount,
  category,
  onPress,
}: Props) {
  const timeLabel =
    cookingTimeMinutes !== null && cookingTimeMinutes !== undefined
      ? formatDuration(cookingTimeMinutes)
      : '—';
  const ingredientLabel =
    ingredientCount !== null && ingredientCount !== undefined ? String(ingredientCount) : '—';
  const categoryLabel = category?.trim() ? category : '—';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageFrame}>
        <Shimmer height={132} borderRadius={16} />
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {title}
      </Text>

      <View style={styles.metaRow}>
        <IconStat
          icon={<Clock3 color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />}
          label={timeLabel}
        />
        <IconStat
          icon={<ShoppingBasket color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />}
          label={ingredientLabel}
        />
        <IconStat
          icon={<Utensils color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />}
          label={categoryLabel}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.s3,
    marginBottom: 10,
  },

  imageFrame: {
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },

  cardTitle: {
    marginTop: theme.spacing.s3,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },

  metaRow: {
    marginTop: theme.spacing.s3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.s2,
  },

  pressed: {
    opacity: 0.9,
  },
});
