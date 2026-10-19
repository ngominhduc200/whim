import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { Easing, useDerivedValue, useSharedValue, withRepeat, withSequence, withTiming, type SharedValue } from 'react-native-reanimated';

const YELLOW = '#FFD900';
const DRAW_MS = 1100;
const HOLD_MS = 350;

// steady, repeatable "hand tremor" (no randomness, so the loader looks the same every time)
const wobble = (i: number, seed: number) => Math.sin(i * 12.9898 + seed * 78.233) * 0.5 + Math.sin(i * 4.1 + seed) * 0.5;

/**
 * A loading indicator in the doodle style: a scribbled yellow sun (a circle gone over twice, then rays scribbled
 * back and forth) that draws itself, holds for a moment, and draws again.
 */
export function DoodleLoader({ size = 64, color = YELLOW }: { size?: number; color?: string }) {
  const { circle, rays } = useMemo(() => {
    const c = size / 2;
    const r = size * 0.2;
    const circlePath = Skia.Path.Make();
    const n = 90;
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2 * 2.3;
      const rr = r * (1 + 0.07 * wobble(i, 1));
      const x = c + Math.cos(a) * rr;
      const y = c + Math.sin(a) * rr;
      if (i === 0) circlePath.moveTo(x, y);
      else circlePath.lineTo(x, y);
    }
    const raysPath = Skia.Path.Make();
    const count = 8;
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + 0.1 * wobble(k, 2);
      const r0 = r * 1.45;
      const r1 = r * (2.05 + 0.15 * wobble(k, 3));
      const [x0, y0, x1, y1] = [c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * r1, c + Math.sin(a) * r1];
      raysPath.moveTo(x0, y0);
      raysPath.lineTo(x1, y1);
      raysPath.lineTo(x0 + size * 0.01 * wobble(k, 4), y0 + size * 0.01 * wobble(k, 5));
    }
    return { circle: circlePath, rays: raysPath };
  }, [size]);

  // the circle draws first, then the rays; then a short hold, and again
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withRepeat(
        withSequence(withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: HOLD_MS })),
        -1,
      ),
    );
  }, [t]);
  const circleEnd = useDerivedEnd(t, 0, 0.6);
  const raysEnd = useDerivedEnd(t, 0.55, 1);

  const stroke = Math.max(2, size * 0.06);
  return (
    <Canvas style={{ width: size, height: size }}>
      <Path path={circle} style="stroke" strokeWidth={stroke} strokeCap="round" strokeJoin="round" color={color} end={circleEnd} />
      <Path path={rays} style="stroke" strokeWidth={stroke} strokeCap="round" strokeJoin="round" color={color} end={raysEnd} />
    </Canvas>
  );
}

/** Maps the loop's 0..1 onto one part's own 0..1, between `from` and `to`. */
function useDerivedEnd(t: SharedValue<number>, from: number, to: number) {
  return useDerivedValue(() => Math.min(1, Math.max(0, (t.get() - from) / (to - from))));
}
