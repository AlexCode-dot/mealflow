import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Crop } from 'lucide-react-native';
import { Button } from '@/src/shared/ui/Button';
import { ModalSheet } from '@/src/shared/ui/ModalSheet';
import { type Theme, useTheme, useThemedStyles } from '@/src/shared/theme';
import type { ImageFocus } from '@/src/features/recipes/types';
import {
  CENTRED_FOCUS,
  clampFocus,
  computeFocusedLayout,
} from '@/src/features/recipes/utils/imageFocus';
import { useNaturalImageSize } from './RecipeImage';

// Framed at the hero's shape (full width × 300 on a typical phone) — the largest place the photo
// appears. The preview shows the grid card's squarer shape, so the user sees the framing hold up
// in a second aspect ratio before saving.
const FRAME_ASPECT = 390 / 300;
const PREVIEW_ASPECT = 180 / 166;

type Props = {
  visible: boolean;
  uri: string;
  focus?: ImageFocus | null;
  onConfirm: (focus: ImageFocus) => void;
  onCancel: () => void;
};

const round = (value: number) => Math.round(value * 10000) / 10000;

export function ImageFocusEditorSheet({ visible, uri, focus, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const natural = useNaturalImageSize(visible && uri ? uri : null);

  // The gesture math runs on the UI thread, so everything it reads lives in shared values.
  const focusX = useSharedValue(CENTRED_FOCUS.x);
  const focusY = useSharedValue(CENTRED_FOCUS.y);
  const zoom = useSharedValue(CENTRED_FOCUS.zoom);
  const imageW = useSharedValue(0);
  const imageH = useSharedValue(0);
  const frameW = useSharedValue(0);
  const frameH = useSharedValue(0);
  const previewW = useSharedValue(0);
  const previewH = useSharedValue(0);
  const panStartX = useSharedValue(0.5);
  const panStartY = useSharedValue(0.5);
  const pinchStartZoom = useSharedValue(1);
  const [frameReady, setFrameReady] = useState(false);

  // Start from the saved framing each time the sheet opens, so Cancel really discards.
  useEffect(() => {
    if (!visible) return;
    const start = focus ?? CENTRED_FOCUS;
    focusX.value = start.x;
    focusY.value = start.y;
    zoom.value = start.zoom;
  }, [visible, focus, focusX, focusY, zoom]);

  useEffect(() => {
    imageW.value = natural?.width ?? 0;
    imageH.value = natural?.height ?? 0;
  }, [natural, imageW, imageH]);

  const onFrameLayout = (event: LayoutChangeEvent) => {
    frameW.value = event.nativeEvent.layout.width;
    frameH.value = event.nativeEvent.layout.height;
    setFrameReady(true);
  };

  const onPreviewLayout = (event: LayoutChangeEvent) => {
    previewW.value = event.nativeEvent.layout.width;
    previewH.value = event.nativeEvent.layout.height;
  };

  const pan = Gesture.Pan()
    .onStart(() => {
      panStartX.value = focusX.value;
      panStartY.value = focusY.value;
    })
    .onUpdate((event) => {
      if (imageW.value === 0 || frameW.value === 0) return;
      const shown = computeFocusedLayout(frameW.value, frameH.value, imageW.value, imageH.value, {
        x: focusX.value,
        y: focusY.value,
        zoom: zoom.value,
      });
      // Dragging the photo right moves the focal point left: the finger carries the image.
      const next = clampFocus(
        {
          x: panStartX.value - event.translationX / shown.width,
          y: panStartY.value - event.translationY / shown.height,
          zoom: zoom.value,
        },
        frameW.value,
        frameH.value,
        imageW.value,
        imageH.value,
      );
      focusX.value = next.x;
      focusY.value = next.y;
    });

  const pinch = Gesture.Pinch()
    .onStart(() => {
      pinchStartZoom.value = zoom.value;
    })
    .onUpdate((event) => {
      if (imageW.value === 0 || frameW.value === 0) return;
      const next = clampFocus(
        { x: focusX.value, y: focusY.value, zoom: pinchStartZoom.value * event.scale },
        frameW.value,
        frameH.value,
        imageW.value,
        imageH.value,
      );
      focusX.value = next.x;
      focusY.value = next.y;
      zoom.value = next.zoom;
    });

  const gesture = Gesture.Simultaneous(pan, pinch);

  const frameImageStyle = useAnimatedStyle(() => {
    if (imageW.value === 0 || frameW.value === 0) return {};
    return computeFocusedLayout(frameW.value, frameH.value, imageW.value, imageH.value, {
      x: focusX.value,
      y: focusY.value,
      zoom: zoom.value,
    });
  });

  const previewImageStyle = useAnimatedStyle(() => {
    if (imageW.value === 0 || previewW.value === 0) return {};
    return computeFocusedLayout(previewW.value, previewH.value, imageW.value, imageH.value, {
      x: focusX.value,
      y: focusY.value,
      zoom: zoom.value,
    });
  });

  const onReset = () => {
    focusX.value = CENTRED_FOCUS.x;
    focusY.value = CENTRED_FOCUS.y;
    zoom.value = CENTRED_FOCUS.zoom;
  };

  const onDone = () => {
    onConfirm({ x: round(focusX.value), y: round(focusY.value), zoom: round(zoom.value) });
  };

  const imageReady = Boolean(natural) && frameReady;

  return (
    <ModalSheet visible={visible} onClose={onCancel} avoidKeyboard={false}>
      {/* The sheet renders in its own native modal, outside the app's gesture root. */}
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Crop color={theme.colors.primaryDark} size={16} strokeWidth={2.5} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>{t('recipes.imageFocusEditor.title')}</Text>
            <Text style={styles.subtitle}>{t('recipes.imageFocusEditor.subtitle')}</Text>
          </View>
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.frame} onLayout={onFrameLayout}>
            {imageReady ? (
              <Animated.Image
                source={{ uri }}
                resizeMode="cover"
                style={[styles.positioned, frameImageStyle]}
              />
            ) : null}
          </View>
        </GestureDetector>

        <View style={styles.previewRow}>
          <View style={styles.preview} onLayout={onPreviewLayout}>
            {imageReady ? (
              <Animated.Image
                source={{ uri }}
                resizeMode="cover"
                style={[styles.positioned, previewImageStyle]}
              />
            ) : null}
          </View>
          <Text style={styles.previewLabel}>{t('recipes.imageFocusEditor.previewLabel')}</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('recipes.imageFocusEditor.done')}
            variant="primary"
            onPress={onDone}
            disabled={!imageReady}
            containerStyle={styles.confirmBtn}
          />
          <View style={styles.linkRow}>
            <Pressable
              onPress={onReset}
              style={({ pressed }) => [styles.link, pressed ? styles.linkPressed : null]}
              hitSlop={theme.spacing.s2}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>{t('recipes.imageFocusEditor.reset')}</Text>
            </Pressable>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.link, pressed ? styles.linkPressed : null]}
              hitSlop={theme.spacing.s2}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </GestureHandlerRootView>
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
    frame: {
      width: '100%',
      aspectRatio: FRAME_ASPECT,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    positioned: {
      position: 'absolute',
    },
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.s3,
      paddingHorizontal: theme.spacing.s1,
    },
    preview: {
      width: '34%',
      aspectRatio: PREVIEW_ASPECT,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.bgLight,
      borderWidth: 1,
      borderColor: theme.colors.borderNeutral,
    },
    previewLabel: {
      flex: 1,
      color: theme.colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    actions: {
      gap: theme.spacing.s2,
      alignItems: 'center',
    },
    confirmBtn: {
      width: '100%',
    },
    linkRow: {
      flexDirection: 'row',
      gap: theme.spacing.s4,
    },
    link: {
      paddingVertical: theme.spacing.s2,
      paddingHorizontal: theme.spacing.s3,
    },
    linkPressed: {
      opacity: 0.6,
    },
    linkText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '700',
    },
  });
