import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  imageUrl?: string | null;
  onPress?: () => void;
  onRemove?: () => void;
  isUploading?: boolean;
};

export function RecipeHero({ imageUrl, onPress, onRemove, isUploading }: Props) {
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
      colors={['#F7F5EB', '#F7F5EB']}
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
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
          {isUploading ? (
            <View style={styles.uploadOverlay}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.uploadText}>Uploading…</Text>
              <View style={styles.uploadTrack}>
                <Animated.View style={[styles.uploadFill, { width: progressWidth }]} />
              </View>
            </View>
          ) : null}
          {!isUploading && (onPress || onRemove) ? (
            <View style={styles.actionRow}>
              {onRemove ? (
                <Pressable onPress={onRemove} style={styles.removeBadge}>
                  <Text style={styles.removeBadgeText}>Remove photo</Text>
                </Pressable>
              ) : null}
              {onPress ? (
                <Pressable onPress={onPress} style={styles.changeBadge}>
                  <Text style={styles.changeBadgeText}>Change photo</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Pressable>
      ) : (
        <Pressable style={styles.photoButton} onPress={onPress} disabled={isUploading}>
          <View style={styles.photoInner}>
            <ImagePlus color={theme.colors.primary} size={34} strokeWidth={2} />
            <Text style={styles.photoLabel}>Add photo</Text>
          </View>
        </Pressable>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
