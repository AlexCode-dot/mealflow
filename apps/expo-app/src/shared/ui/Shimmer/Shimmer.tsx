import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
  const x = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: 1,
        duration: 1400,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );

    loop.start();
    return () => loop.stop();
  }, [x]);

  const translateX = x.interpolate({
    inputRange: [-1, 1],
    outputRange: [-180, 180],
  });

  return (
    <View style={[styles.root, { height, borderRadius }, style]}>
      {/* base “photo-ish” gradient */}
      <LinearGradient
        colors={['rgba(94,120,68,0.10)', 'rgba(245,241,230,0.55)', 'rgba(47,74,30,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* shimmer sweep */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerWrap,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>

      {/* subtle noise/overlay */}
      <View pointerEvents="none" style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: 'rgba(245,241,230,0.7)',
  },
  shimmerWrap: {
    ...StyleSheet.absoluteFillObject,
  },
  shimmer: {
    width: 120,
    height: '100%',
    opacity: 0.9,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
});
