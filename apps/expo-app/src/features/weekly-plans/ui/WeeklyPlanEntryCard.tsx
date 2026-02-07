import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ShoppingBasket, Users, Utensils } from 'lucide-react-native';
import type { WeeklyPlanEntry } from '@/src/features/weekly-plans/types';
import type { RecipeListItem } from '@/src/features/recipes/types';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  entry: WeeklyPlanEntry;
  recipe?: RecipeListItem | null;
  onPress: () => void;
};

export function WeeklyPlanEntryCard({ entry, recipe, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const titleText = recipe?.title ?? entry.customTitle ?? 'Meal';
  const itemsToShow = entry.items?.length ? entry.items : (entry.extraItems ?? []);
  const ingredientLabel =
    recipe?.ingredientCount !== null &&
    recipe?.ingredientCount !== undefined &&
    recipe.ingredientCount > 0
      ? String(recipe.ingredientCount)
      : null;
  const extraCount = itemsToShow.length;
  const combinedIngredientLabel = ingredientLabel
    ? extraCount > 0
      ? `${ingredientLabel} + ${extraCount}`
      : ingredientLabel
    : extraCount > 0
      ? String(extraCount)
      : null;
  const categoryLabel = recipe?.category?.trim() || null;
  const portionsValue =
    entry.portions !== null && entry.portions !== undefined
      ? entry.portions
      : (recipe?.portions ?? null);
  const portionsLabel =
    recipe && portionsValue !== null && portionsValue !== undefined
      ? `${portionsValue} Portions`
      : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cardShadow, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.imageFrame}>
            {recipe?.imageUrl ? (
              <Image source={{ uri: recipe.imageUrl }} style={styles.image} resizeMode="cover" />
            ) : (
              <Shimmer height={92} borderRadius={14} style={styles.imageShimmer} />
            )}
          </View>

          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={1}>
              {titleText}
            </Text>
            <Text style={styles.subtitle}>{recipe ? 'Recipe' : 'Meal'}</Text>

            <View style={styles.metaRow}>
              {combinedIngredientLabel ? (
                <IconStat
                  icon={
                    <ShoppingBasket color={theme.colors.primaryDark} size={20} strokeWidth={2.2} />
                  }
                  label={combinedIngredientLabel}
                />
              ) : null}
              {categoryLabel ? (
                <IconStat
                  icon={<Utensils color={theme.colors.primaryDark} size={20} strokeWidth={2.2} />}
                  label={categoryLabel}
                />
              ) : null}
              {portionsLabel ? (
                <IconStat
                  icon={<Users color={theme.colors.primaryDark} size={20} strokeWidth={2.2} />}
                  label={portionsLabel}
                />
              ) : null}
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardShadow: {
      borderRadius: 18,
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    cardPressed: {
      opacity: 0.92,
    },
    card: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
      borderRadius: 18,
      padding: theme.spacing.s2,
      gap: theme.spacing.s1,
      backgroundColor: theme.colors.primaryLight,
      minHeight: 92 + theme.spacing.s2 * 2,
    },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
      alignItems: 'center',
    },
    imageFrame: {
      width: 92,
      height: 92,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: theme.colors.primaryDark,
      overflow: 'hidden',
      backgroundColor: theme.colors.bg,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageShimmer: {
      width: '100%',
    },
    content: {
      flex: 1,
      gap: theme.spacing.s1,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text,
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.s3,
      marginTop: 2,
    },
  });
