import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text } from '@/components/Text';
import { press } from '@/lib/press';

const CLOUD = require('@/assets/landmarks/user-location.png');
const BUBBLE = require('@/assets/landmarks/you-bubble.png');

// The cloud image is 82pt square with its feet at the center (scripts/build-landmark-icons.mjs); the drawing
// itself is 41pt tall, standing on the center.
const CLOUD_BOX = 82;
const CLOUD_HEIGHT = 41;
/** How tall the cloud stands above your location, for pointing at it from above. */
export const USER_CLOUD_HEIGHT = CLOUD_HEIGHT;
const BUBBLE_W = 76;
const BUBBLE_H = 42;
const GAP = 2;
const SHOW_MS = 3000;

// pops in with exactly two very subtle bounces: just past full size, just under it, then settles
// pops in with exactly two very subtle bounces: just past full size, just under it, then settles (380ms)
const popIn = () =>
  withSequence(
    withTiming(1.04, { duration: 209, easing: Easing.out(Easing.quad) }),
    withTiming(0.985, { duration: 95 }),
    withTiming(1, { duration: 76 }),
  );

// The marker's box is just the cloud drawing (41pt square, its feet on the bottom edge: anchor it at x 0.5, y 1).
// Everything else (the bubble above) is drawn outside the box. The map treats the whole box as the marker, so a
// bigger box would block taps on the pins underneath it, even where nothing is drawn.
const CLOUD_WIDTH = 41;
/** How wide the cloud is (its box: see USER_MARKER_ANCHOR). */
export const USER_CLOUD_WIDTH = CLOUD_WIDTH;
export const USER_MARKER_ANCHOR = { x: 0.5, y: 1 };

/** Your location: the doodled cloud. Tap it and a "You" speech bubble pops up above it for a few seconds. */
export function UserMarker() {
  // the bubble shrinks and fades in place when it closes (a layout "exit" animation would leave its copy behind
  // where it opened if the map moved meanwhile), then it's removed
  const [shown, setShown] = useState(false);
  const shownRef = useRef(false);
  const closing = useSharedValue(0);
  // its size while popping in (all its animation runs on the bubble itself, so it always stays on the cloud)
  const pop = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    shownRef.current = false;
    closing.set(withTiming(1, { duration: 150 }, (done) => done && scheduleOnRN(setShown, false)));
  };
  const toggle = () => {
    Haptics.selectionAsync();
    if (shownRef.current) return hide();
    shownRef.current = true;
    closing.set(0);
    pop.set(0);
    pop.set(popIn());
    setShown(true);
    timer.current = setTimeout(hide, SHOW_MS);
  };
  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: 1 - closing.get(),
    transform: [{ scale: pop.get() * (1 - 0.4 * closing.get()) }],
  }));

  return (
    <View style={styles.box} pointerEvents="box-none">
      {shown && (
        <Animated.View style={[styles.bubble, bubbleStyle]} pointerEvents="none">
          <Image source={BUBBLE} style={styles.bubbleImage} />
          <Text style={styles.you}>You</Text>
        </Animated.View>
      )}
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel="Your location"
        style={({ pressed }) => [styles.cloud, pressed && press.shrink]}
        hitSlop={6}
      >
        {/* a subtle shadow (it follows the cloud's outline), so the marker stays distinct over a post behind it */}
        <View style={styles.shadow}>
          <Image source={CLOUD} style={styles.cloudImage} />
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: CLOUD_WIDTH, height: CLOUD_HEIGHT, overflow: 'visible' },
  // above the box, centered on it
  bubble: {
    position: 'absolute',
    left: (CLOUD_WIDTH - BUBBLE_W) / 2,
    top: -GAP - BUBBLE_H,
    width: BUBBLE_W,
    height: BUBBLE_H,
    transformOrigin: 'bottom',
  },
  bubbleImage: { width: BUBBLE_W, height: BUBBLE_H },
  // centered in the bubble's body (above the tail)
  you: { position: 'absolute', left: 0, right: 0, top: 6, textAlign: 'center', color: '#fff', fontSize: 16 },
  cloud: { width: CLOUD_WIDTH, height: CLOUD_HEIGHT, overflow: 'visible' },
  shadow: { shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  // the image is twice the drawing's size with the feet at its center: shifted so the drawing fills the box
  cloudImage: { width: CLOUD_BOX, height: CLOUD_BOX, marginLeft: -(CLOUD_BOX - CLOUD_WIDTH) / 2 },
});
