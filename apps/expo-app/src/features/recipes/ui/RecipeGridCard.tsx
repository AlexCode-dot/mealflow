import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock3, ShoppingBasket, Utensils } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { formatDuration } from '@/src/features/recipes/utils/formatDuration';

type Props = {
  title: string;
  imageUrl?: string | null;
  cookingTimeMinutes?: number | null;
  ingredientCount?: number | null;
  category?: string | null;
  onPress: () => void;
};

type Stat = {
  key: string;
  icon: ReactElement;
  label: string;
};

export function RecipeGridCard({
  title,
  imageUrl,
  cookingTimeMinutes,
  ingredientCount,
  category,
  onPress,
}: Props) {
  const timeLabel =
    cookingTimeMinutes !== null && cookingTimeMinutes !== undefined && cookingTimeMinutes > 0
      ? formatDuration(cookingTimeMinutes)
      : null;
  const ingredientLabel =
    ingredientCount !== null && ingredientCount !== undefined && ingredientCount > 0
      ? String(ingredientCount)
      : null;
  const categoryLabel = category?.trim() ? category : null;
  const stats: Stat[] = [
    timeLabel
      ? {
          key: 'time',
          icon: <Clock3 color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />,
          label: timeLabel,
        }
      : null,
    ingredientLabel
      ? {
          key: 'ingredients',
          icon: <ShoppingBasket color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />,
          label: ingredientLabel,
        }
      : null,
    categoryLabel
      ? {
          key: 'category',
          icon: <Utensils color={theme.colors.primaryDark} size={24} strokeWidth={2.6} />,
          label: categoryLabel,
        }
      : null,
  ].filter((stat): stat is Stat => Boolean(stat));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      <View style={styles.imageWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <Shimmer height={150} borderRadius={0} />
        )}
      </View>

      <View style={styles.sheet}>
        <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">
          {title}
        </Text>

        {stats.length ? (
          <View style={[styles.metaRow, stats.length <= 2 ? styles.metaRowSparse : null]}>
            {stats.map((stat) => (
              <IconStat key={stat.key} icon={stat.icon} label={stat.label} />
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.borderGreen,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
    overflow: 'hidden',
  },

  imageWrap: {
    width: '100%',
    height: 166,
    backgroundColor: theme.colors.bg,
  },
  image: {
    width: '100%',
    height: '100%',
  },

  sheet: {
    marginTop: -16,
    paddingTop: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s3,
    paddingBottom: theme.spacing.s2,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(198,192,168,0.6)',
    minHeight: 80,
  },

  cardTitle: {
    marginTop: 4,
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    textAlign: 'center',
    minHeight: 40,
  },

  metaRow: {
    marginTop: theme.spacing.s3,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.s2,
    minHeight: 36,
  },
  metaRowSparse: {
    gap: theme.spacing.s4,
  },

  pressed: {
    opacity: 0.9,
  },
});
