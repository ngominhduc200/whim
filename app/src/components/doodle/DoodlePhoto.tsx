import { Canvas, Group, Image, ImageSVG, Path, Rect } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import { FRAME_HEIGHT, FRAME_INSET_X, FRAME_INSET_Y, FRAME_WIDTH, framePath } from '@/components/frame';
import { svgFor } from '@/components/icons/DoodleIcon';
import { PHOTO_WIDTH } from '@/lib/layout';
import { useCachedPhoto } from '@/lib/imageCache';
import { DOODLE_MARGIN, strokePath, type Stroke } from '@/lib/strokes';

type Props = {
  /** The photo: a bundled asset (sample posts) or a file. */
  source: number | { uri: string };
  strokes: Stroke[];
  /** Rendered photo width; height is 3:4. Strokes, the frame and the doodle margin scale with it. */
  width: number;
  /** 0..1 trim of every stroke at once. Omit to show the finished doodles. */
  progress?: SharedValue<number>;
  /** Width of the hand-drawn frame's line in points. Defaults to scaling with the photo. */
  frameStroke?: number;
  style?: StyleProp<ViewStyle>;
  /** Draw the doodles (the back photo in a cluster stack has none). */
  showStrokes?: boolean;
};

/**
 * A post's photo in its hand-drawn frame, with its doodles replayed from stroke data. The photo is clipped to the
 * frame's outline, so its edges follow the drawn line. The outer box includes the doodle margin, so lines drawn
 * just outside the photo still show. Place it at the photo's position minus `doodleMargin(width)`.
 */
export function DoodlePhoto({ source, strokes, width, progress, frameStroke, style, showStrokes = true }: Props) {
  const height = (width * 4) / 3;
  const scale = width / PHOTO_WIDTH;
  const m = doodleMargin(width);
  // decoded once and kept, so the photo is there right away when this post shows up again
  const image = useCachedPhoto(source);

  const paths = useMemo(
    () =>
      showStrokes
        ? strokes.map((s) => ({
            id: s.id,
            color: s.color,
            width: Math.max(1, s.width * scale),
            path: strokePath(s.points, width, height, m, m),
          }))
        : [],
    [strokes, width, height, m, scale, showStrokes],
  );
  const clip = useMemo(() => framePath(m, m, scale), [m, scale]);

  // the frame drawing at this size; a fixed line width is converted to the SVG's own units
  const frameW = FRAME_WIDTH * scale;
  const frameH = FRAME_HEIGHT * scale;
  const frameSvg = svgFor('photoFrame', frameW, frameH, undefined, undefined, frameStroke != null ? frameStroke / scale : undefined);

  return (
    <View style={[{ width: width + 2 * m, height: height + 2 * m }, style]} pointerEvents="box-none">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* the photo fills the whole frame drawing and is cut to the line, so it reaches the line everywhere */}
        <Group clip={clip}>
          <Rect x={m - FRAME_INSET_X * scale} y={m - FRAME_INSET_Y * scale} width={frameW} height={frameH} color="#f2f2f7" />
          {image && (
            <Image image={image} x={m - FRAME_INSET_X * scale} y={m - FRAME_INSET_Y * scale} width={frameW} height={frameH} fit="cover" />
          )}
        </Group>
        <ImageSVG svg={frameSvg} x={m - FRAME_INSET_X * scale} y={m - FRAME_INSET_Y * scale} width={frameW} height={frameH} />
        {paths.map((p) => (
          <Path
            key={p.id}
            path={p.path}
            style="stroke"
            strokeWidth={p.width}
            strokeCap="round"
            strokeJoin="round"
            color={p.color}
            start={0}
            end={progress ?? 1}
          />
        ))}
      </Canvas>
    </View>
  );
}

/** Doodle margin (space around the photo where strokes may be) for a photo rendered at `width`. */
export const doodleMargin = (width: number) => (DOODLE_MARGIN * width) / PHOTO_WIDTH;
