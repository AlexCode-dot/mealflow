import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { routes } from '@/src/core/navigation/routes';
import {
  AlertTriangle,
  Image as ImageIcon,
  Sparkles,
  Video as VideoIcon,
} from 'lucide-react-native';
import { Button, Screen } from '@/src/shared/ui';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import { useRecipeExtraction } from '@/src/features/recipes/hooks';

type MediaKind = 'image' | 'video';

const PROCESSING_STEPS: { phase: 'uploading' | 'processing'; label: string; body: string }[] = [
  {
    phase: 'uploading',
    label: 'Uploading…',
    body: 'Sending your file to MealFlow.',
  },
  {
    phase: 'processing',
    label: 'Reading the recipe…',
    body: 'Pulling out ingredients, steps and timings.',
  },
];

export function ImportRecipeScreen() {
  const theme = useTheme();
  const { state, actions } = useRecipeExtraction();
  const params = useLocalSearchParams<{ autostart?: string }>();
  const autostart = params.autostart;
  const hasAutostartedRef = useRef(false);
  const phaseRef = useRef(state.phase);
  const mountedRef = useRef(true);
  const initialAutostart = autostart === 'image' || autostart === 'video';
  const [lastMediaKind, setLastMediaKind] = useState<MediaKind | null>(
    initialAutostart ? (autostart as MediaKind) : null,
  );
  // Initialize to true on autostart so we render LaunchingView immediately
  // (no flash of fallback before useEffect fires startKind).
  const [pickerInFlight, setPickerInFlight] = useState(initialAutostart);

  useEffect(() => {
    phaseRef.current = state.phase;
  }, [state.phase]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startKind = useMemo(
    () => async (kind: MediaKind, opts?: { backOnCancel?: boolean }) => {
      setLastMediaKind(kind);
      setPickerInFlight(true);
      try {
        if (kind === 'image') {
          await actions.startFromImage();
        } else {
          await actions.startFromVideo();
        }
        // Yield a frame so the hook's setState calls flush before we read phaseRef.
        await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
        if (
          opts?.backOnCancel &&
          mountedRef.current &&
          phaseRef.current === 'idle' &&
          router.canGoBack()
        ) {
          router.back();
        }
      } finally {
        if (mountedRef.current) setPickerInFlight(false);
      }
    },
    [actions],
  );

  useEffect(() => {
    if (hasAutostartedRef.current) return;
    if (state.phase !== 'idle') return;
    if (autostart !== 'image' && autostart !== 'video') return;
    hasAutostartedRef.current = true;
    // Delay so any preceding modal (e.g. AddRecipeSheet) finishes dismissing before iOS
    // presents the OS image picker. Without this, launchImageLibraryAsync can hang on
    // the modal-stack collision and never resolve.
    const kind = autostart;
    const timer = setTimeout(() => {
      void startKind(kind, { backOnCancel: true });
    }, 400);
    return () => clearTimeout(timer);
  }, [autostart, state.phase, startKind]);

  // Watchdog: if the picker never actually opens (e.g. an iOS modal-stack quirk where
  // launchImageLibraryAsync hangs without resolving), bail out of the LaunchingView so
  // the user can manually retry rather than being stuck on a spinner forever.
  useEffect(() => {
    if (!pickerInFlight) return;
    if (state.phase !== 'idle') return;
    const watchdog = setTimeout(() => {
      if (mountedRef.current && phaseRef.current === 'idle') {
        setPickerInFlight(false);
      }
    }, 8000);
    return () => clearTimeout(watchdog);
  }, [pickerInFlight, state.phase]);

  // Auto-navigate to the review screen as soon as extraction is ready.
  useEffect(() => {
    if (state.phase === 'ready' && state.job?.jobId) {
      router.replace(
        routes.recipeImportReview(
          state.job.jobId,
          state.videoUri ?? undefined,
          state.videoDurationMs ?? undefined,
        ),
      );
    }
  }, [state.phase, state.job?.jobId, state.videoUri, state.videoDurationMs]);

  const inProgress = state.phase === 'uploading' || state.phase === 'processing';
  // Strictly tied to pickerInFlight so we always have a way out if router.back() fails.
  const showLaunching = state.phase === 'idle' && pickerInFlight;
  const showFallbackPickers = state.phase === 'idle' && !inProgress && !showLaunching;

  return (
    <Screen title="Import recipe" showBack onBack={() => router.back()} scroll>
      {showLaunching ? <LaunchingView kind={lastMediaKind ?? 'image'} theme={theme} /> : null}

      {inProgress ? (
        <ProgressView phase={state.phase as 'uploading' | 'processing'} theme={theme} />
      ) : null}

      {state.phase === 'failed' ? (
        <FailedView
          error={state.error}
          mediaKind={lastMediaKind ?? 'image'}
          onRetry={() => {
            actions.reset();
            void startKind(lastMediaKind ?? 'image');
          }}
          onCancel={() => router.back()}
          theme={theme}
        />
      ) : null}

      {showFallbackPickers ? (
        <FallbackPickerView
          theme={theme}
          preferredKind={lastMediaKind}
          onPickImage={() => void startKind('image')}
          onPickVideo={() => void startKind('video')}
        />
      ) : null}
    </Screen>
  );
}

function LaunchingView({ kind, theme }: { kind: MediaKind; theme: Theme }) {
  const styles = useThemedStyles(createStyles);
  const Icon = kind === 'video' ? VideoIcon : ImageIcon;
  return (
    <View style={styles.launchingWrap}>
      <View style={styles.launchingIcon}>
        <Icon color={theme.colors.primaryDark} size={26} strokeWidth={2.25} />
      </View>
      <Text style={styles.launchingText}>
        Opening {kind === 'video' ? 'video' : 'photo'} library…
      </Text>
    </View>
  );
}

function ProgressView({ phase, theme }: { phase: 'uploading' | 'processing'; theme: Theme }) {
  const styles = useThemedStyles(createStyles);
  const pulse = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 6000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    pulseLoop.start();
    rotateLoop.start();
    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
    };
  }, [pulse, rotate]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const innerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const step = PROCESSING_STEPS.find((s) => s.phase === phase) ?? PROCESSING_STEPS[1];

  return (
    <View style={styles.progressWrap}>
      <View style={styles.haloStack}>
        <Animated.View
          style={[styles.haloRing, { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
        />
        <Animated.View style={[styles.haloCore, { transform: [{ scale: innerScale }] }]}>
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Sparkles color={theme.colors.textOnPrimary} size={42} strokeWidth={2.25} />
          </Animated.View>
        </Animated.View>
      </View>

      <View style={styles.progressText}>
        <Text style={styles.progressLabel}>{step.label}</Text>
        <Text style={styles.progressBody}>{step.body}</Text>
      </View>

      <View style={styles.progressSteps}>
        {PROCESSING_STEPS.map((s, idx) => {
          const isActive = s.phase === phase;
          const isPast =
            (phase === 'processing' && s.phase === 'uploading') ||
            (phase === 'uploading' && idx < 0); // placeholder
          return (
            <View key={s.phase} style={styles.stepRow}>
              <View
                style={[
                  styles.stepDot,
                  isActive ? styles.stepDotActive : null,
                  isPast ? styles.stepDotPast : null,
                ]}
              />
              <Text
                style={[
                  styles.stepLabel,
                  isActive ? styles.stepLabelActive : null,
                  isPast ? styles.stepLabelPast : null,
                ]}
              >
                {s.label.replace('…', '')}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.progressFootnote}>
        This usually takes 5–30 seconds. You can keep the app open.
      </Text>
    </View>
  );
}

function FailedView({
  error,
  mediaKind,
  onRetry,
  onCancel,
  theme,
}: {
  error: string | null;
  mediaKind: MediaKind;
  onRetry: () => void;
  onCancel: () => void;
  theme: Theme;
}) {
  const styles = useThemedStyles(createStyles);
  const retryLabel = mediaKind === 'video' ? 'Pick a different video' : 'Pick a different photo';
  return (
    <View style={styles.failedWrap}>
      <View style={styles.failedIcon}>
        <AlertTriangle color={theme.colors.error} size={28} strokeWidth={2.25} />
      </View>
      <Text style={styles.failedTitle}>That didn&apos;t work</Text>
      <Text style={styles.failedBody}>
        {error ??
          (mediaKind === 'video'
            ? 'We couldn’t read a recipe from this clip. Try a shorter or clearer one.'
            : 'We couldn’t read a recipe from this photo. Try a clearer shot.')}
      </Text>
      <View style={styles.failedActions}>
        <Button title={retryLabel} variant="primary" onPress={onRetry} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} />
      </View>
    </View>
  );
}

function FallbackPickerView({
  theme,
  preferredKind,
  onPickImage,
  onPickVideo,
}: {
  theme: Theme;
  preferredKind: MediaKind | null;
  onPickImage: () => void;
  onPickVideo: () => void;
}) {
  const styles = useThemedStyles(createStyles);
  const isVideoFocus = preferredKind === 'video';
  const isPhotoFocus = preferredKind === 'image';
  const isFocused = isVideoFocus || isPhotoFocus;

  const Icon = isVideoFocus ? VideoIcon : ImageIcon;
  const heroTitle = isFocused
    ? isVideoFocus
      ? 'Pick a video'
      : 'Pick a photo'
    : 'Import a recipe';
  const heroBody = isFocused
    ? isVideoFocus
      ? 'A short cooking clip — TikTok, Reel or any saved video.'
      : 'A screenshot or photo of a recipe works best.'
    : 'Choose a photo or short video and we’ll try to extract the recipe.';

  return (
    <View style={styles.fallbackWrap}>
      <View style={styles.fallbackHero}>
        <View
          style={[
            styles.fallbackHeroIcon,
            isVideoFocus ? styles.fallbackHeroIconVideo : null,
            isPhotoFocus ? styles.fallbackHeroIconPhoto : null,
          ]}
        >
          <Icon color={theme.colors.textOnPrimary} size={28} strokeWidth={2.25} />
        </View>
        <Text style={styles.fallbackTitle}>{heroTitle}</Text>
        <Text style={styles.fallbackBody}>{heroBody}</Text>
      </View>

      <View style={styles.fallbackActions}>
        {isVideoFocus ? (
          <>
            <Button
              title="Pick a video"
              variant="primary"
              onPress={onPickVideo}
              containerStyle={styles.fallbackButton}
            />
            <Button
              title="Use a photo instead"
              variant="secondary"
              onPress={onPickImage}
              containerStyle={styles.fallbackButton}
            />
          </>
        ) : isPhotoFocus ? (
          <>
            <Button
              title="Pick a photo"
              variant="primary"
              onPress={onPickImage}
              containerStyle={styles.fallbackButton}
            />
            <Button
              title="Use a video instead"
              variant="secondary"
              onPress={onPickVideo}
              containerStyle={styles.fallbackButton}
            />
          </>
        ) : (
          <>
            <Button
              title="Pick a photo"
              variant="primary"
              onPress={onPickImage}
              containerStyle={styles.fallbackButton}
            />
            <Button
              title="Pick a video"
              variant="secondary"
              onPress={onPickVideo}
              containerStyle={styles.fallbackButton}
            />
          </>
        )}
      </View>

      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Tips for best results</Text>

        <View style={styles.tipRow}>
          <View style={styles.tipIconBox}>
            <ImageIcon color={theme.colors.primaryDark} size={16} strokeWidth={2.25} />
          </View>
          <Text style={styles.tipText}>
            Photos: aim for a clear, readable view of the whole recipe.
          </Text>
        </View>

        <View style={styles.tipRow}>
          <View style={styles.tipIconBox}>
            <VideoIcon color={theme.colors.primaryDark} size={16} strokeWidth={2.25} />
          </View>
          <Text style={styles.tipText}>
            Videos: max 100 MB and ~5 minutes. On-screen ingredient text helps a lot.
          </Text>
        </View>

        <View style={styles.tipRow}>
          <View style={styles.tipIconBox}>
            <Sparkles color={theme.colors.primaryDark} size={16} strokeWidth={2.25} />
          </View>
          <Text style={styles.tipText}>
            Quantities are sometimes missing in TikToks — review and fill them in before saving.
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    // ---- Progress (primary state) ----
    progressWrap: {
      alignItems: 'center',
      paddingTop: theme.spacing.s6,
      paddingBottom: theme.spacing.s5,
      gap: theme.spacing.s5,
    },
    haloStack: {
      width: 132,
      height: 132,
      alignItems: 'center',
      justifyContent: 'center',
    },
    haloRing: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 999,
      backgroundColor: theme.colors.primaryLight,
    },
    haloCore: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primaryDark,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.primaryDark,
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 6,
    },
    progressText: {
      alignItems: 'center',
      gap: theme.spacing.s1,
      paddingHorizontal: theme.spacing.s4,
    },
    progressLabel: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    progressBody: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 20,
    },
    progressSteps: {
      gap: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s5,
      alignSelf: 'stretch',
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
    },
    stepDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.borderNeutral,
    },
    stepDotActive: {
      backgroundColor: theme.colors.primaryDark,
    },
    stepDotPast: {
      backgroundColor: theme.colors.primary,
    },
    stepLabel: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    stepLabelActive: {
      color: theme.colors.text,
    },
    stepLabelPast: {
      color: theme.colors.textMuted,
      textDecorationLine: 'line-through',
    },
    progressFootnote: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '600',
      textAlign: 'center',
      paddingHorizontal: theme.spacing.s5,
    },

    // ---- Failed ----
    failedWrap: {
      alignItems: 'center',
      paddingTop: theme.spacing.s6,
      paddingBottom: theme.spacing.s4,
      gap: theme.spacing.s3,
    },
    failedIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.errorBg,
      marginBottom: theme.spacing.s2,
    },
    failedTitle: {
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '900',
      textAlign: 'center',
    },
    failedBody: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.s4,
    },
    failedActions: {
      alignSelf: 'stretch',
      gap: theme.spacing.s2,
      marginTop: theme.spacing.s3,
    },

    // ---- Launching (brief while OS picker opens on autostart) ----
    launchingWrap: {
      alignItems: 'center',
      paddingTop: theme.spacing.s6,
      gap: theme.spacing.s3,
    },
    launchingIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      alignItems: 'center',
      justifyContent: 'center',
    },
    launchingText: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },

    // ---- Fallback (idle) ----
    fallbackWrap: {
      gap: theme.spacing.s5,
    },
    fallbackHero: {
      alignItems: 'center',
      gap: theme.spacing.s2,
      paddingTop: theme.spacing.s4,
      paddingBottom: theme.spacing.s2,
    },
    fallbackHeroIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryDark,
      marginBottom: theme.spacing.s2,
    },
    fallbackHeroIconVideo: {
      backgroundColor: theme.colors.primaryDark,
    },
    fallbackHeroIconPhoto: {
      backgroundColor: theme.colors.primary,
    },
    fallbackTitle: {
      color: theme.colors.text,
      fontSize: 22,
      fontWeight: '900',
      textAlign: 'center',
    },
    fallbackBody: {
      color: theme.colors.textMuted,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.s4,
    },
    fallbackActions: {
      gap: theme.spacing.s2,
    },
    fallbackButton: {
      width: '100%',
    },
    tipsCard: {
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      padding: theme.spacing.s4,
      gap: theme.spacing.s3,
    },
    tipsTitle: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: theme.spacing.s3,
    },
    tipIconBox: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bg,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    tipText: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '500',
      paddingTop: 4,
    },
  });
