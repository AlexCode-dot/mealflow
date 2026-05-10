import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { Button, ModalSheet } from '@/src/shared/ui';
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
  const trackWidthRef = useRef(0);
  const trackPageXRef = useRef(0);
  const trackRef = useRef<View | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Surface the underlying error so we can debug — iOS Simulator + asset URIs are
        // a notorious source of issues here.
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
    }
  }, [visible, videoUri, totalMs, generatePreview]);

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
        setProgressFromPageX(evt.nativeEvent.pageX);
      },
      onPanResponderMove: (evt) => {
        setProgressFromPageX(evt.nativeEvent.pageX);
      },
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

  return (
    <ModalSheet visible={visible} onClose={onCancel} avoidKeyboard={false}>
      <View style={styles.root}>
        <Text style={styles.title}>Pick a thumbnail</Text>
        <Text style={styles.subtitle}>Drag the slider to find the frame you want.</Text>

        <View style={styles.previewBox}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.previewPlaceholder}>
              <ActivityIndicator color={theme.colors.primaryDark} />
            </View>
          )}
          {isExtractingPreview && previewUri ? (
            <View style={styles.previewSpinner}>
              <ActivityIndicator color={theme.colors.primaryDark} />
            </View>
          ) : null}
        </View>

        {extractError ? <Text style={styles.error}>{extractError}</Text> : null}

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatSeconds(progress * totalMs)}</Text>
          <Text style={styles.timeText}>{formatSeconds(totalMs)}</Text>
        </View>

        <View style={styles.trackHitArea} {...panResponder.panHandlers}>
          <View
            ref={trackRef}
            collapsable={false}
            onLayout={() => measureTrack()}
            style={styles.track}
            pointerEvents="none"
          >
            <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            <View style={[styles.thumb, { left: `${progress * 100}%` }]} />
          </View>
        </View>

        <View style={styles.actions}>
          <Button title="Cancel" variant="secondary" onPress={onCancel} />
          <Button title="Use this frame" variant="primary" onPress={onConfirm} />
        </View>
      </View>
    </ModalSheet>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    root: {
      padding: theme.spacing.s4,
      gap: theme.spacing.s3,
    },
    title: {
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
    },
    previewBox: {
      width: '100%',
      aspectRatio: 16 / 9,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.bgLight,
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
    previewSpinner: {
      position: 'absolute',
      top: theme.spacing.s2,
      right: theme.spacing.s2,
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: 20,
      padding: 6,
    },
    error: {
      color: theme.colors.error,
      fontSize: 13,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    timeText: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    trackHitArea: {
      // Generous vertical hit area so a finger that drifts off the visible track
      // still keeps the gesture alive.
      paddingVertical: 16,
      justifyContent: 'center',
    },
    track: {
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: theme.colors.primaryLight,
      borderRadius: 14,
    },
    thumb: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.primaryDark,
      borderWidth: 2,
      borderColor: theme.colors.bg,
      transform: [{ translateX: -12 }],
      top: 2,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.s2,
      justifyContent: 'flex-end',
    },
  });
