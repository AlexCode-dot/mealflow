import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/src/shared/theme';
import { hexToRgb, isHexColor, relativeLuminance } from '@/src/shared/theme/color';

type Props = {
  height: number;
  borderRadius: number;
  style?: ViewStyle;
};

/**
 * Subtle “real image later” placeholder:
 * - soft base gradient
 * - animated shimmer sweep
 */
export function Shimmer({ height, borderRadius, style }: Props) {
  const theme = useTheme();
  const x = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({
    inputRange: [-1, 1],
    outputRange: [-320, 320],
  });

  const palette = useMemo(() => {
    const bgLight = theme.colors.bgLight;
    const surface = theme.colors.surface;
    const neutral = theme.colors.borderNeutral;
    const isLightBg = isHexColor(bgLight) ? relativeLuminance(bgLight) > 0.72 : false;
    const shimmerAlpha = isLightBg ? 0.26 : 0.18;
    const shimmerOpacity = isLightBg ? 0.65 : 0.55;
    const overlayAlpha = isLightBg ? 0.03 : 0.02;
    if (isHexColor(bgLight) && isHexColor(surface) && isHexColor(neutral)) {
      return {
        base: [
          toRgba(bgLight, 0.9),
          toRgba(surface, 0.9),
          toRgba(surface, 0.95),
          toRgba(neutral, 0.3),
        ] as const,
        background: toRgba(bgLight, 0.8),
        shimmer: [
          'rgba(255,255,255,0)',
          `rgba(255,255,255,${shimmerAlpha})`,
          'rgba(255,255,255,0)',
        ] as const,
        shimmerOpacity,
        overlay: `rgba(0,0,0,${overlayAlpha})`,
      };
    }
    return {
      base: [
        'rgba(94,120,68,0.10)',
        'rgba(245,241,230,0.55)',
        'rgba(245,241,230,0.35)',
        'rgba(47,74,30,0.06)',
      ] as const,
      background: 'rgba(245,241,230,0.7)',
      shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.2)', 'rgba(255,255,255,0)'] as const,
      shimmerOpacity: 0.6,
      overlay: 'rgba(0,0,0,0.02)',
    };
  }, [theme.colors.bgLight, theme.colors.borderNeutral, theme.colors.surface]);

  return (
    <View
      style={[styles.root, { height, borderRadius, backgroundColor: palette.background }, style]}
    >
      {/* base “photo-ish” gradient */}
      <LinearGradient
        colors={palette.base}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* shimmer sweep */}
      <Animated.View
        style={[
          styles.shimmerWrap,
          {
            transform: [{ translateX }],
            pointerEvents: 'none',
          },
        ]}
      >
        <LinearGradient
          colors={palette.shimmer}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={[styles.shimmer, { opacity: palette.shimmerOpacity }]}
        />
      </Animated.View>

      {/* subtle noise/overlay */}
      <View style={[styles.overlay, { pointerEvents: 'none', backgroundColor: palette.overlay }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    width: 220,
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

function toRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}
