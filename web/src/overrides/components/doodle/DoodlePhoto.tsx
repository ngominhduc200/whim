// Web version of app/src/components/doodle/DoodlePhoto.tsx: the same photo in its hand-drawn frame with its
// doodles (and their replay), drawn as one SVG by the browser. On the web every Skia canvas needs its own GPU
// context and browsers allow only ~16, while the map shows dozens of these.
import { Asset } from 'expo-asset';
import { useEffect, useId, useMemo, useRef } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { FRAME_HEIGHT, FRAME_INSET_X, FRAME_INSET_Y, FRAME_PATH_D, FRAME_WIDTH } from '@/components/frame';
import { ICON_SVGS } from '@/components/icons/svgs';
import { PHOTO_WIDTH } from '@/lib/layout';
import { DOODLE_MARGIN, type Point, type Stroke } from '@/lib/strokes';

type Props = {
  source: number | { uri: string };
  strokes: Stroke[];
  width: number;
  progress?: SharedValue<number>;
  frameStroke?: number;
  style?: StyleProp<ViewStyle>;
  showStrokes?: boolean;
};

/** The same smooth line through a stroke's points as the app's strokePath, as SVG path data. */
function strokeD(points: Point[], w: number, h: number, ox: number, oy: number) {
  if (!points.length) return '';
  const px = (i: number) => ox + points[i].x * w;
  const py = (i: number) => oy + points[i].y * h;
  let d = `M${px(0)} ${py(0)}`;
  if (points.length === 1) return `${d}L${px(0) + 0.01} ${py(0)}`;
  for (let i = 1; i < points.length - 1; i++) d += `Q${px(i)} ${py(i)} ${(px(i) + px(i + 1)) / 2} ${(py(i) + py(i + 1)) / 2}`;
  return `${d}L${px(points.length - 1)} ${py(points.length - 1)}`;
}

// the frame drawing's own markup (its paths), drawn in its own units
const FRAME_INNER = ICON_SVGS.photoFrame.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export function DoodlePhoto({ source, strokes, width, progress, frameStroke, style, showStrokes = true }: Props) {
  const height = (width * 4) / 3;
  const scale = width / PHOTO_WIDTH;
  const m = doodleMargin(width);
  const clipId = `clip-${useId().replace(/[:«»]/g, '')}`;
  const uri = typeof source === 'number' ? Asset.fromModule(source).uri : source.uri;

  const paths = useMemo(
    () =>
      showStrokes
        ? strokes.map((s) => ({ id: s.id, color: s.color, width: Math.max(1, s.width * scale), d: strokeD(s.points, width, height, m, m) }))
        : [],
    [strokes, width, height, m, scale, showStrokes],
  );

  // the replay: every line trimmed to the same fraction (pathLength 1), following the progress value
  const strokesRef = useRef<SVGGElement>(null);
  useEffect(() => {
    if (!progress) return;
    let frame = 0;
    const tick = () => {
      strokesRef.current?.style.setProperty('--trim', String(1 - progress.get()));
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [progress]);

  const frameX = m - FRAME_INSET_X * scale;
  const frameY = m - FRAME_INSET_Y * scale;
  const frameW = FRAME_WIDTH * scale;
  const frameH = FRAME_HEIGHT * scale;
  const frameInner = frameStroke != null ? FRAME_INNER.replaceAll(/stroke-width="[^"]*"/g, `stroke-width="${frameStroke / scale}"`) : FRAME_INNER;
  const W = width + 2 * m;
  const H = height + 2 * m;

  return (
    <View style={[{ width: W, height: H }, style]} pointerEvents="box-none">
      <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none' }}>
        <defs>
          <clipPath id={clipId}>
            <path d={FRAME_PATH_D} transform={`translate(${frameX} ${frameY}) scale(${scale})`} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <rect x={frameX} y={frameY} width={frameW} height={frameH} fill="#f2f2f7" />
          {uri ? <image href={uri} x={frameX} y={frameY} width={frameW} height={frameH} preserveAspectRatio="xMidYMid slice" /> : null}
        </g>
        <g transform={`translate(${frameX} ${frameY}) scale(${scale})`} fill="none" dangerouslySetInnerHTML={{ __html: frameInner }} />
        <g ref={strokesRef} style={progress ? ({ '--trim': '1' } as React.CSSProperties) : undefined}>
          {paths.map((p) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={p.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={progress ? 1 : undefined}
              strokeDasharray={progress ? '1 1' : undefined}
              style={progress ? { strokeDashoffset: 'var(--trim)' } : undefined}
            />
          ))}
        </g>
      </svg>
    </View>
  );
}

/** Doodle margin (space around the photo where strokes may be) for a photo rendered at `width`. */
export const doodleMargin = (width: number) => (DOODLE_MARGIN * width) / PHOTO_WIDTH;
