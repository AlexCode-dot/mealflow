import type { ReactElement } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock3, ShoppingBasket, Utensils } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { formatDuration } from '@/src/features/recipes/utils/formatDuration';
import { RECIPE_IMAGE_FADE_MODE } from '@/src/features/recipes/constants/recipeUiConfig';

const IMAGE_HEIGHT = 166;
const SHEET_HEIGHT = 120;
const SHEET_OVERLAP = 16;
const CARD_HEIGHT = IMAGE_HEIGHT + SHEET_HEIGHT - SHEET_OVERLAP;

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const hasImage = Boolean(imageUrl);
  const imageFadeColors: readonly [ColorValue, ColorValue, ColorValue, ColorValue] =
    hasImage && RECIPE_IMAGE_FADE_MODE === 'bright'
      ? [
          'rgba(247,245,235,0)',
          'rgba(247,245,235,0.18)',
          'rgba(247,245,235,0.4)',
          'rgba(247,245,235,0.64)',
        ]
      : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.3)'];
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
    <View style={styles.cardShadow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <Shimmer height={IMAGE_HEIGHT} borderRadius={0} />
          )}
          <LinearGradient
            colors={imageFadeColors}
            locations={hasImage ? [0, 0.55, 0.82, 1] : [0, 0.55, 0.82, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.imageFade}
          />
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleWrap}>
            <Text style={styles.cardTitle} numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
          </View>

          <View
            style={[
              styles.metaRow,
              stats.length <= 2 ? styles.metaRowSparse : null,
              stats.length === 0 ? styles.metaRowEmpty : null,
            ]}
          >
            {stats.map((stat) => (
              <IconStat key={stat.key} icon={stat.icon} label={stat.label} />
            ))}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardShadow: {
      flex: 1,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
    },

    card: {
      height: CARD_HEIGHT,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      backgroundColor: theme.colors.surface,
      overflow: 'hidden',
    },

    imageWrap: {
      position: 'relative',
      width: '100%',
      height: IMAGE_HEIGHT,
      backgroundColor: theme.colors.bg,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imageFade: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 84,
    },

    sheet: {
      marginTop: -SHEET_OVERLAP,
      height: SHEET_HEIGHT,
      paddingTop: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s3,
      paddingBottom: theme.spacing.s2,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderLeftWidth: 0,
      borderRightWidth: 0,
      borderColor: 'rgba(198,192,168,0.6)',
    },

    cardTitle: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 22,
      textAlign: 'center',
    },
    titleWrap: {
      height: 42,
      justifyContent: 'center',
      marginTop: 4,
    },

    metaRow: {
      marginTop: theme.spacing.s3,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.s2,
      minHeight: 36,
    },
    metaRowEmpty: {
      opacity: 0,
    },
    metaRowSparse: {
      gap: theme.spacing.s4,
    },

    pressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
  });
