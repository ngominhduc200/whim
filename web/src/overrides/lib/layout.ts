// Web version of app/src/lib/layout.ts: the same layout, except the capture flow's photo also fits short screens.
// In a phone's browser the address and tab bars take part of the screen, so when the photo (with the drawing room
// around it) wouldn't fit between the X at the top and the brush panel at the bottom, it shrinks and is centered
// in that space. With room enough (as in the desktop page's phone frame), it's exactly the app's.
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DOODLE_MARGIN } from '@/lib/strokes';

import { PHOTO_HEIGHT, PHOTO_WIDTH, TAP, TOP_BUTTON_TOP } from '../../../../app/src/lib/layout';

export * from '../../../../app/src/lib/layout';

const PHOTO_TOP = 176;
// the brush panel (176pt) and the undo/redo pill above it (64pt)
const PANEL = 176 + 64;

// The screen's full height for this width. On a phone the browser's height shrinks while the keyboard is open,
// which must not resize or move the photo, so the tallest height seen at this width is used (a rotation, which
// changes the width, starts over).
let tallest = { width: 0, height: 0 };
function fullHeight(width: number, height: number) {
  if (width !== tallest.width || height > tallest.height) tallest = { width, height };
  return tallest.height;
}

export function usePhotoFrame() {
  const { width, height: current } = useWindowDimensions();
  const height = fullHeight(width, current);
  const insets = useSafeAreaInsets();
  const top = insets.top + TOP_BUTTON_TOP + TAP + 8; // just below the X
  const bottom = height - insets.bottom - PANEL; // just above the brush panel
  const app = { left: Math.round((width - PHOTO_WIDTH) / 2), top: PHOTO_TOP, width: PHOTO_WIDTH, height: PHOTO_HEIGHT };
  if (app.top - DOODLE_MARGIN >= top && app.top + app.height + DOODLE_MARGIN <= bottom) return app;
  // as big as fits between the two (the drawing room around it stays the same), and no bigger than the app's
  const photoH = Math.max(160, Math.min(PHOTO_HEIGHT, bottom - top - 2 * DOODLE_MARGIN));
  const photoW = (photoH * 3) / 4;
  return {
    left: Math.round((width - photoW) / 2),
    top: Math.round(top + DOODLE_MARGIN + Math.max(0, (bottom - top - 2 * DOODLE_MARGIN - photoH) / 2)),
    width: photoW,
    height: photoH,
  };
}
