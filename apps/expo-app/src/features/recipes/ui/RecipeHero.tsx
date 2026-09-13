import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import type { ImageAttribution, ImageFocus } from '@/src/features/recipes/types';
import { PhotoAttributionBadge } from './PhotoAttributionBadge';
import { RecipeImage } from './RecipeImage';

type Props = {
  imageUrl?: string | null;
  /** Stock-photo credit to overlay on the image (e.g. a Pexels suggestion on review). */
  attribution?: ImageAttribution | null;
  /** How the photo is framed; see RecipeImage. */
  imageFocus?: ImageFocus | null;
  /** Opens the framing editor — shown as an Adjust badge next to change/remove. */
  onAdjust?: () => void;
  onPress?: () => void;
  onRemove?: () => void;
  isUploading?: boolean;
};

export function RecipeHero({
  imageUrl,
  attribution,
  imageFocus,
  onPress,
  onAdjust,
  onRemove,
  isUploading,
}: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isUploading) {
      progress.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [isUploading, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['20%', '100%'],
  });

  return (
    <LinearGradient
      colors={[theme.colors.bgLight, theme.colors.bg]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.hero}
    >
      {imageUrl ? (
        <Pressable
          onPress={onPress}
          disabled={!onPress || isUploading}
          style={styles.heroPressable}
        >
          <RecipeImage uri={imageUrl} focus={imageFocus} style={styles.heroImage} />
          {isUploading ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadText}>{t('recipes.uploadingPhoto')}</Text>
              <View style={styles.uploadTrack}>
                <Animated.View style={[styles.uploadFill, { width: progressWidth }]} />
              </View>
            </View>
          ) : null}
          {!isUploading && attribution ? (
            // The change/remove badges own the bottom-right corner, so the credit goes left,
            // lifted to sit on the same line as those badges.
            <PhotoAttributionBadge
              attribution={attribution}
              position="bottom-left"
              bottomOffset={6}
            />
          ) : null}
          {!isUploading && (onPress || onRemove || onAdjust) ? (
            <View style={styles.actionRow}>
              {onRemove ? (
                <Pressable onPress={onRemove} style={styles.removeBadge}>
                  <Text style={styles.removeBadgeText}>{t('recipes.removePhoto')}</Text>
                </Pressable>
              ) : null}
              {onAdjust ? (
                <Pressable onPress={onAdjust} style={styles.changeBadge} accessibilityRole="button">
                  <Text style={styles.changeBadgeText}>{t('recipes.adjustPhoto')}</Text>
                </Pressable>
              ) : null}
              {onPress ? (
                <Pressable onPress={onPress} style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>{t('recipes.changePhoto')}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      ) : (
        <Pressable style={styles.photoButton} onPress={onPress} disabled={isUploading}>
          <View style={styles.photoInner}>
            <ImagePlus color={theme.colors.primary} size={34} strokeWidth={2} />
            <Text style={styles.photoLabel}>{t('recipes.addPhoto')}</Text>
          </View>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    hero: {
      height: 300,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroImage: {
      width: '100%',
      height: '100%',
    },
    heroPressable: {
      width: '100%',
      height: '100%',
    },
    changeBadge: {
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    uploadOverlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    uploadText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    uploadTrack: {
      width: 160,
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    uploadFill: {
      height: '100%',
      backgroundColor: 'rgba(255,255,255,0.9)',
      borderRadius: 999,
    },
    actionRow: {
      position: 'absolute',
      right: 16,
      bottom: 16,
      flexDirection: 'row',
      gap: 8,
    },
    removeBadge: {
      backgroundColor: 'rgba(0,0,0,0.45)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
    },
    removeBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    changeBadgeText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },
    photoButton: {
      width: 130,
      height: 130,
      borderRadius: 65,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.2)',
      transform: [{ translateY: -8 }],
    },
    photoInner: {
      alignItems: 'center',
      gap: theme.spacing.s1,
    },
    photoLabel: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
