import { Skia } from '@shopify/react-native-skia';

import { ICON_SVGS } from '@/components/icons/svgs';
import { PHOTO_HEIGHT, PHOTO_WIDTH } from '@/lib/layout';

// The hand-drawn photo frame (icons/svgs.ts `photoFrame`): its size and outline are read from the SVG, so a new
// frame drawing only needs replacing there. Measurements are in the SVG's units, at the editor's photo width
// (PHOTO_WIDTH); scale everything by renderedWidth / PHOTO_WIDTH.

const [FRAME_W, FRAME_H] = ICON_SVGS.photoFrame.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.slice(1).map(Number);
export const FRAME_WIDTH = FRAME_W;
export const FRAME_HEIGHT = FRAME_H;
/** The 272×363 photo sits centered in the frame drawing, this far in from its top-left corner. */
export const FRAME_INSET_X = (FRAME_W - PHOTO_WIDTH) / 2;
export const FRAME_INSET_Y = (FRAME_H - PHOTO_HEIGHT) / 2;

/** The frame line's own path. Its inside is the photo's clipping shape. */
export const FRAME_PATH_D = ICON_SVGS.photoFrame.match(/<path d="([^"]+)"/)![1];

/**
 * The frame outline as a Skia path, placed for a photo whose top-left corner is at (x, y) and drawn at `scale`
 * (rendered photo width / PHOTO_WIDTH). Clip the photo to it so its edges follow the hand-drawn line.
 */
export function framePath(x: number, y: number, scale: number) {
  const path = Skia.Path.MakeFromSVGString(FRAME_PATH_D)!;
  const m = Skia.Matrix();
  m.translate(x - FRAME_INSET_X * scale, y - FRAME_INSET_Y * scale);
  m.scale(scale, scale);
  path.transform(m);
  return path;
}
