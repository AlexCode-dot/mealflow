import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ImageAttribution } from '@/src/features/recipes/types';

/** Where the credit leads when Pexels didn't give us the photo's own page. */
const PEXELS_HOME_URL = 'https://www.pexels.com';

type Props = {
  attribution: ImageAttribution;
  /**
   * Which bottom corner to anchor the pill in. The editor hero keeps its
   * change/remove badges bottom-right, so screens with those anchor left.
   */
  position?: 'bottom-right' | 'bottom-left';
  /** Extra lift for screens where a sheet overlaps the bottom edge of the image. */
  bottomOffset?: number;
};

/**
 * Small tappable credit over a stock photo — "Foto: {photographer} · Pexels" — linking back to
 * the photo's page on Pexels, as the provider's API terms require.
 */
export function PhotoAttributionBadge({
  attribution,
  position = 'bottom-right',
  bottomOffset = 0,
}: Props) {
  const { t } = useTranslation();

  const photographer = attribution.photographer?.trim();
  const label = photographer
    ? t('recipes.photoAttribution', { photographer })
    : t('recipes.photoAttributionUnnamed');

  const openSource = async () => {
    const url = attribution.sourceUrl?.trim() || PEXELS_HOME_URL;
    const supported = await Linking.canOpenURL(url);
    await Linking.openURL(supported ? url : PEXELS_HOME_URL);
  };

  return (
    <Pressable
      onPress={openSource}
      style={[
        styles.badge,
        position === 'bottom-left' ? styles.left : styles.right,
        bottomOffset ? { bottom: 10 + bottomOffset } : null,
      ]}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    bottom: 10,
    maxWidth: '70%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  right: {
    right: 12,
  },
  left: {
    left: 12,
  },
  text: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '600',
  },
});
