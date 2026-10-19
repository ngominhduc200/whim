import { Canvas, Path } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DOODLE_MARGIN, STROKE_WIDTH, strokePath, type Point, type Stroke } from '@/lib/strokes';

export type DoodleTool = 'none' | 'brush' | 'eraser';

type Props = {
  /** Photo frame in screen coordinates. */
  frame: { left: number; top: number; width: number; height: number };
  /** How far past the photo you can draw, on every side (at most DOODLE_MARGIN). */
  margin?: number;
  strokes: Stroke[];
  tool: DoodleTool;
  color: string;
  onStroke: (points: Point[]) => void;
  /** Called with the touch position in photo pixels; `first` is true at the start of each eraser drag. */
  onErase: (x: number, y: number, first: boolean) => void;
};

/** Skia layer over the photo. Strokes are clipped to the photo plus the margin (the canvas bounds). */
export function DoodleCanvas({ frame, margin = DOODLE_MARGIN, strokes, tool, color, onStroke, onErase }: Props) {
  const { width: W, height: H } = frame;
  const M = margin;
  const current = useSharedValue<Point[]>([]);
  const currentPath = useDerivedValue(() => strokePath(current.get(), W, H, M, M));

  // the stroke being drawn is cleared once its committed copy has rendered, so it never flickers
  useEffect(() => {
    current.set([]);
  }, [strokes, current]);

  const paths = useMemo(() => strokes.map((s) => ({ s, path: strokePath(s.points, W, H, M, M) })), [strokes, W, H, M]);

  const gesture = useMemo(() => {
    // touch (canvas pixels) -> photo-relative point, clamped to the drawable area
    const toPoint = (x: number, y: number): Point => {
      'worklet';
      return {
        x: (Math.min(Math.max(x, 0), W + 2 * M) - M) / W,
        y: (Math.min(Math.max(y, 0), H + 2 * M) - M) / H,
      };
    };
    if (tool === 'eraser') {
      return Gesture.Pan()
        .minDistance(0)
        .maxPointers(1)
        .onBegin((e) => scheduleOnRN(onErase, e.x - M, e.y - M, true))
        .onUpdate((e) => scheduleOnRN(onErase, e.x - M, e.y - M, false));
    }
    return Gesture.Pan()
      .enabled(tool === 'brush')
      .minDistance(0)
      .maxPointers(1)
      .onBegin((e) => {
        current.set([toPoint(e.x, e.y)]);
      })
      .onUpdate((e) => {
        current.modify((pts) => {
          'worklet';
          pts.push(toPoint(e.x, e.y));
          return pts;
        });
      })
      .onFinalize(() => {
        if (current.get().length > 0) scheduleOnRN(onStroke, current.get().slice());
      });
  }, [tool, W, H, M, current, onStroke, onErase]);

  const box = { left: frame.left - M, top: frame.top - M, width: W + 2 * M, height: H + 2 * M };

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.abs, box]} pointerEvents={tool === 'none' ? 'none' : 'auto'}>
        <Canvas style={StyleSheet.absoluteFill}>
          {paths.map(({ s, path }) => (
            <Path key={s.id} path={path} style="stroke" strokeWidth={s.width} strokeCap="round" strokeJoin="round" color={s.color} />
          ))}
          <Path path={currentPath} style="stroke" strokeWidth={STROKE_WIDTH} strokeCap="round" strokeJoin="round" color={color} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
