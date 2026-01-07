import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export function useFocusAnim(params: { isFocused: boolean; labelHeight: number }) {
  const { isFocused, labelHeight } = params;
  const t = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: isFocused ? 1 : 0,
      duration: 170,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isFocused, t]);

  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  const iconTranslateY = t.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -(labelHeight / 2 + 2)],
  });

  const labelOpacity = t;
  const labelTranslateY = t.interpolate({ inputRange: [0, 1], outputRange: [4, 0] });

  return { scale, iconTranslateY, labelOpacity, labelTranslateY };
}
