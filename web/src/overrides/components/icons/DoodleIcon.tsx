// Web version of app/src/components/icons/DoodleIcon.tsx: the same icons, drawn by the browser as SVG images.
// (Every Skia canvas on the web needs its own GPU context, and browsers only allow ~16, so the many small icons
// don't use Skia here.) `svgFor` is the same as the app's, for the few big drawings that still use Skia.
import { Skia, type SkSVG } from '@shopify/react-native-skia';
import { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ICON_SVGS, type IconName } from '@/components/icons/svgs';
import { INK } from '@/lib/colors';

export const ICON_COLOR = INK;
export const UI_STROKE = 2;
const OWN_STROKE = new Set<IconName>(['photoFrame']);

type Props = {
  name: IconName;
  strokeWidth?: number;
  size: number;
  color?: string;
  fill?: string;
  style?: StyleProp<ViewStyle>;
};

/** The icon's SVG source, recolored and sized (the same rewriting as the app's svgFor). */
export function svgSource(name: IconName, width: number, height: number, color = ICON_COLOR, fill?: string, strokeWidth?: number) {
  let source: string = ICON_SVGS[name]
    .replace(/<svg width="[^"]*" height="[^"]*"/, `<svg width="${width}" height="${height}"`)
    .replaceAll('stroke="white"', `stroke="${color}"`);
  if (fill) source = source.replace('<path ', `<path fill="${fill}" `);
  if (strokeWidth != null) {
    source = source
      .replaceAll(/ stroke-width="[^"]*"/g, '')
      .replaceAll('<path data-fine="1" ', `<path stroke-width="${strokeWidth / 2}" `)
      .replaceAll(/<path (?!stroke-width)/g, `<path stroke-width="${strokeWidth}" `);
  }
  return source;
}

const skiaCache = new Map<string, SkSVG | null>();
export function svgFor(name: IconName, width: number, height: number, color = ICON_COLOR, fill?: string, strokeWidth?: number) {
  const key = `${name}|${width}|${height}|${color}|${fill ?? ''}|${strokeWidth ?? ''}`;
  if (!skiaCache.has(key)) skiaCache.set(key, Skia.SVG.MakeFromString(svgSource(name, width, height, color, fill, strokeWidth)));
  return skiaCache.get(key)!;
}

const viewBox = (name: IconName) => {
  const [, , w, h] = ICON_SVGS[name]
    .match(/viewBox="([^"]+)"/)![1]
    .split(' ')
    .map(Number);
  return { w, h };
};

const dataUri = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

export const DoodleIcon = memo(function DoodleIcon({ name, size, color = ICON_COLOR, fill, strokeWidth: given, style }: Props) {
  const strokeWidth = given ?? (OWN_STROKE.has(name) ? undefined : UI_STROKE);
  const { w, h } = viewBox(name);
  const scale = size / Math.max(w, h);
  const width = w * scale;
  const height = h * scale;
  // room around the drawing so lines touching its edge aren't cut off (the layout size stays the icon's)
  const pad = (strokeWidth ?? UI_STROKE) / 2 + 1;
  const svg = svgSource(name, width, height, color, fill, strokeWidth != null ? strokeWidth / scale : undefined)
    .replace(/viewBox="([^"]+)"/, (_, vb: string) => {
      const [x, y, vw, vh] = vb.split(' ').map(Number);
      const p = pad / scale;
      return `viewBox="${x - p} ${y - p} ${vw + 2 * p} ${vh + 2 * p}"`;
    })
    .replace(/<svg width="[^"]*" height="[^"]*"/, `<svg width="${width + 2 * pad}" height="${height + 2 * pad}"`);
  return (
    <View style={[{ width: width + 2 * pad, height: height + 2 * pad, margin: -pad }, style]} pointerEvents="none">
      <img src={dataUri(svg)} alt="" draggable={false} style={{ width: width + 2 * pad, height: height + 2 * pad, display: 'block' }} />
    </View>
  );
});

export const iconStyles = StyleSheet.create({});
