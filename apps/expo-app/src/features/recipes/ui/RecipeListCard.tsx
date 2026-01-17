import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Bookmark } from 'lucide-react-native';
import { IconStat, Shimmer } from '@/src/shared/ui';
import { theme } from '@/src/shared/theme/theme';
import { RECIPE_IMAGE_FADE_MODE } from '@/src/features/recipes/constants/recipeUiConfig';

type MetaStat = {
  icon: ReactNode;
  label: string;
};

type Props = {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  onPress: () => void;
  metaLeft?: MetaStat | null;
  metaMiddle?: MetaStat | null;
  onSave?: () => void;
  saveLabel?: string;
  saveFilled?: boolean;
  saveDisabled?: boolean;
  savedBadge?: boolean;
};

export function RecipeListCard({
  title,
  subtitle = '–',
  imageUrl,
  onPress,
  metaLeft,
  metaMiddle,
  onSave,
  saveLabel = 'Save',
  saveFilled = false,
  saveDisabled = false,
  savedBadge = false,
}: Props) {
  const leftMeta = metaLeft ?? null;
  const middleMeta = metaMiddle ?? null;
  const hasImage = Boolean(imageUrl);
  const imageFadeColors: readonly [ColorValue, ColorValue, ColorValue, ColorValue] =
    hasImage && RECIPE_IMAGE_FADE_MODE === 'bright'
      ? [
          'rgba(247,245,235,0)',
          'rgba(247,245,235,0.14)',
          'rgba(247,245,235,0.28)',
          'rgba(247,245,235,0.42)',
        ]
      : ['rgba(0,0,0,0)', 'rgba(0,0,0,0.12)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.3)'];

  return (
    <View style={styles.cardShadow}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
      >
        <View style={styles.imageFrame}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <Shimmer height={108} borderRadius={16} />
          )}
          {savedBadge ? (
            <View style={styles.savedBadge}>
              <Text style={styles.savedBadgeText}>Saved</Text>
            </View>
          ) : null}
          {hasImage ? (
            <LinearGradient
              colors={imageFadeColors}
              locations={[0, 0.58, 0.82, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.imageFade}
            />
          ) : null}
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>

          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>

          <View style={styles.metaRow}>
            {leftMeta ? <IconStat icon={leftMeta.icon} label={leftMeta.label} /> : null}
            {middleMeta ? <IconStat icon={middleMeta.icon} label={middleMeta.label} /> : null}
            {onSave ? (
              <Pressable
                style={({ pressed }) => [
                  styles.saveWrap,
                  pressed ? styles.savePressed : null,
                  saveDisabled ? styles.saveDisabled : null,
                ]}
                onPress={onSave}
                disabled={saveDisabled}
              >
                <IconStat
                  icon={
                    <Bookmark
                      color={theme.colors.primaryDark}
                      fill={saveFilled ? theme.colors.primaryDark : 'transparent'}
                      size={26}
                      strokeWidth={2.4}
                    />
                  }
                  label={saveLabel}
                  labelStyle={saveFilled ? styles.saveLabelSaved : undefined}
                />
              </Pressable>
            ) : (
              <View style={styles.saveWrap}>
                <IconStat
                  icon={
                    <Bookmark
                      color={theme.colors.primaryDark}
                      fill={saveFilled ? theme.colors.primary : 'transparent'}
                      size={26}
                      strokeWidth={2.4}
                    />
                  }
                  label={saveLabel}
                  labelStyle={saveFilled ? styles.saveLabelSaved : undefined}
                />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShadow: {
    marginBottom: 10,
    borderRadius: 18,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
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

  imageFrame: {
    position: 'relative',
    width: 118,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    backgroundColor: theme.colors.bg,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 108,
  },
  imageFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 14,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    gap: theme.spacing.s2,
  },

  title: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },

  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: theme.spacing.s4,
    marginTop: theme.spacing.s2,
  },

  saveWrap: {
    marginLeft: 'auto',
    alignItems: 'center',
  },
  savePressed: {
    opacity: 0.8,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveLabelSaved: {
    color: theme.colors.primaryDark,
  },

  pressed: {
    opacity: 0.9,
  },
  savedBadge: {
    position: 'absolute',
    top: theme.spacing.s2,
    right: theme.spacing.s2,
    paddingHorizontal: theme.spacing.s2,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(227,243,230,0.92)',
    borderWidth: 1.5,
    borderColor: theme.colors.primaryDark,
  },
  savedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: theme.colors.primaryDark,
    letterSpacing: 0.3,
  },
});
