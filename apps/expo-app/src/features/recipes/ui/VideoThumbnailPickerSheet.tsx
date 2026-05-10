import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Film } from 'lucide-react-native';
import { Button } from '@/src/shared/ui/Button';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';

type Props = {
  visible: boolean;
  videoUri: string | null;
  /** Total video duration in milliseconds. Falls back to a 60s default if not provided. */
  durationMs: number | null;
  onCancel: () => void;
  /** Called with the local URI of the extracted frame and the timestamp it was taken at. */
  onPicked: (uri: string, timeMs: number) => void;
};

const FALLBACK_DURATION_MS = 60_000;
const PREVIEW_DEBOUNCE_MS = 250;

export function VideoThumbnailPickerSheet({
  visible,
  videoUri,
  durationMs,
  onCancel,
  onPicked,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const totalMs = durationMs && durationMs > 0 ? durationMs : FALLBACK_DURATION_MS;

  const [progress, setProgress] = useState(0); // 0..1
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [isExtractingPreview, setIsExtractingPreview] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewOpacity = useRef(new Animated.Value(0)).current;
  const extractPulse = useRef(new Animated.Value(0)).current;

  const measureTrack = useCallback(() => {
    if (!trackRef.current) return;
    trackRef.current.measureInWindow((x, _y, width) => {
      trackPageXRef.current = x;
      trackWidthRef.current = width;
    });
  }, []);

  const generatePreview = useCallback(
    async (timeMs: number) => {
      if (!videoUri) return;
      setIsExtractingPreview(true);
      setExtractError(null);

      // Some video URIs from expo-image-picker on iOS lack the `file://` prefix that
      // AVAssetImageGenerator wants. Normalize defensively.
      const normalizedUri =
        videoUri.startsWith('file://') || videoUri.startsWith('http')
          ? videoUri
          : videoUri.startsWith('/')
            ? `file://${videoUri}`
            : videoUri;

      const safeTime = Math.max(0, Math.min(Math.round(timeMs), totalMs - 100));
      try {
        const result = await VideoThumbnails.getThumbnailAsync(normalizedUri, {
          time: safeTime,
          quality: 0.7,
        });
        setPreviewUri(result.uri);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn('[VideoThumbnailPicker] frame extraction failed', {
          uri: normalizedUri,
          time: safeTime,
          error: message,
        });
        setExtractError(`Couldn't read that frame: ${message}`);
      } finally {
        setIsExtractingPreview(false);
      }
    },
    [totalMs, videoUri],
  );

  // Generate initial preview at 25% of the video when sheet opens.
  useEffect(() => {
    if (visible && videoUri) {
      const initialProgress = 0.25;
      setProgress(initialProgress);
      void generatePreview(initialProgress * totalMs);
    } else if (!visible) {
      setPreviewUri(null);
      setExtractError(null);
      previewOpacity.setValue(0);
    }
  }, [visible, videoUri, totalMs, generatePreview, previewOpacity]);

  // Debounce preview re-extraction while user is sliding.
  useEffect(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void generatePreview(progress * totalMs);
    }, PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [progress, totalMs, generatePreview, visible]);

  // Cross-fade preview on URI change.
  useEffect(() => {
    if (!previewUri) {
      previewOpacity.setValue(0);
      return;
    }
    Animated.timing(previewOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [previewUri, previewOpacity]);

  // Soft pulse while a frame is being extracted (replaces corner spinner).
  useEffect(() => {
    if (!isExtractingPreview) {
      Animated.timing(extractPulse, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(extractPulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(extractPulse, {
          toValue: 0,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isExtractingPreview, extractPulse]);

  const setProgressFromPageX = useCallback((pageX: number) => {
    if (trackWidthRef.current <= 0) return;
    const x = pageX - trackPageXRef.current;
    const next = Math.max(0, Math.min(x / trackWidthRef.current, 1));
    setProgress(next);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        measureTrack();
        setIsDragging(true);
        setProgressFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        setProgressFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: () => setIsDragging(false),
      onPanResponderTerminate: () => setIsDragging(false),
    }),
  ).current;

  const onConfirm = () => {
    if (!previewUri) return;
    onPicked(previewUri, progress * totalMs);
  };

  const formatSeconds = (ms: number) => {
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const pulseOverlayOpacity = extractPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  return (
    <ModalSheet visible={visible} onClose={onCancel} avoidKeyboard={false}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Film color={theme.colors.primaryDark} size={16} strokeWidth={2.5} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Pick a thumbnail</Text>
            <Text style={styles.subtitle}>Drag to find the frame you want.</Text>
          </View>
        </View>

        <View style={styles.previewBox}>
          {previewUri ? (
            <Animated.Image
              source={{ uri: previewUri }}
              style={[styles.preview, { opacity: previewOpacity }]}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <Film color={theme.colors.textMuted} size={28} strokeWidth={2} />
            </View>
          )}

          <Animated.View
            pointerEvents="none"
            style={[styles.pulseOverlay, { opacity: pulseOverlayOpacity }]}
          />

          <View style={styles.timestampChip} pointerEvents="none">
            <Text style={styles.timestampText}>
              {formatSeconds(progress * totalMs)} / {formatSeconds(totalMs)}
            </Text>
          </View>
        </View>

        {extractError ? <Text style={styles.error}>{extractError}</Text> : null}

        <View style={styles.trackHitArea} {...panResponder.panHandlers}>
          <View
            ref={trackRef}
            collapsable={false}
            onLayout={() => measureTrack()}
            style={styles.track}
            pointerEvents="none"
          >
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View
              style={[
                styles.thumb,
                isDragging ? styles.thumbActive : null,
                { left: `${progress * 100}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title="Use this frame"
            variant="primary"
            onPress={onConfirm}
            containerStyle={styles.confirmBtn}
          />
          <Pressable
            onPress={onCancel}
            style={({ pressed }) => [styles.cancelLink, pressed ? styles.cancelLinkPressed : null]}
            hitSlop={theme.spacing.s2}
            accessibilityRole="button"
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      gap: theme.spacing.s4,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s1,
    },
    headerIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    headerText: {
      flex: 1,
      gap: 1,
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    previewBox: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    preview: {
      width: '100%',
      height: '100%',
    },
    previewPlaceholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pulseOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.colors.primaryDark,
    },
    timestampChip: {
      position: 'absolute',
      bottom: theme.spacing.s2,
      right: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s2,
      paddingVertical: 4,
      borderRadius: theme.radius.pill,
      backgroundColor: 'rgba(0,0,0,0.65)',
    },
    timestampText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    error: {
      color: theme.colors.error,
      fontSize: 13,
      paddingHorizontal: theme.spacing.s1,
    },
    trackHitArea: {
      paddingVertical: 18,
      justifyContent: 'center',
    },
    track: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.colors.borderNeutral,
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.primaryDark,
      borderRadius: 3,
    },
    thumb: {
      position: 'absolute',
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: theme.colors.bg,
      borderWidth: 3,
      borderColor: theme.colors.primaryDark,
      transform: [{ translateX: -13 }],
      top: -10,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    thumbActive: {
      width: 30,
      height: 30,
      borderRadius: 15,
      transform: [{ translateX: -15 }],
      top: -12,
      shadowOpacity: 0.28,
      shadowRadius: 10,
    },
    actions: {
      gap: theme.spacing.s2,
      alignItems: 'center',
    },
    confirmBtn: {
      width: '100%',
    },
    cancelLink: {
      paddingVertical: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s3,
    },
    cancelLinkPressed: {
      opacity: 0.6,
    },
    cancelText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
  });
