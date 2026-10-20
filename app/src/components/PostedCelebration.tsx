import { Canvas, Group, ImageSVG, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { Text } from '@/components/Text';
import { DoodlePhoto, doodleMargin } from '@/components/doodle/DoodlePhoto';
import { ICON_SVGS } from '@/components/icons/svgs';
import { PIN_FRAME_STROKE, PIN_WIDTH } from '@/components/map/PostPin';
import { ACCENT, LAND, PAPER } from '@/lib/colors';
import { EDGE, PHOTO_HEIGHT, PHOTO_WIDTH, usePhotoFrame } from '@/lib/layout';
import { photoSource, type Post } from '@/lib/posts';
import { REPLAY_MS } from '@/screens/PostOverlayScreen';
import { strokePath, type Stroke } from '@/lib/strokes';

// Timeline (ms from the moment the post is saved):
// the edit screen fades away over a still copy of its photo, then the photo shrinks into its pin at the map's
// center; as it lands, its doodles (the same composition, scaled up to the screen around the pin) draw
// themselves in (2s, like opening a post), with an orange note below the pin; 3s after they start, everything fades and the real pin
// is left.
const HANDOFF_MS = 350;
const SHRINK_MS = 650;
const CELEBRATE_AT = HANDOFF_MS + SHRINK_MS - 150;
// The pin belongs to the map: the real one is shown just before the photo lands in its spot, and the overlay's
// copy goes a moment after (they're identical, so the swap can't be seen). From then on only the doodles and the
// note are on the overlay, so only they stay put if you move the map, and only they fade.
const LANDED_AT = HANDOFF_MS + SHRINK_MS;
const REAL_PIN_AT = LANDED_AT - 100;
const COPY_GONE_AT = LANDED_AT + 150;
const FADE_MS = 700;
// the doodles draw themselves in at the same pace as opening a post, then everything stays put until 3s
// after they started
const DRAW_MS = REPLAY_MS;
const HOLD_MS = 3000 - REPLAY_MS;
const FADE_AT = CELEBRATE_AT + DRAW_MS + HOLD_MS;

const PIN_HEIGHT = (PIN_WIDTH * 4) / 3;
/** A few small doodles near the middle shouldn't blow up huge. */
const MAX_SCALE = 3;
// "Your moment was added", just under the doodles, in its sketchy box (icons/svgs.ts `noteBox`)
const NOTE_GAP = 16;
// the note is just the text plus a little padding, with the backdrop stretched to fit around it
const NOTE_PAD_X = 16;
const NOTE_PAD_Y = 8;
const NOTE_HEIGHT = 44; // its height: one line of text (~28pt) plus the padding
const WHITE = '#FFFFFF';
const WHITE_EDGE = '#D9CFC3';

type Props = {
  post: Post;
  /** The photo is landing in its pin: show the real pin (on the map) under the overlay's copy, which then goes. */
  onReveal: () => void;
  onDone: () => void;
  /** You moved the map: fade out now, wherever it's up to (the doodles keep drawing while it fades). */
  leaving?: boolean;
};

/**
 * Plays over the map right after posting. Expects the map to be centered on the new post (at any tilt or
 * rotation): pins always face the screen at the same size, so its photo is then half a pin above the middle.
 */
export function PostedCelebration({ post, onReveal, onDone, leaving = false }: Props) {
  const { width: W, height: H } = useWindowDimensions();
  const frame = usePhotoFrame();
  const insets = useSafeAreaInsets();
  // the pin's photo: its bottom edge is on the post, at the middle of the screen
  const cx = W / 2;
  const cy = H / 2 - PIN_HEIGHT / 2;

  // the note's box size, once laid out around its text, for drawing its backdrop to fit
  const [noteSize, setNoteSize] = useState<{ width: number; height: number } | null>(null);
  const shrink = useSharedValue(0);
  const progress = useSharedValue(0);
  const fade = useSharedValue(1);
  // the overlay's copy of the pin (1 = shown), until the real pin has taken over
  const pinCopy = useSharedValue(1);
  // the pending reveal / done timers, so leaving early can replace them
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const pending = timers.current;
    shrink.set(withDelay(HANDOFF_MS, withTiming(1, { duration: SHRINK_MS, easing: Easing.inOut(Easing.cubic) })));
    progress.set(withDelay(CELEBRATE_AT, withTiming(1, { duration: DRAW_MS, easing: Easing.linear })));
    fade.set(withDelay(FADE_AT, withTiming(0, { duration: FADE_MS })));
    pinCopy.set(withDelay(COPY_GONE_AT, withTiming(0, { duration: 0 })));
    pending.add(setTimeout(onReveal, REAL_PIN_AT));
    pending.add(setTimeout(onDone, FADE_AT + FADE_MS));
    return () => {
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, [shrink, progress, fade, pinCopy, onReveal, onDone]);

  useEffect(() => {
    if (!leaving) return;
    const pending = timers.current;
    pending.forEach(clearTimeout);
    pending.clear();
    // the photo/pin copies go at once (the real pin, on the map, moves with it); the doodles and note fade
    shrink.set(1);
    pinCopy.set(0);
    onReveal();
    fade.set(withTiming(0, { duration: FADE_MS }));
    pending.add(setTimeout(onDone, FADE_MS));
  }, [leaving, shrink, pinCopy, fade, onReveal, onDone]);

  // the edit screen's paper, fading as the photo shrinks to show the map
  const paperStyle = useAnimatedStyle(() => ({ opacity: interpolate(shrink.get(), [0, 0.7], [1, 0], 'clamp') }));

  // the full-size photo, exactly where it was on the edit screen, shrinking into the pin's spot
  const big = { x: frame.left + frame.width / 2, y: frame.top + frame.height / 2 };
  const bigStyle = useAnimatedStyle(() => {
    const t = shrink.get();
    return {
      opacity: interpolate(t, [0.85, 1], [1, 0], 'clamp'),
      transform: [
        { translateX: (cx - big.x) * t },
        { translateY: (cy - big.y) * t },
        { scale: interpolate(t, [0, 1], [1, PIN_WIDTH / frame.width]) },
      ],
    };
  });
  // the pin-sized copy it hands over to (drawn like the real pin, with its thinner frame line)
  const smallStyle = useAnimatedStyle(() => ({ opacity: interpolate(shrink.get(), [0.85, 1], [0, 1], 'clamp') * pinCopy.get() }));

  const all = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const noteStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.get(), [0, 0.2], [0, 1], 'clamp') }));

  // the photo's center sits on the screen's center (the pin), and the layer grows around it
  // the note goes under the doodles, so the bottom keeps room for it (and the top the same, as it's centered)
  const margin = Math.max(insets.top + EDGE, insets.bottom + EDGE + NOTE_HEIGHT + NOTE_GAP);
  // the doodles grow around the pin as far as they can both above and below it
  const roomY = Math.min(cy - margin, H - margin - cy);
  const layer = useMemo(() => doodleLayer(post.strokes, W, roomY), [post.strokes, W, roomY]);
  // always the same spot, whatever the doodles: just below the lowest the doodles can ever reach
  const noteTop = cy + roomY + NOTE_GAP;
  const layerTransform = [
    { translateX: cx },
    { translateY: cy },
    { scale: layer.scale },
    { translateX: -PHOTO_WIDTH / 2 },
    { translateY: -PHOTO_HEIGHT / 2 },
  ];

  const m = doodleMargin(frame.width);
  const pm = doodleMargin(PIN_WIDTH);
  return (
    // touches go through to the map, so you can move it (which fades this out)
    <Animated.View style={[StyleSheet.absoluteFill, all]} pointerEvents="none">
      <Animated.View style={[StyleSheet.absoluteFill, styles.paper, paperStyle]} />
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        <Group transform={layerTransform}>
          {layer.paths.map((p) => (
            <Group key={p.id}>
              {/* white would vanish on the light map, so it gets a thin warm-grey edge */}
              {p.color === WHITE && (
                <Path
                  path={p.path}
                  style="stroke"
                  strokeWidth={p.width + 1.5}
                  strokeCap="round"
                  strokeJoin="round"
                  color={WHITE_EDGE}
                  end={progress}
                />
              )}
              <Path
                path={p.path}
                style="stroke"
                strokeWidth={p.width}
                strokeCap="round"
                strokeJoin="round"
                color={p.color}
                end={progress}
              />
            </Group>
          ))}
        </Group>
      </Canvas>
      <Animated.View style={[styles.abs, { left: cx - PIN_WIDTH / 2 - pm, top: cy - PIN_HEIGHT / 2 - pm }, smallStyle]}>
        <DoodlePhoto source={photoSource(post)} strokes={post.strokes} width={PIN_WIDTH} frameStroke={PIN_FRAME_STROKE} />
      </Animated.View>
      <Animated.View style={[styles.abs, { left: frame.left - m, top: frame.top - m }, bigStyle]}>
        <DoodlePhoto source={photoSource(post)} strokes={post.strokes} width={frame.width} />
      </Animated.View>
      <Animated.View style={[styles.note, { top: noteTop }, noteStyle]}>
        <View style={styles.noteBox} onLayout={(e) => setNoteSize(e.nativeEvent.layout)}>
          {noteSize && <NoteBox width={noteSize.width} height={noteSize.height} />}
          <Text style={styles.noteText} numberOfLines={1}>
            Your moment was added
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * The post's doodles exactly as drawn (paths in editor points, the photo's top-left at 0,0), and how much the
 * whole layer can grow, around the photo's center, with `roomY` above and below it. `reach`: how far below the center the lowest line ends up.
 */
function doodleLayer(strokes: Stroke[], W: number, roomY: number) {
  const paths = strokes.map((st) => ({
    id: st.id,
    color: st.color,
    width: st.width,
    path: strokePath(st.points, PHOTO_WIDTH, PHOTO_HEIGHT),
  }));
  // furthest reach of any line from the photo's center, sideways and up/down
  let dx = 1;
  let dy = 1;
  for (const p of paths) {
    const b = p.path.computeTightBounds();
    const pad = p.width / 2 + 1;
    dx = Math.max(dx, Math.abs(b.x - pad - PHOTO_WIDTH / 2), Math.abs(b.x + b.width + pad - PHOTO_WIDTH / 2));
    dy = Math.max(dy, Math.abs(b.y - pad - PHOTO_HEIGHT / 2), Math.abs(b.y + b.height + pad - PHOTO_HEIGHT / 2));
  }
  const scale = Math.min((W / 2 - EDGE) / dx, roomY / dy, MAX_SCALE);
  return { paths, scale, reach: dy * scale };
}

/**
 * The note's sketchy box (icons/svgs.ts `noteBox`), stretched to exactly `width`×`height`. Its outline is kept at
 * the UI's 2pt however much the drawing is squeezed.
 */
function NoteBox({ width, height }: { width: number; height: number }) {
  const svg = useMemo(() => {
    const [, vw, vh] = ICON_SVGS.noteBox.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.map(Number);
    const scale = (width / vw + height / vh) / 2;
    const source = ICON_SVGS.noteBox
      .replace(/<svg width="[^"]*" height="[^"]*"/, `<svg width="${width}" height="${height}" preserveAspectRatio="none"`)
      .replace('stroke-width="2"', `stroke-width="${2 / scale}"`)
      // filled with the map's land color
      .replace('fill="#FBE5CA"', `fill="${LAND}"`);
    return Skia.SVG.MakeFromString(source);
  }, [width, height]);
  if (!svg) return null;
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageSVG svg={svg} x={0} y={0} width={width} height={height} />
    </Canvas>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: PAPER },
  abs: { position: 'absolute' },
  // never closer than EDGE to the screen's sides
  note: { position: 'absolute', left: EDGE, right: EDGE, alignItems: 'center' },
  // a soft drop shadow under the box (its corners are ~4pt round)
  noteBox: {
    maxWidth: '100%',
    paddingHorizontal: NOTE_PAD_X,
    paddingVertical: NOTE_PAD_Y,
    borderRadius: 4,
    boxShadow: '0 2px 6px rgba(45,38,27,0.14)',
  },
  // orange, like the you-are-here character; ~230pt wide on screen
  noteText: { fontSize: 20, color: ACCENT },
});
