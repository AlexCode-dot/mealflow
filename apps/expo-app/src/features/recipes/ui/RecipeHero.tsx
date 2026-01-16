import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ImagePlus } from 'lucide-react-native';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  imageUrl?: string | null;
  onPress?: () => void;
};

export function RecipeHero({ imageUrl, onPress }: Props) {
  return (
    <LinearGradient
      colors={['#F7F5EB', '#F7F5EB']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.hero}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
      ) : (
        <Pressable style={styles.photoButton} onPress={onPress}>
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
