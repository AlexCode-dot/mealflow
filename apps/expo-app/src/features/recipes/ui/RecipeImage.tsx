import { useEffect, useState } from 'react';
import {
  Image,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import type { ImageFocus } from '@/src/features/recipes/types';
import { computeFocusedLayout, isCentredFocus } from '@/src/features/recipes/utils/imageFocus';

type Size = { width: number; height: number };

// Fetched once per URL: the same photo shows up in the list, the week plan and the details
// screen, and for a remote image every Image.getSize is a network round-trip.
const naturalSizes = new Map<string, Size>();

/** The photo's pixel size, which framing needs and a plain cover image does not. */
export function useNaturalImageSize(uri: string | null): Size | null {
  const [size, setSize] = useState<Size | null>(() =>
    uri ? (naturalSizes.get(uri) ?? null) : null,
  );

  useEffect(() => {
    if (!uri) {
      setSize(null);
      return;
    }
    const cached = naturalSizes.get(uri);
    if (cached) {
      setSize(cached);
      return;
    }
    let cancelled = false;
    Image.getSize(
      uri,
      (width, height) => {
        if (width <= 0 || height <= 0) return;
        naturalSizes.set(uri, { width, height });
        if (!cancelled) setSize({ width, height });
      },
      // Unknown size: stay on the plain cover fallback rather than show nothing.
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [uri]);

  return size;
}

type Props = {
  uri: string;
  focus?: ImageFocus | null;
  /** Sizes the box; the photo always fills it. */
  style?: StyleProp<ViewStyle>;
};

/**
 * A recipe photo that honours the user's framing. With no framing (or an exactly centred one) it
 * is a plain cover image, so recipes nobody has framed render exactly as they always did.
 */
export function RecipeImage({ uri, focus, style }: Props) {
  const framed = !isCentredFocus(focus);
  const natural = useNaturalImageSize(framed ? uri : null);
  const [box, setBox] = useState<Size | null>(null);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((prev) => (prev?.width === width && prev?.height === height ? prev : { width, height }));
  };

  const layout =
    framed && focus && natural && box && box.width > 0 && box.height > 0
      ? computeFocusedLayout(box.width, box.height, natural.width, natural.height, focus)
      : null;

  return (
    <View style={[styles.box, style]} onLayout={framed ? onLayout : undefined}>
      <Image
        source={{ uri }}
        resizeMode="cover"
        style={layout ? [styles.positioned, layout] : styles.fill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  positioned: {
    position: 'absolute',
  },
});
