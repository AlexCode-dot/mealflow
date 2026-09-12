import type { ImageFocus } from '@/src/features/recipes/types';

/** Matches the backend's ImageFocusDto cap; beyond this a phone photo only shows its artefacts. */
export const MAX_IMAGE_ZOOM = 4;

export const CENTRED_FOCUS: ImageFocus = { x: 0.5, y: 0.5, zoom: 1 };

export type FocusedImageLayout = { width: number; height: number; left: number; top: number };

function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Size and place an image inside a box so it covers the box at the given zoom, with the focal
 * point as close to the box's centre as the image's edges allow.
 *
 * Shared by the display component and the editor (which runs it on the UI thread), so what the
 * user frames is exactly what every card shows — whatever that card's aspect ratio.
 */
export function computeFocusedLayout(
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
  focus: ImageFocus,
): FocusedImageLayout {
  'worklet';
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight) * focus.zoom;
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  return {
    width,
    height,
    left: clamp(boxWidth / 2 - focus.x * width, boxWidth - width, 0),
    top: clamp(boxHeight / 2 - focus.y * height, boxHeight - height, 0),
  };
}

/**
 * Keep the focal point where the box can actually be centred on it at this zoom. Without this,
 * dragging past an edge builds up slack the user then has to drag back through before anything
 * moves.
 */
export function clampFocus(
  focus: ImageFocus,
  boxWidth: number,
  boxHeight: number,
  imageWidth: number,
  imageHeight: number,
): ImageFocus {
  'worklet';
  const zoom = clamp(focus.zoom, 1, MAX_IMAGE_ZOOM);
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight) * zoom;
  const halfVisibleX = boxWidth / 2 / (imageWidth * scale);
  const halfVisibleY = boxHeight / 2 / (imageHeight * scale);
  return {
    x: clamp(focus.x, halfVisibleX, 1 - halfVisibleX),
    y: clamp(focus.y, halfVisibleY, 1 - halfVisibleY),
    zoom,
  };
}

/** A missing or exactly centred framing renders identically to a plain cover image. */
export function isCentredFocus(focus?: ImageFocus | null): boolean {
  return !focus || (focus.x === 0.5 && focus.y === 0.5 && focus.zoom === 1);
}
