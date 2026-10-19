import { Skia, type SkPath } from '@shopify/react-native-skia';

/**
 * One press-draw-release. Points are relative to the photo: (0,0) is its top-left corner and (1,1) its
 * bottom-right, so a stroke scales to any size. Strokes may go slightly outside 0..1 (the doodle margin).
 * `width` is in points at the reference photo width (lib/layout.ts PHOTO_WIDTH); scale it with the rendered width.
 */
export type Point = { x: number; y: number };
export type Stroke = { id: string; color: string; width: number; points: Point[] };

export const STROKE_WIDTH = 4;
/** How far outside the photo you can draw, in editor points. */
// (enough for the edit screen's drawing area to reach 24pt from the sides of a 432pt-wide phone)
export const DOODLE_MARGIN = 56;

/** The doodle palette: the brush's color choices, and the colors of the sample posts' doodles. */
export const BRUSH_COLORS = [
  { name: 'Orange', value: '#FF6A18' },
  { name: 'Yellow', value: '#FFD900' },
  { name: 'Green', value: '#2FCB62' },
  { name: 'Blue', value: '#2F80FF' },
  { name: 'Pink', value: '#E55BE0' },
  { name: 'White', value: '#FFFFFF' },
] as const;

/** Smooth path through points (midpoint quadratic curves), in pixels for a photo of size w×h at offset (ox, oy). */
export function strokePath(points: Point[], w: number, h: number, ox = 0, oy = 0): SkPath {
  'worklet';
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  const px = (i: number) => ox + points[i].x * w;
  const py = (i: number) => oy + points[i].y * h;
  path.moveTo(px(0), py(0));
  if (points.length === 1) {
    path.lineTo(px(0) + 0.01, py(0)); // a tap draws a dot (round cap)
    return path;
  }
  for (let i = 1; i < points.length - 1; i++) {
    path.quadTo(px(i), py(i), (px(i) + px(i + 1)) / 2, (py(i) + py(i + 1)) / 2);
  }
  path.lineTo(px(points.length - 1), py(points.length - 1));
  return path;
}

function distToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len));
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

/** Ids of strokes that pass within `radius` pixels of (x, y). Coordinates are in photo pixels (w×h). */
export function strokesHit(strokes: Stroke[], x: number, y: number, w: number, h: number, radius: number): string[] {
  const p = { x, y };
  const hit: string[] = [];
  for (const s of strokes) {
    const pts = s.points.map((q) => ({ x: q.x * w, y: q.y * h }));
    const r = radius + s.width / 2;
    const touches =
      pts.length === 1 ? Math.hypot(pts[0].x - x, pts[0].y - y) <= r : pts.some((q, i) => i > 0 && distToSegment(p, pts[i - 1], q) <= r);
    if (touches) hit.push(s.id);
  }
  return hit;
}
