import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Positions measured from design/1-landing.png (scaled to a 393pt-wide iPhone), adjusted since.

/** Every UI element (everything but the map itself) keeps this distance from the left and right screen edges. */
export const EDGE = 24;

// iOS standard sizes (Human Interface Guidelines): every tap target is at least 44×44pt, and icons in bars
// and corner buttons are ~22pt.
export const TAP = 44;
export const BAR_ICON = 22;

/** The big round button on the map and the camera shutter share this exact frame. */
export const SHUTTER_SIZE = 94;

export function useShutterFrame() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // sketch puts it ~19pt above the bottom edge (never on the home indicator), lifted a further 24pt
  const bottom = Math.max(insets.bottom, 19) + 24;
  return { width: SHUTTER_SIZE, height: SHUTTER_SIZE, left: (width - SHUTTER_SIZE) / 2, bottom };
}

export const PROFILE_SIZE = 47;
/** The pfp button's top, below the safe area. The compass and the post view's X line up with its center. */
export const PROFILE_TOP = 28;
/** Top-left buttons (Exit, Cancel, Back, the post's X): a 44pt tap box, centered level with the pfp button. */
export const TOP_BUTTON_TOP = PROFILE_TOP + PROFILE_SIZE / 2 - TAP / 2;
/** The X icon in those top-left buttons: a little smaller than a standard bar icon. */
export const CLOSE_ICON = 18;
export const PROFILE_RIGHT = EDGE;

export const CONTROL_SIZE = TAP;
export const CONTROL_RIGHT = EDGE;
export const CONTROL_GAP = 12;

/**
 * Bottom offsets of the map's right-hand controls, stacked with even gaps: − sits lowest, its bottom edge level
 * with the capture button's, then +, then focus.
 */
export function useMapControlsLayout() {
  const { bottom } = useShutterFrame();
  const step = CONTROL_SIZE + CONTROL_GAP;
  return { zoomOut: bottom, zoomIn: bottom + step, focus: bottom + 2 * step };
}

// Photo window from design/2-camera.png and 3-edit.png: 272pt wide, 3:4, ~176pt from the top.
// It stays in the same spot on the camera, edit and overlay screens so nothing jumps between them.
export const PHOTO_WIDTH = 272;
export const PHOTO_HEIGHT = Math.round((PHOTO_WIDTH * 4) / 3);
const PHOTO_TOP = 176;

export function usePhotoFrame() {
  const { width } = useWindowDimensions();
  return { left: Math.round((width - PHOTO_WIDTH) / 2), top: PHOTO_TOP, width: PHOTO_WIDTH, height: PHOTO_HEIGHT };
}
