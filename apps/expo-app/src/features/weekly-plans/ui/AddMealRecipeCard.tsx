import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ShoppingBasket, Users, Utensils } from 'lucide-react-native';
import type { RecipeListItem } from '@/src/features/recipes/types';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  recipe: RecipeListItem;
  selected: boolean;
  onPress: () => void;
};

export function AddMealRecipeCard({ recipe, selected, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const ingredientLabel =
    recipe.ingredientCount !== null &&
    recipe.ingredientCount !== undefined &&
    recipe.ingredientCount > 0
      ? String(recipe.ingredientCount)
      : '—';
  const categoryLabel = recipe.category?.trim() || 'Meal';
  const portionsLabel =
    recipe.portions !== null && recipe.portions !== undefined
      ? `${recipe.portions} Portions`
      : null;

  return (
    <View style={styles.cardShadow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          selected ? styles.cardActive : null,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.imageFrame}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <Shimmer height={72} borderRadius={12} style={styles.imageShimmer} />
          )}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {recipe.title}
          </Text>

          <View style={styles.meta}>
            <IconStat
              icon={<ShoppingBasket color={theme.colors.primaryDark} size={22} strokeWidth={2.2} />}
              label={ingredientLabel}
            />
            <IconStat
              icon={<Utensils color={theme.colors.primaryDark} size={22} strokeWidth={2.2} />}
              label={categoryLabel}
            />
            {portionsLabel ? (
              <IconStat
                icon={<Users color={theme.colors.primaryDark} size={22} strokeWidth={2.2} />}
                label={portionsLabel}
              />
            ) : null}
          </View>
        </View>

        {selected ? (
          <View style={styles.check}>
            <Check color={theme.colors.textOnPrimary} size={16} strokeWidth={2.8} />
          </View>
        ) : null}
      </Pressable>
    </View>
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
    card: {
      flexDirection: 'row',
      gap: theme.spacing.s3,
      padding: theme.spacing.s3,
      borderRadius: 18,
      borderWidth: 1.5,
      borderColor: theme.colors.borderGreen,
      backgroundColor: theme.colors.surface,
    },
    cardActive: {
      borderColor: theme.colors.primaryDark,
      backgroundColor: theme.colors.primaryLight,
    },
    cardPressed: {
      opacity: 0.92,
    },
    imageFrame: {
      width: 86,
      height: 72,
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
      justifyContent: 'center',
      gap: theme.spacing.s2,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.colors.text,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.spacing.s3,
    },
    check: {
      position: 'absolute',
      right: 12,
      top: 12,
      height: 26,
      width: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
