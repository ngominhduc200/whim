import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { C } from '@/data/doodleKit';

const DRAW_MS = 2000;
const FADE_MS = 1000;
const WIDTH = 4;
// the wiggle: a hand-drawn wave along the arrow, calming down just before the head so the point reads clearly
const AMPLITUDE = 5;
const WAVELENGTH = 24;
const STRAIGHT_END = 18;
const HEAD = 14;
const HEAD_ANGLE = (38 * Math.PI) / 180;

type Point = { x: number; y: number };

/**
 * A wiggly hand-drawn arrow (the brush's blue) that draws itself from `from` to `to` on screen in 2s, then fades
 * out in 1s. Used to point from you to a moment nearby.
 */
export function GuideArrow({ from, to, onDone }: { from: Point; to: Point; onDone: () => void }) {
  const path = useMemo(() => arrowPath(from, to), [from, to]);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  useEffect(() => {
    progress.set(withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.quad) }));
    opacity.set(
      withDelay(
        DRAW_MS,
        withTiming(0, { duration: FADE_MS }, (done) => {
          if (done) scheduleOnRN(onDone);
        }),
      ),
    );
  }, [progress, opacity, onDone]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={path} style="stroke" strokeWidth={WIDTH} strokeCap="round" strokeJoin="round" color={C.blue} end={progress} />
      </Canvas>
    </Animated.View>
  );
}

/** The shaft as a wave from `from` to `to`, then the head's two barbs (drawn last). */
function arrowPath(from: Point, to: Point) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  const [nx, ny] = [-uy, ux];
  const path = Skia.Path.Make();
  const steps = Math.max(8, Math.round(length / 3));
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * length;
    const calm = Math.min(1, Math.max(0, (length - d) / STRAIGHT_END));
    const off = Math.sin((d / WAVELENGTH) * Math.PI * 2) * AMPLITUDE * calm;
    const [x, y] = [from.x + ux * d + nx * off, from.y + uy * d + ny * off];
    if (i === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  }
  // the head: from one barb's tip in to the point and back out to the other, like a pen would
  const back = Math.atan2(-uy, -ux);
  const barb = (a: number) => [to.x + Math.cos(back + a) * HEAD, to.y + Math.sin(back + a) * HEAD] as const;
  const [l, r] = [barb(HEAD_ANGLE), barb(-HEAD_ANGLE)];
  path.moveTo(l[0], l[1]);
  path.lineTo(to.x, to.y);
  path.lineTo(r[0], r[1]);
  return path;
}
