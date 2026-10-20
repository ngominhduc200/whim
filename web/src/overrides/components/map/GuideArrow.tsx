// Web version of app/src/components/map/GuideArrow.tsx: the same wiggly blue arrow (same shape and timing),
// drawn and animated as an SVG line by the browser.
import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

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

export function GuideArrow({ from, to, onDone, leaving = false }: { from: Point; to: Point; onDone: () => void; leaving?: boolean }) {
  const d = useMemo(() => arrowPath(from, to), [from, to]);
  const pathRef = useRef<SVGPathElement>(null);
  const fadeRef = useRef<Animation | null>(null);
  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    // draws itself (a dash the length of the line, slid into view), then the whole arrow fades
    const draw = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: DRAW_MS, easing: 'ease-in-out', fill: 'forwards' });
    const fade = path.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, delay: DRAW_MS, fill: 'forwards' });
    fade.onfinish = onDone;
    fadeRef.current = fade;
    return () => {
      draw.cancel();
      fade.cancel();
    };
    // started once; the line can change shape while it draws (its tip follows the pin)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onDone]);
  // you moved the map: fade out now, wherever it's up to (the line keeps drawing as it fades)
  useEffect(() => {
    const path = pathRef.current;
    if (!leaving || !path) return;
    fadeRef.current?.cancel();
    const out = path.animate([{ opacity: getComputedStyle(path).opacity }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    out.onfinish = onDone;
    return () => out.cancel();
  }, [leaving, onDone]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke={C.blue}
          strokeWidth={WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1}
        />
      </svg>
    </View>
  );
}

/** The shaft as a wave from `from` to `to`, then the head's two barbs (drawn last). */
function arrowPath(from: Point, to: Point): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  const [nx, ny] = [-uy, ux];
  let out = '';
  const steps = Math.max(8, Math.round(length / 3));
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * length;
    const calm = Math.min(1, Math.max(0, (length - d) / STRAIGHT_END));
    const off = Math.sin((d / WAVELENGTH) * Math.PI * 2) * AMPLITUDE * calm;
    const [x, y] = [from.x + ux * d + nx * off, from.y + uy * d + ny * off];
    out += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  // the head: from one barb's tip in to the point and back out to the other, like a pen would
  const back = Math.atan2(-uy, -ux);
  const barb = (a: number) => [to.x + Math.cos(back + a) * HEAD, to.y + Math.sin(back + a) * HEAD] as const;
  const [l, r] = [barb(HEAD_ANGLE), barb(-HEAD_ANGLE)];
  out += `M${l[0]} ${l[1]}L${to.x} ${to.y}L${r[0]} ${r[1]}`;
  return out;
}
