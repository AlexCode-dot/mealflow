import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, RefreshControl, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/src/shared/theme/theme';

type Props = {
  hero: ReactNode;
  heroHeight: number;
  children: ReactNode;
  sheetOverlap?: number;
  heroBleed?: number;
  refreshing?: boolean;
  onRefresh?: () => void | Promise<void>;
};

export function RecipeSheetLayout({
  hero,
  heroHeight,
  children,
  sheetOverlap = 63,
  heroBleed = 0,
  refreshing = false,
  onRefresh,
}: Props) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const [containerHeight, setContainerHeight] = useState(0);

  const minSheetHeight = useMemo(
    () => Math.max(0, containerHeight - heroHeight + sheetOverlap),
    [containerHeight, heroHeight, sheetOverlap],
  );

  const heroTranslateY = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 40],
    extrapolate: 'clamp',
  });

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerHeight(event.nativeEvent.layout.height);
  };

  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.scrollContent, { minHeight: containerHeight }]}
      style={styles.scroll}
      showsVerticalScrollIndicator={false}
      onLayout={handleLayout}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      })}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primaryDark}
            colors={[theme.colors.primaryDark]}
            progressBackgroundColor={theme.colors.bgLight}
          />
        ) : undefined
      }
    >
      <Animated.View
        style={[
          styles.heroWrap,
          { transform: [{ translateY: heroTranslateY }], paddingBottom: heroBleed },
        ]}
      >
        {hero}
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.32)']}
          locations={[0, 0.6, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.heroFade, { bottom: -87 + heroBleed, height: 220 + heroBleed }]}
        />
      </Animated.View>

      <View style={[styles.panelShadow, { marginTop: -sheetOverlap, minHeight: minSheetHeight }]}>
        <View style={styles.panel}>{children}</View>
      </View>
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: theme.colors.bgLight,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: theme.colors.bg,
  },
  heroWrap: {
    position: 'relative',
  },
  heroFade: {
    position: 'absolute',
    left: -60,
    right: -60,
    bottom: -87,
    height: 220,
    pointerEvents: 'none',
  },
  panelShadow: {
    backgroundColor: theme.colors.bg,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    flexGrow: 1,
  },
  panel: {
    backgroundColor: theme.colors.bg,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(198,192,168,0.6)',
    borderBottomWidth: 0,
    overflow: 'hidden',
    flexGrow: 1,
  },
});
