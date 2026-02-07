import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Check, Minus } from 'lucide-react-native';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Variant = 'success' | 'error' | 'info';

type Props = {
  title?: string;
  message: string;
  meta?: string;
  icon?: ReactNode;
  variant?: Variant;
  durationMs?: number;
  onTimeout?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ToastBanner({
  title,
  message,
  meta,
  icon,
  variant = 'info',
  durationMs = 2200,
  onTimeout,
  actionLabel,
  onAction,
  actionDisabled = false,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const palette = useMemo(() => getVariantPalette(theme, variant), [theme, variant]);
  const progress = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-120)).current;
  const ringSize = 26;
  const ringStroke = 3;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const defaultIcon = useMemo(() => {
    if (variant === 'success') {
      return <Check color={palette.borderColor} size={18} strokeWidth={2.8} />;
    }
    if (variant === 'error') {
      return <Minus color={palette.borderColor} size={18} strokeWidth={2.8} />;
    }
    return null;
  }, [palette.borderColor, variant]);

  useEffect(() => {
    const appearDelayMs = 90;
    const appearDurationMs = 520;
    opacity.setValue(0);
    translateY.setValue(-120);

    const appearAnim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: appearDurationMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: appearDurationMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    if (!durationMs) {
      appearAnim.start();
      return undefined;
    }

    const fadeDurationMs = 260;
    const fadeDelayMs = Math.max(durationMs - fadeDurationMs, 0);

    progress.setValue(1);
    const progressAnim = Animated.timing(progress, {
      toValue: 0,
      duration: durationMs,
      easing: Easing.linear,
      delay: appearDelayMs + appearDurationMs,
      useNativeDriver: false,
    });

    const fadeAnim = Animated.timing(opacity, {
      toValue: 0,
      duration: fadeDurationMs,
      delay: appearDelayMs + appearDurationMs + fadeDelayMs,
      useNativeDriver: true,
    });

    const anim = Animated.parallel([progressAnim, fadeAnim]);
    Animated.sequence([Animated.delay(appearDelayMs), appearAnim, anim]).start(({ finished }) => {
      if (finished) onTimeout?.();
    });

    return () => {
      anim.stop();
    };
  }, [durationMs, message, onTimeout, opacity, progress, title, translateY, variant]);

  const timerRing =
    durationMs && !actionLabel ? (
      <View style={styles.timer}>
        <Svg width={ringSize} height={ringSize}>
          <Circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            stroke={palette.borderColor}
            strokeOpacity={0.2}
            strokeWidth={ringStroke}
            fill="none"
          />
          <AnimatedCircle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={ringRadius}
            stroke={palette.borderColor}
            strokeWidth={ringStroke}
            strokeLinecap="round"
            strokeDasharray={`${ringCircumference} ${ringCircumference}`}
            strokeDashoffset={progress.interpolate({
              inputRange: [0, 1],
              outputRange: [ringCircumference, 0],
            })}
            fill="none"
            transform={`rotate(-90 ${ringSize / 2} ${ringSize / 2})`}
          />
        </Svg>
      </View>
    ) : null;

  const action =
    actionLabel && onAction ? (
      <Pressable
        onPress={onAction}
        disabled={actionDisabled}
        style={[
          styles.action,
          { borderColor: palette.borderColor, opacity: actionDisabled ? 0.45 : 1 },
        ]}
      >
        <Text style={[styles.actionText, { color: palette.textColor }]}>{actionLabel}</Text>
      </Pressable>
    ) : null;

  return (
    <Animated.View
      style={[
        styles.root,
        {
          backgroundColor: palette.backgroundColor,
          borderColor: palette.borderColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {icon || defaultIcon ? (
        <View
          style={[
            styles.icon,
            { borderColor: palette.borderColor, backgroundColor: palette.iconBg },
          ]}
        >
          {icon ?? defaultIcon}
        </View>
      ) : null}
      <View style={styles.text}>
        {title ? <Text style={[styles.title, { color: palette.textColor }]}>{title}</Text> : null}
        <Text style={[styles.message, { color: palette.textColor }]}>{message}</Text>
        {meta ? <Text style={[styles.meta, { color: palette.textColor }]}>{meta}</Text> : null}
      </View>
      {action}
      {timerRing}
    </Animated.View>
  );
}

function getVariantPalette(theme: Theme, variant: Variant) {
  if (variant === 'success') {
    return {
      backgroundColor: theme.colors.successBanner,
      borderColor: theme.colors.primaryDark,
      textColor: theme.colors.primaryDark,
      iconBg: theme.colors.successBanner,
    };
  }
  if (variant === 'error') {
    return {
      backgroundColor: theme.colors.errorBg,
      borderColor: theme.colors.error,
      textColor: theme.colors.error,
      iconBg: theme.colors.errorBg,
    };
  }
  return {
    backgroundColor: theme.colors.bgLight,
    borderColor: theme.colors.borderNeutral,
    textColor: theme.colors.textMuted,
    iconBg: theme.colors.bgLight,
  };
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s4,
      borderWidth: 2,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.s4,
      paddingVertical: theme.spacing.s3,
      shadowColor: theme.colors.text,
      shadowOpacity: 0.45,
      shadowRadius: 36,
      shadowOffset: { width: 0, height: 14 },
      elevation: 22,
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
    },
    message: {
      fontSize: 13,
      fontWeight: '600',
    },
    meta: {
      fontSize: 12,
      fontWeight: '600',
      opacity: 0.7,
    },
    action: {
      borderWidth: 2,
      borderRadius: 999,
      paddingHorizontal: theme.spacing.s3,
      paddingVertical: theme.spacing.s1,
    },
    actionText: {
      fontSize: 12,
      fontWeight: '700',
    },
    timer: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
