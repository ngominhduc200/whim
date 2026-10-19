import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/Text';
import { DoodlePhoto, doodleMargin } from '@/components/doodle/DoodlePhoto';
import { PIN_WIDTH } from '@/components/map/PostPin';
import { CLOSE_ICON, EDGE, PHOTO_WIDTH, TAP, TOP_BUTTON_TOP } from '@/lib/layout';
import { getPost, isOwnPost, photoSource } from '@/lib/posts';
import { postViewClosing } from '@/lib/postView';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { INK, INK_LIGHT, PAPER_SEE_THROUGH } from '@/lib/colors';
import { placeName } from '@/lib/place';

/** How strongly the map behind the overlay is blurred (1–100). */
const BLUR = 10;

/** Every stroke draws from its first point to its last in exactly this long, all at the same time. */
export const REPLAY_MS = 2000;

// Opening: the photo grows out of its pin into its place while the backdrop and text fade in; then the doodles
// replay. Closing (the X, or letting go of a drag): the photo shrinks back into its pin while everything else fades.
const OPEN_MS = 420;
const CLOSE_MS = 340;
// how far into closing the map shows its pins again (the landing photo covers its own pin until the end)
const PINS_BACK_AT = 0.75;
// while dragging, the photo follows your finger this much (a hint of movement, not a full drag)
const FOLLOW = 0.3;
// the moment you press, the photo grows this much, so it feels picked up
const GRAB_SCALE = 1.04;
const GRAB_SPRING = { damping: 16, stiffness: 320 };
// how much the text fades while you drag
const MUTED = 0.3;
// a drag this long (or this quick) closes the post when you let go; anything less springs back
const CLOSE_DISTANCE = 40;
const CLOSE_VELOCITY = 500;

// Positions from design/6-overlay.png: photo ~225pt from the top, text ~40pt under it, aligned to its left edge.
const PHOTO_TOP = 225;
const PHOTO_HEIGHT = (PHOTO_WIDTH * 4) / 3;
const TEXT_GAP = 52;
// the X at the top left; under it, the centered title and where the post was made
const BACK_TOP = 8; // where the title is measured from, below the safe area
const TITLE_GAP = 14; // between the X and the title
// the caption scrolls if it would come closer than this to the bottom of the screen
const CAPTION_BOTTOM = 48;

export function PostOverlayScreen() {
  // `x`, `y`: the center of the post's pin photo on screen, where the photo grows from and lands back
  const { id, x, y } = useLocalSearchParams<{ id: string; x?: string; y?: string }>();
  const post = getPost(id);
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  // where the pin is, in words ("on Kingsway in Burnaby")
  const [place, setPlace] = useState<string | null>(null);
  useEffect(() => {
    if (post) placeName(post.lat, post.lng).then(setPlace);
  }, [post]);

  const left = Math.round((screenW - PHOTO_WIDTH) / 2);
  const photoCenter = { x: left + PHOTO_WIDTH / 2, y: PHOTO_TOP + PHOTO_HEIGHT / 2 };
  // without a pin position (shouldn't happen), the photo grows from just below its place instead
  const pin = x != null && y != null ? { x: Number(x), y: Number(y) } : { x: photoCenter.x, y: photoCenter.y + 40 };
  const pinScale = PIN_WIDTH / PHOTO_WIDTH;

  // open: 0 = in its pin, 1 = in place. The doodles replay once it has landed.
  const open = useSharedValue(0);
  const progress = useSharedValue(0);
  useEffect(() => {
    open.set(withTiming(1, { duration: OPEN_MS, easing: Easing.out(Easing.cubic) }));
    progress.set(withDelay(OPEN_MS, withTiming(1, { duration: REPLAY_MS, easing: Easing.linear })));
  }, [open, progress]);

  // drag anywhere: the photo leans toward your finger and the text dims; letting go closes the post
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const muted = useSharedValue(0);
  const held = useSharedValue(0);
  const closing = useSharedValue(false);

  const leave = () => router.back();
  const close = () => {
    if (closing.get()) return;
    closing.set(true);
    muted.set(withTiming(1, { duration: CLOSE_MS }));
    open.set(
      withTiming(0, { duration: CLOSE_MS, easing: Easing.inOut(Easing.cubic) }, (done) => {
        if (done) scheduleOnRN(leave);
      }),
    );
    // the map's pins come back under the landing photo, so its own pin is already there when it lands
    setTimeout(postViewClosing, CLOSE_MS * PINS_BACK_AT);
  };

  const drag = Gesture.Pan()
    .minDistance(6)
    // on touch down, before it even counts as a drag, so the photo answers your finger right away
    .onBegin(() => {
      if (!closing.get()) held.set(withSpring(1, GRAB_SPRING));
    })
    .onFinalize(() => {
      if (!closing.get()) held.set(withSpring(0, GRAB_SPRING));
    })
    .onStart(() => {
      if (!closing.get()) muted.set(withTiming(1, { duration: 160 }));
    })
    .onUpdate((e) => {
      dragX.set(e.translationX);
      dragY.set(e.translationY);
    })
    .onEnd((e) => {
      const far = Math.hypot(e.translationX, e.translationY) > CLOSE_DISTANCE;
      const quick = Math.hypot(e.velocityX, e.velocityY) > CLOSE_VELOCITY;
      if (far || quick) scheduleOnRN(close);
      else {
        dragX.set(withSpring(0, { damping: 20, stiffness: 220 }));
        dragY.set(withSpring(0, { damping: 20, stiffness: 220 }));
        muted.set(withTiming(0, { duration: 160 }));
      }
    });

  const photoStyle = useAnimatedStyle(() => {
    const t = open.get();
    return {
      transform: [
        { translateX: (pin.x - photoCenter.x) * (1 - t) + dragX.get() * FOLLOW * t },
        { translateY: (pin.y - photoCenter.y) * (1 - t) + dragY.get() * FOLLOW * t },
        { scale: (pinScale + (1 - pinScale) * t) * (1 + (GRAB_SCALE - 1) * held.get() * t) },
      ],
    };
  });
  // the blurred backdrop fades with the opening; the text also dims while you drag
  const backdropStyle = useAnimatedStyle(() => ({ opacity: open.get() }));
  const textStyle = useAnimatedStyle(() => ({ opacity: open.get() * (1 - (1 - MUTED) * muted.get()) }));

  if (!post) {
    return (
      <View style={[styles.root, styles.paper, styles.missing]}>
        <Text style={styles.text}>{"This post isn't available."}</Text>
      </View>
    );
  }

  const m = doodleMargin(PHOTO_WIDTH);
  const photoBottom = PHOTO_TOP + PHOTO_HEIGHT;
  const captionTop = photoBottom + TEXT_GAP;
  // the caption keeps its typed size; if it's taller than the room below the photo, it scrolls
  const captionMaxHeight = Math.max(60, screenH - CAPTION_BOTTOM - captionTop);

  return (
    <GestureDetector gesture={drag}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView intensity={BLUR} tint="light" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, styles.paper]} />
        </Animated.View>
        <StatusBar style="dark" />
        <Animated.View style={[StyleSheet.absoluteFill, textStyle]} pointerEvents="box-none">
          <View style={[styles.header, { top: insets.top + BACK_TOP + TAP + TITLE_GAP }]}>
            <Text style={styles.title}>{isOwnPost(post) ? 'Your moment' : "Someone's moment"}</Text>
            <Text style={styles.subtitle}>{place ?? ' '}</Text>
          </View>
          {post.text.length > 0 && (
            <ScrollView
              style={{ position: 'absolute', left, width: PHOTO_WIDTH, top: captionTop, maxHeight: captionMaxHeight }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={styles.text}>{post.text}</Text>
            </ScrollView>
          )}
          <Pressable
            onPress={close}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={({ pressed }) => [styles.close, { top: insets.top + TOP_BUTTON_TOP }, pressed && styles.pressed]}
          >
            <DoodleIcon name="close" size={CLOSE_ICON} />
          </Pressable>
        </Animated.View>
        <Animated.View style={[styles.photo, { left: left - m, top: PHOTO_TOP - m }, photoStyle]} pointerEvents="none">
          <DoodlePhoto source={photoSource(post)} strokes={post.strokes} width={PHOTO_WIDTH} progress={progress} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // see-through paper over a light blur, so the map shows faintly and softly behind
  paper: { backgroundColor: PAPER_SEE_THROUGH },
  missing: { alignItems: 'center', justifyContent: 'center' },
  photo: { position: 'absolute' },
  text: { fontSize: 18, lineHeight: 22, color: INK },
  header: { position: 'absolute', left: EDGE, right: EDGE, alignItems: 'center', gap: 2 },
  title: { fontSize: 26, color: INK, textAlign: 'center' },
  subtitle: { fontSize: 16, color: INK_LIGHT, textAlign: 'center' },
  // just the X, in a full tap target
  close: { position: 'absolute', left: EDGE, width: TAP, height: TAP, justifyContent: 'center' },
  pressed: { opacity: 0.6 },
});
