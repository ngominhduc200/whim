import { Canvas, ImageSVG, Skia, type SkSVG } from '@shopify/react-native-skia';
import { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { ICON_SVGS, type IconName } from './svgs';

import { INK } from '@/lib/colors';

export const ICON_COLOR = INK;

/**
 * Every icon's lines are drawn this wide, in points, whatever the icon's size, so lines match across the UI.
 * The photo frame keeps its own thick line.
 */
export const UI_STROKE = 2;
const OWN_STROKE = new Set<IconName>(['photoFrame']);

type Props = {
  name: IconName;
  /** Line width in points, regardless of the icon's size (defaults to UI_STROKE). */
  strokeWidth?: number;
  /** Length of the icon's longer side, in points; the other side keeps the icon's proportions. */
  size: number;
  color?: string;
  /** Fills the icon's first shape (the hand-drawn circle of the camera button). */
  fill?: string;
  style?: StyleProp<ViewStyle>;
};

const cache = new Map<string, SkSVG | null>();

// The icons are drawn with white strokes; recolor by rewriting the SVG source, once per name/size/color/fill.
// Skia draws an SVG at its own width/height (ignoring the size it's given), so the size is written in too;
// the viewBox scales the drawing to it. `strokeWidth` (in the SVG's own units) overrides an explicit stroke-width.
export function svgFor(name: IconName, width: number, height: number, color = ICON_COLOR, fill?: string, strokeWidth?: number) {
  const key = `${name}|${width}|${height}|${color}|${fill ?? ''}|${strokeWidth ?? ''}`;
  if (!cache.has(key)) {
    let source: string = ICON_SVGS[name]
      .replace(/<svg width="[^"]*" height="[^"]*"/, `<svg width="${width}" height="${height}"`)
      .replaceAll('stroke="white"', `stroke="${color}"`);
    if (fill) source = source.replace('<path ', `<path fill="${fill}" `);
    if (strokeWidth != null) {
      // paths marked data-fine (the avatar's eyes) get half the line, so small details stay delicate
      source = source
        .replaceAll(/ stroke-width="[^"]*"/g, '')
        .replaceAll('<path data-fine="1" ', `<path stroke-width="${strokeWidth / 2}" `)
        .replaceAll(/<path (?!stroke-width)/g, `<path stroke-width="${strokeWidth}" `);
    }
    cache.set(key, Skia.SVG.MakeFromString(source));
  }
  return cache.get(key)!;
}

const viewBox = (name: IconName) => {
  const [, , w, h] = ICON_SVGS[name]
    .match(/viewBox="([^"]+)"/)![1]
    .split(' ')
    .map(Number);
  return { w, h };
};

/** One of the hand-drawn icons, drawn with Skia from its SVG. */
export const DoodleIcon = memo(function DoodleIcon({ name, size, color = ICON_COLOR, fill, strokeWidth: given, style }: Props) {
  const strokeWidth = given ?? (OWN_STROKE.has(name) ? undefined : UI_STROKE);
  const { w, h } = viewBox(name);
  const scale = size / Math.max(w, h);
  const width = w * scale;
  const height = h * scale;
  // Lines are drawn centered on the drawing's edge, so half of a line that touches the edge would fall outside
  // the icon and get cut off. The canvas reaches a little past the icon's box on every side (the box itself, and
  // so the layout, stays the same size).
  const pad = (strokeWidth ?? UI_STROKE) / 2 + 1;
  return (
    <Canvas style={[{ width: width + 2 * pad, height: height + 2 * pad, margin: -pad }, style]} pointerEvents="none">
      <ImageSVG
        svg={svgFor(name, width, height, color, fill, strokeWidth != null ? strokeWidth / scale : undefined)}
        x={pad}
        y={pad}
        width={width}
        height={height}
      />
    </Canvas>
  );
});
