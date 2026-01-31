import { Animated, PanResponder, StyleSheet, View } from 'react-native';
import { useEffect, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastBanner } from '@/src/shared/ui/ToastBanner/ToastBanner';
import { useRetryCountdown } from '@/src/shared/hooks/useRetryCountdown';
import { useGlobalToast } from './GlobalToastProvider';
import { theme } from '@/src/shared/theme/theme';

export function GlobalToastHost() {
  const { toast, clear } = useGlobalToast();
  const insets = useSafeAreaInsets();
  const retry = useRetryCountdown(toast?.retryAfterSeconds);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    translateY.setValue(0);
  }, [toast, translateY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dy) > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy < 0) {
            translateY.setValue(gesture.dy);
          }
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy < -40) {
            Animated.timing(translateY, {
              toValue: -120,
              duration: 160,
              useNativeDriver: true,
            }).start(() => {
              clear();
            });
          } else {
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [clear, translateY],
  );

  if (!toast) return null;

  return (
    <View style={[styles.overlay, { pointerEvents: 'box-none' }]}>
      <Animated.View
        style={[styles.wrap, { marginTop: insets.top + 8, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <ToastBanner
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          meta={retry.remaining ? `Try again in ${retry.remaining}s` : toast.meta}
          durationMs={toast.durationMs ?? 0}
          actionLabel={toast.onAction ? (toast.actionLabel ?? 'Retry') : undefined}
          actionDisabled={retry.disabled || toast.actionDisabled}
          onAction={
            toast.onAction
              ? () => {
                  clear();
                  toast.onAction?.();
                }
              : undefined
          }
          onTimeout={toast.durationMs ? clear : undefined}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: theme.spacing.s3,
    right: theme.spacing.s3,
    zIndex: 50,
  },
  wrap: {
    width: '100%',
  },
});
