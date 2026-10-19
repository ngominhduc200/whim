// Hand-drawn doodle pieces for the sample posts: birds, faces, crowns, notes and so on, each placed by a scene
// (data/seedScenes.ts) right where it means something in its photo. Points are photo-relative (0..1, a little
// past the edges is the doodle margin). Every piece is drawn in its own little space, (u, v) in units of `s` (a
// fraction of the photo's height) around its center, with x stretched for the photo's 3:4 shape so circles stay
// round, and a slight wobble so no line is ruler-straight.
import type { Point, Stroke } from '@/lib/strokes';

/** The doodle palette (lib/strokes.ts BRUSH_COLORS). */
export const C = {
  orange: '#FF6A18',
  yellow: '#FFD900',
  green: '#2FCB62',
  blue: '#2F80FF',
  pink: '#E55BE0',
  white: '#FFFFFF',
} as const;

export type Mood = 'happy' | 'joy' | 'calm' | 'sleepy' | 'wow' | 'wink' | 'grumpy';
type UV = [number, number];
type Frame = { cx: number; cy: number; s: number; flip?: boolean; rot?: number };

// Scenes give sizes on a compact scale; every piece is drawn this much bigger.
const GROW = 1.8;
// photo-relative x and y units differ (272 × 363pt), so x offsets are stretched by this to keep circles round
const ASPECT = 363 / 272;
const LINE = 4; // the brush's own width, in editor points
const FINE = 3; // small details: eyes, notes, sparkles

export type Kit = ReturnType<typeof makeKit>;

export function makeKit(rand: () => number, prefix: string) {
  const strokes: Stroke[] = [];
  let n = 0;
  const jit = (a: number) => (rand() - 0.5) * 2 * a;

  const place = (f: Frame, [u, v]: UV): Point => {
    const r = f.rot ?? 0;
    const uu = f.flip ? -u : u;
    const ru = uu * Math.cos(r) - v * Math.sin(r);
    const rv = uu * Math.sin(r) + v * Math.cos(r);
    return { x: f.cx + ru * f.s * ASPECT, y: f.cy + rv * f.s };
  };
  const add = (color: string, width: number, points: Point[]) => {
    strokes.push({ id: `${prefix}-${n++}`, color, width, points });
  };
  // a smooth line through the control points (Catmull-Rom), with a little hand wobble
  const smooth = (f: Frame, ctrl: UV[], closed = false, per = 8, wobble = 0.02): Point[] => {
    const P = closed ? [ctrl[ctrl.length - 1], ...ctrl, ctrl[0], ctrl[1]] : [ctrl[0], ...ctrl, ctrl[ctrl.length - 1]];
    const out: Point[] = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      for (let k = 0; k < per; k++) {
        const t = k / per;
        const c = (a: number, b: number, d: number, e: number) =>
          0.5 * (2 * b + (-a + d) * t + (2 * a - 5 * b + 4 * d - e) * t * t + (-a + 3 * b - 3 * d + e) * t * t * t);
        out.push(place(f, [c(p0[0], p1[0], p2[0], p3[0]) + jit(wobble), c(p0[1], p1[1], p2[1], p3[1]) + jit(wobble)]));
      }
    }
    out.push(place(f, P[P.length - 2]));
    return out;
  };
  // an oval, drawn a touch past once round so its ends overlap like a real pen loop
  const oval = (f: Frame, cu: number, cv: number, rx: number, ry: number, turns = 1.08): Point[] => {
    const steps = Math.max(10, Math.round(28 * turns));
    const start = rand() * Math.PI * 2;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const a = start + (i / steps) * turns * Math.PI * 2;
      const w = 1 + jit(0.04);
      return place(f, [cu + Math.cos(a) * rx * w, cv + Math.sin(a) * ry * w]);
    });
  };
  const line = (f: Frame, a: UV, b: UV): Point[] => smooth(f, [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], b], false, 4);
  const at = (x: number, y: number, s: number, flip = false, rot = 0): Frame => ({ cx: x, cy: y, s: s * GROW, flip, rot });
  // a smooth line through photo points themselves (for paths that cross the picture, like a flight trail)
  const through = (points: [number, number][], per: number): Point[] =>
    smooth(
      { cx: 0, cy: 0, s: 1 },
      points.map(([x, y]): UV => [x / ASPECT, y]),
      false,
      per,
      0.002,
    );

  const kit = {
    strokes,

    /** A face for anything with character: eyes and a mouth in one of a few moods, optionally blushing. */
    face(x: number, y: number, s: number, color: string, mood: Mood = 'happy', blush?: string) {
      const f = at(x, y, s);
      const dot = (u: number) => add(color, FINE, oval(f, u, -0.12, 0.07, 0.09, 1.6));
      const arcUp = (u: number) =>
        add(
          color,
          FINE,
          smooth(f, [
            [u - 0.15, -0.05],
            [u, -0.2],
            [u + 0.15, -0.05],
          ]),
        );
      const arcDown = (u: number) =>
        add(
          color,
          FINE,
          smooth(f, [
            [u - 0.15, -0.14],
            [u, -0.03],
            [u + 0.15, -0.14],
          ]),
        );
      if (mood === 'happy') [-0.32, 0.32].forEach(dot);
      if (mood === 'grumpy') {
        [-0.32, 0.32].forEach(dot);
        // eyebrows slanting down toward the middle
        for (const sign of [-1, 1])
          add(
            color,
            FINE,
            smooth(
              f,
              [
                [sign * 0.55, -0.45],
                [sign * 0.35, -0.38],
                [sign * 0.14, -0.28],
              ],
              false,
              4,
            ),
          );
      }
      if (mood === 'joy' || mood === 'calm') [-0.32, 0.32].forEach(arcUp);
      if (mood === 'sleepy') [-0.32, 0.32].forEach(arcDown);
      if (mood === 'wow') [-0.32, 0.32].forEach((u) => add(color, FINE, oval(f, u, -0.12, 0.12, 0.14, 1.2)));
      if (mood === 'wink') {
        dot(-0.32);
        arcUp(0.32);
      }
      if (mood === 'joy')
        add(
          color,
          FINE,
          smooth(
            f,
            [
              [-0.28, 0.16],
              [0, 0.17],
              [0.28, 0.16],
              [0.16, 0.36],
              [0, 0.42],
              [-0.16, 0.36],
            ],
            true,
          ),
        );
      else if (mood === 'sleepy') add(color, FINE, oval(f, 0, 0.27, 0.07, 0.06));
      else if (mood === 'wow') add(color, FINE, oval(f, 0, 0.3, 0.11, 0.13));
      else if (mood === 'grumpy')
        add(
          color,
          FINE,
          smooth(f, [
            [-0.26, 0.34],
            [0, 0.2],
            [0.26, 0.34],
          ]),
        );
      else
        add(
          color,
          FINE,
          smooth(f, [
            [-0.24, 0.17],
            [0, 0.32],
            [0.24, 0.17],
          ]),
        );
      if (blush)
        for (const u of [-0.55, 0.55])
          add(
            blush,
            FINE,
            smooth(
              f,
              [
                [u - 0.1, 0.18],
                [u - 0.03, 0.08],
                [u + 0.01, 0.2],
                [u + 0.08, 0.1],
              ],
              false,
              3,
            ),
          );
    },

    /** A round little bird perched (feet at the bottom), facing right unless flipped. */
    bird(x: number, y: number, s: number, color: string, flip = false) {
      const f = at(x, y - 0.75 * s * GROW, s, flip);
      add(
        color,
        LINE,
        smooth(f, [
          [-1, 0.05],
          [-0.5, -0.25],
          [0, -0.55],
          [0.45, -0.68],
          [0.75, -0.45],
          [0.7, -0.12],
          [0.5, 0.3],
          [0.1, 0.48],
          [-0.4, 0.35],
          [-1, 0.05],
        ]),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.72, -0.43],
            [1.02, -0.32],
            [0.7, -0.24],
          ],
          false,
          4,
        ),
      );
      add(color, FINE, oval(f, 0.42, -0.4, 0.05, 0.06, 1.5));
      add(
        color,
        FINE,
        smooth(f, [
          [-0.38, -0.02],
          [-0.05, 0.14],
          [0.25, 0.02],
        ]),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.02, 0.48],
            [0, 0.75],
            [0.14, 0.76],
          ],
          false,
          3,
        ),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.28, 0.42],
            [0.28, 0.75],
            [0.42, 0.76],
          ],
          false,
          3,
        ),
      );
    },

    /** A bird in flight, the classic two-arc "m". */
    flyingBird(x: number, y: number, s: number, color: string, flip = false) {
      const f = at(x, y, s, flip);
      add(
        color,
        LINE,
        smooth(f, [
          [-1, 0.1],
          [-0.55, -0.35],
          [-0.05, 0.08],
          [0.45, -0.4],
          [1, -0.05],
        ]),
      );
    },

    /** The cartoon "popping vein" of annoyance: four little curves around a center. */
    anger(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ] as UV[]) {
        add(
          color,
          FINE,
          smooth(
            f,
            [
              [sx * 0.12, sy * 0.45],
              [sx * 0.18, sy * 0.18],
              [sx * 0.45, sy * 0.12],
            ],
            false,
            4,
          ),
        );
      }
    },

    zzz(x: number, y: number, s: number, color: string) {
      [0.45, 0.65, 0.9].forEach((k, i) => {
        const f = at(x + i * s * GROW * 0.32, y - i * s * GROW * 0.45, s * k);
        add(
          color,
          FINE,
          smooth(
            f,
            [
              [-0.3, -0.3],
              [0.3, -0.3],
              [-0.3, 0.3],
              [0.3, 0.3],
            ],
            false,
            3,
          ),
        );
      });
    },

    heart(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      const pts: Point[] = [];
      for (let k = 0; k <= 44; k++) {
        const t = (k / 40) * Math.PI * 2;
        const hx = 16 * Math.sin(t) ** 3;
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        pts.push(place(f, [hx / 32 + jit(0.015), -hy / 32 + jit(0.015)]));
      }
      add(color, LINE, pts);
    },

    sparkle(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      const pts: Point[] = [];
      for (let k = 0; k <= 8; k++) {
        const a = (k / 8) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 === 0 ? 0.5 : 0.13;
        pts.push(place(f, [Math.cos(a) * r, Math.sin(a) * r]));
      }
      add(color, FINE, pts);
    },

    star(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      const pts: Point[] = [];
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 === 0 ? 0.5 : 0.22;
        pts.push(place(f, [Math.cos(a) * r + jit(0.02), Math.sin(a) * r + jit(0.02)]));
      }
      add(color, FINE, pts);
    },

    /** The sun: a round face-able circle with rays. */
    sun(x: number, y: number, s: number, color: string, mood?: Mood, faceColor = C.orange) {
      const f = at(x, y, s);
      add(color, LINE, oval(f, 0, 0, 0.5, 0.5, 1.1));
      const rays = 9;
      for (let k = 0; k < rays; k++) {
        const a = (k / rays) * Math.PI * 2 + jit(0.12);
        add(color, LINE, line(f, [Math.cos(a) * 0.68, Math.sin(a) * 0.68], [Math.cos(a) * 0.95, Math.sin(a) * 0.95]));
      }
      if (mood) kit.face(x, y + s * GROW * 0.02, s * 0.62, faceColor, mood);
    },

    moon(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(f, [
          [0.15, -0.5],
          [-0.3, -0.38],
          [-0.5, 0],
          [-0.3, 0.38],
          [0.15, 0.5],
          [-0.08, 0.2],
          [-0.14, 0],
          [-0.08, -0.2],
          [0.15, -0.5],
        ]),
      );
    },

    cloud(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.9, 0.3],
            [-1, 0.02],
            [-0.7, -0.18],
            [-0.45, -0.45],
            [-0.05, -0.55],
            [0.25, -0.35],
            [0.6, -0.4],
            [0.95, -0.1],
            [0.9, 0.3],
          ],
          true,
        ),
      );
    },

    /** Three wavy lines rising: steam, a smell, warmth. */
    steam(x: number, y: number, s: number, color: string) {
      for (const i of [-1, 0, 1]) {
        const f = at(x + i * s * GROW * 0.2, y, s);
        const ph = rand() * Math.PI;
        add(
          color,
          FINE,
          smooth(
            f,
            Array.from({ length: 5 }, (_, k): UV => [Math.sin(ph + k * 1.6) * 0.1, 0.5 - k * 0.25]),
          ),
        );
      }
    },

    note(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(color, FINE, oval(f, -0.05, 0.38, 0.17, 0.12, 1.6));
      add(color, FINE, line(f, [0.11, 0.36], [0.12, -0.45]));
      add(
        color,
        FINE,
        smooth(f, [
          [0.12, -0.45],
          [0.42, -0.28],
          [0.36, -0.05],
        ]),
      );
    },

    /** A speech bubble (tail toward the speaker at the bottom left, or right if flipped) with a tiny thought. */
    bubble(x: number, y: number, s: number, color: string, say: 'dots' | 'heart' | '!' | '?' | 'note' = 'dots', flip = false) {
      const f = at(x, y, s, flip);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.2, 0.35],
            [-0.65, 0.22],
            [-0.78, -0.08],
            [-0.45, -0.38],
            [0.2, -0.42],
            [0.72, -0.2],
            [0.72, 0.16],
            [0.3, 0.35],
          ],
          true,
        ),
      );
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.32, 0.32],
            [-0.48, 0.62],
            [-0.08, 0.36],
          ],
          false,
          4,
        ),
      );
      if (say === 'dots') for (const u of [-0.3, 0, 0.3]) add(color, FINE, oval(f, u, -0.02, 0.05, 0.06, 1.6));
      if (say === 'heart') kit.heart(f.cx, f.cy - s * 0.02, s * 0.45, color);
      if (say === '!') kit.exclaim(f.cx, f.cy - s * 0.02, s * 0.6, color);
      if (say === '?') kit.question(f.cx, f.cy - s * 0.02, s * 0.6, color);
      if (say === 'note') kit.note(f.cx, f.cy - s * 0.02, s * 0.55, color);
    },

    exclaim(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(color, LINE, line(f, [0, -0.5], [0.02, 0.12]));
      add(color, LINE, oval(f, 0.02, 0.38, 0.04, 0.05, 1.5));
    },

    question(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(f, [
          [-0.28, -0.25],
          [-0.05, -0.5],
          [0.28, -0.32],
          [0.05, -0.02],
          [0.02, 0.15],
        ]),
      );
      add(color, LINE, oval(f, 0.02, 0.4, 0.04, 0.05, 1.5));
    },

    /** Three short speed lines, pointing the way something is moving (angle in degrees, 0 = to the right). */
    motion(x: number, y: number, s: number, color: string, deg = 180) {
      const f = at(x, y, s, false, (deg * Math.PI) / 180);
      for (const v of [-0.3, 0, 0.3]) add(color, FINE, line(f, [-0.5 + Math.abs(v), v], [0.5, v]));
    },

    /** A dashed trail through photo points: a flight path, a route. */
    trail(points: [number, number][], color: string) {
      const pts = through(points, 10);
      for (let i = 0; i + 2 < pts.length; i += 4) add(color, FINE, [pts[i], pts[i + 1], pts[i + 2]]);
    },

    /** A curvy arrow from one photo point to another (`bend` pushes its middle sideways). */
    arrow(x0: number, y0: number, x1: number, y1: number, color: string, bend = 0.15) {
      const mid: [number, number] = [(x0 + x1) / 2 - (y1 - y0) * bend, (y0 + y1) / 2 + (x1 - x0) * bend];
      const pts = through([[x0, y0], mid, [x1, y1]], 8);
      add(color, LINE, pts);
      const [a, b] = [pts[pts.length - 3], pts[pts.length - 1]];
      // the head's two barbs, measured in real (unsqueezed) space so they look even
      const ang = Math.atan2((b.y - a.y) * ASPECT, b.x - a.x);
      for (const d of [-0.5, 0.5]) {
        const t = ang + Math.PI + d;
        add(color, LINE, [b, { x: b.x + Math.cos(t) * 0.035, y: b.y + Math.sin(t) * 0.035 * ASPECT }]);
      }
    },

    crown(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.5, 0.3],
            [-0.52, -0.25],
            [-0.25, 0.05],
            [0, -0.38],
            [0.25, 0.05],
            [0.52, -0.25],
            [0.5, 0.3],
            [-0.5, 0.3],
          ],
          false,
          4,
        ),
      );
      for (const u of [-0.52, 0, 0.52]) add(color, FINE, oval(f, u, u === 0 ? -0.5 : -0.36, 0.05, 0.06, 1.5));
    },

    butterfly(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      for (const flip of [false, true]) {
        const g = { ...f, flip };
        add(
          color,
          LINE,
          smooth(
            g,
            [
              [0, -0.02],
              [-0.35, -0.5],
              [-0.72, -0.38],
              [-0.55, 0],
              [0, 0.02],
            ],
            true,
          ),
        );
        add(
          color,
          LINE,
          smooth(
            g,
            [
              [0, 0.04],
              [-0.45, 0.15],
              [-0.42, 0.48],
              [-0.12, 0.32],
            ],
            true,
          ),
        );
        add(
          color,
          FINE,
          smooth(
            g,
            [
              [0, -0.25],
              [-0.08, -0.45],
              [-0.18, -0.58],
            ],
            false,
            4,
          ),
        );
      }
      add(color, FINE, line(f, [0, -0.25], [0, 0.35]));
    },

    /** A bee, buzzing; give it a trail() for its flight. */
    bee(x: number, y: number, s: number, color: string, flip = false) {
      const f = at(x, y, s, flip);
      add(color, LINE, oval(f, 0, 0.05, 0.42, 0.28, 1.1));
      for (const u of [-0.12, 0.12]) add(color, FINE, line(f, [u, -0.2], [u + 0.02, 0.3]));
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [-0.05, -0.2],
            [-0.3, -0.55],
            [0.02, -0.5],
            [0.05, -0.22],
          ],
          false,
          5,
        ),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.08, -0.2],
            [0.2, -0.6],
            [0.4, -0.42],
            [0.18, -0.18],
          ],
          false,
          5,
        ),
      );
      add(color, FINE, oval(f, 0.3, -0.02, 0.04, 0.05, 1.5));
      add(color, FINE, line(f, [-0.42, 0.05], [-0.58, 0.08]));
    },

    fish(x: number, y: number, s: number, color: string, flip = false) {
      const f = at(x, y, s, flip);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [0.5, 0],
            [0.1, -0.28],
            [-0.35, -0.05],
            [-0.65, -0.28],
            [-0.62, 0.25],
            [-0.35, 0.05],
            [0.1, 0.28],
            [0.5, 0],
          ],
          false,
          6,
        ),
      );
      add(color, FINE, oval(f, 0.25, -0.05, 0.04, 0.05, 1.5));
    },

    flower(x: number, y: number, s: number, color: string, stem?: string) {
      const f = at(x, y, s);
      const pts: Point[] = [];
      for (let k = 0; k <= 120; k++) {
        const t = (k / 120) * Math.PI * 2;
        const r = 0.5 * Math.abs(Math.sin(2.5 * t)) + 0.08;
        pts.push(place(f, [Math.cos(t) * r + jit(0.01), Math.sin(t) * r + jit(0.01)]));
      }
      add(color, FINE, pts);
      add(color, FINE, oval(f, 0, 0, 0.1, 0.1, 1.6));
      if (stem) {
        add(
          stem,
          FINE,
          smooth(f, [
            [0, 0.55],
            [0.05, 0.9],
            [-0.02, 1.25],
          ]),
        );
        add(
          stem,
          FINE,
          smooth(
            f,
            [
              [0.03, 0.95],
              [0.3, 0.8],
              [0.04, 1.02],
            ],
            false,
            4,
          ),
        );
      }
    },

    /** A drop: rain, a tear, a sweat bead. */
    drop(x: number, y: number, s: number, color: string) {
      add(
        color,
        FINE,
        smooth(
          at(x, y, s),
          [
            [0, -0.5],
            [0.28, 0.1],
            [0, 0.4],
            [-0.28, 0.1],
            [0, -0.5],
          ],
          false,
          5,
        ),
      );
    },

    ball(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(color, LINE, oval(f, 0, 0, 0.5, 0.5, 1.1));
      add(
        color,
        FINE,
        smooth(f, [
          [-0.35, -0.35],
          [0.05, -0.05],
          [0.35, 0.35],
        ]),
      );
    },

    /** Little round puffs rising up and to the right (smoke, breath). */
    puffs(x: number, y: number, s: number, color: string, count = 3) {
      for (let i = 0; i < count; i++) {
        const r = 0.25 + i * 0.12;
        add(color, FINE, oval(at(x + i * s * GROW * 0.3, y - i * s * GROW * 0.6, s), 0, 0, r, r, 1.1));
      }
    },

    /** A wavy line across, gone over twice. */
    waves(x0: number, x1: number, y: number, color: string, amp = 0.015) {
      const pts: Point[] = [];
      for (let pass = 0; pass < 2; pass++)
        for (let k = 0; k <= 30; k++) {
          const t = pass === 0 ? k / 30 : 1 - k / 30;
          pts.push({ x: x0 + (x1 - x0) * t, y: y + amp * Math.sin(t * Math.PI * 7) + pass * 0.006 + jit(0.003) });
        }
      add(color, FINE, pts);
    },

    /** Two arms, one each side of something `w` wide (in s units), waving or cheering. */
    arms(x: number, y: number, s: number, w: number, color: string, pose: 'wave' | 'cheer' = 'wave') {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(f, [
          [-w, 0],
          [-w - 0.45, -0.15],
          [-w - 0.6, -0.65],
        ]),
      );
      add(color, FINE, oval(f, -w - 0.6, -0.75, 0.09, 0.1, 1.4));
      if (pose === 'cheer') {
        add(
          color,
          LINE,
          smooth({ ...f, flip: true }, [
            [-w, 0],
            [-w - 0.45, -0.15],
            [-w - 0.6, -0.65],
          ]),
        );
        add(color, FINE, oval({ ...f, flip: true }, -w - 0.6, -0.75, 0.09, 0.1, 1.4));
      } else {
        add(
          color,
          LINE,
          smooth(f, [
            [w, 0],
            [w + 0.4, 0.2],
            [w + 0.6, 0.45],
          ]),
        );
        add(color, FINE, oval(f, w + 0.66, 0.53, 0.09, 0.1, 1.4));
      }
    },

    /** Glow: short rays around something bright. */
    glow(x: number, y: number, s: number, color: string, count = 7, from = 0, to = 360) {
      const f = at(x, y, s);
      for (let k = 0; k < count; k++) {
        const a = ((from + ((to - from) * (k + 0.5)) / count) * Math.PI) / 180;
        add(color, FINE, line(f, [Math.cos(a) * 0.62, Math.sin(a) * 0.62], [Math.cos(a) * 0.95, Math.sin(a) * 0.95]));
      }
    },

    /** Paw prints along photo points. */
    paws(points: [number, number][], s: number, color: string) {
      for (const [px, py] of points) {
        const f = at(px, py, s);
        add(color, FINE, oval(f, 0, 0.12, 0.22, 0.18, 1.3));
        for (const [u, v] of [
          [-0.25, -0.18],
          [0, -0.3],
          [0.25, -0.18],
        ] as UV[])
          add(color, FINE, oval(f, u, v, 0.07, 0.08, 1.5));
      }
    },

    topHat(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(color, LINE, line(f, [-0.62, 0.3], [0.62, 0.3]));
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.35, 0.3],
            [-0.37, -0.45],
            [0.37, -0.45],
            [0.35, 0.3],
          ],
          false,
          4,
        ),
      );
      add(color, FINE, line(f, [-0.36, 0.12], [0.36, 0.12]));
    },

    sunglasses(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      for (const u of [-0.32, 0.32])
        add(
          color,
          LINE,
          smooth(
            f,
            [
              [u - 0.24, -0.1],
              [u + 0.24, -0.1],
              [u + 0.18, 0.12],
              [u - 0.18, 0.12],
            ],
            true,
            4,
          ),
        );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [-0.08, -0.08],
            [0, -0.13],
            [0.08, -0.08],
          ],
          false,
          3,
        ),
      );
    },

    paperPlane(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.6, 0.05],
            [0.62, -0.32],
            [-0.18, 0.32],
            [-0.6, 0.05],
          ],
          false,
          4,
        ),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.62, -0.32],
            [-0.14, 0.06],
            [-0.18, 0.32],
          ],
          false,
          4,
        ),
      );
    },

    crab(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(color, LINE, oval(f, 0, 0.1, 0.5, 0.3, 1.1));
      for (const flip of [false, true]) {
        const g = { ...f, flip };
        add(
          color,
          FINE,
          smooth(g, [
            [-0.45, -0.05],
            [-0.7, -0.3],
            [-0.65, -0.55],
          ]),
        );
        add(
          color,
          FINE,
          smooth(
            g,
            [
              [-0.65, -0.55],
              [-0.85, -0.6],
              [-0.75, -0.42],
              [-0.65, -0.55],
            ],
            false,
            3,
          ),
        );
        for (const v of [0.2, 0.32]) add(color, FINE, line(g, [-0.45, v], [-0.7, v + 0.18]));
        add(color, FINE, line(g, [-0.15, -0.15], [-0.18, -0.38]));
        add(color, FINE, oval(g, -0.18, -0.42, 0.05, 0.06, 1.5));
      }
    },

    caterpillar(x: number, y: number, s: number, color: string, flip = false) {
      const f = at(x, y, s, flip);
      for (let i = 0; i < 5; i++) add(color, FINE, oval(f, -0.8 + i * 0.32, Math.sin(i * 1.3) * 0.08, 0.17, 0.17, 1.1));
      add(color, LINE, oval(f, 0.82, -0.08, 0.24, 0.24, 1.1));
      add(color, FINE, oval(f, 0.88, -0.12, 0.03, 0.04, 1.5));
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.8, -0.3],
            [0.78, -0.5],
            [0.68, -0.58],
          ],
          false,
          3,
        ),
      );
      add(
        color,
        FINE,
        smooth(
          f,
          [
            [0.92, -0.3],
            [1.0, -0.5],
            [1.1, -0.55],
          ],
          false,
          3,
        ),
      );
    },

    mushroom(x: number, y: number, s: number, color: string) {
      const f = at(x, y, s);
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.5, 0],
            [-0.35, -0.38],
            [0, -0.5],
            [0.35, -0.38],
            [0.5, 0],
            [-0.5, 0],
          ],
          false,
          5,
        ),
      );
      add(
        color,
        LINE,
        smooth(
          f,
          [
            [-0.15, 0],
            [-0.17, 0.45],
            [0.17, 0.45],
            [0.15, 0],
          ],
          false,
          3,
        ),
      );
      for (const [u, v] of [
        [-0.22, -0.2],
        [0.15, -0.3],
      ] as UV[])
        add(color, FINE, oval(f, u, v, 0.06, 0.06, 1.4));
    },

    /** A branch with a leaf, for perching. */
    branch(x0: number, y0: number, x1: number, y1: number, color: string) {
      add(color, LINE, [
        { x: x0, y: y0 },
        { x: (x0 * 2 + x1) / 3 + jit(0.004), y: (y0 * 2 + y1) / 3 + jit(0.006) },
        { x: (x0 + x1 * 2) / 3 + jit(0.004), y: (y0 + y1 * 2) / 3 + jit(0.006) },
        { x: x1, y: y1 },
      ]);
      const lx = (x0 + x1) / 2;
      const ly = (y0 + y1) / 2;
      add(
        color,
        FINE,
        smooth(
          at(lx, ly, 0.05 / GROW),
          [
            [0, 0],
            [0.3, -0.6],
            [0.7, -0.75],
            [0.55, -0.2],
            [0, 0],
          ],
          false,
          5,
        ),
      );
    },

    marshmallow(x0: number, y0: number, x1: number, y1: number, stick: string, puff: string) {
      add(stick, LINE, [
        { x: x0, y: y0 },
        { x: (x0 + x1) / 2 + jit(0.005), y: (y0 + y1) / 2 + jit(0.005) },
        { x: x1, y: y1 },
      ]);
      add(
        puff,
        LINE,
        smooth(
          at(x1, y1, 0.045 / GROW),
          [
            [-0.5, -0.4],
            [0.5, -0.45],
            [0.55, 0.4],
            [-0.5, 0.42],
          ],
          true,
          4,
        ),
      );
    },

    /** Cheek blush, on its own (for things that already have eyes, like a real cat). */
    blush(x: number, y: number, s: number, color: string) {
      for (const u of [-0.55, 0.55])
        add(
          color,
          FINE,
          smooth(
            at(x, y, s),
            [
              [u - 0.1, 0.18],
              [u - 0.03, 0.08],
              [u + 0.01, 0.2],
              [u + 0.08, 0.1],
            ],
            false,
            3,
          ),
        );
    },
  };
  return kit;
}
