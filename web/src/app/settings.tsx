// Settings on the web: the app's settings screen in a sheet that slides up over the map, like the phone's
// (browsers don't have the native sheet). Drag it down, or tap the dimmed map above it, to close.
import { router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PAPER } from '@/lib/colors';
import { SettingsScreen } from '@/screens/SettingsScreen';

// the phone's sheet opens to 60% of the screen
const DETENT = 0.6;
const OPEN = { damping: 26, stiffness: 260 };

export default function SettingsSheet() {
  const { height } = useWindowDimensions();
  const sheetH = Math.round(height * DETENT);
  // 0 = closed (below the screen), 1 = open
  const open = useSharedValue(0);
  const drag = useSharedValue(0);
  useEffect(() => {
    // a plain slide up that eases to a stop (no bounce)
    open.set(withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));
  }, [open]);

  const leave = () => router.back();
  const close = () => {
    'worklet';
    open.set(withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => done && scheduleOnRN(leave)));
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => drag.set(Math.max(0, e.translationY)))
    .onEnd((e) => {
      if (e.translationY > sheetH * 0.25 || e.velocityY > 800) close();
      else drag.set(withSpring(0, OPEN));
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - open.get()) * sheetH + drag.get() }] }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: interpolate(open.get(), [0, 1], [0, 1]) * interpolate(drag.get(), [0, sheetH], [1, 0], 'clamp') }));

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ presentation: 'transparentModal', animation: 'none' }} />
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Close settings" />
      </Animated.View>
      <Animated.View style={[styles.sheet, { height: sheetH }, sheetStyle]}>
        <GestureDetector gesture={pan}>
          <View style={styles.grabberArea}>
            <View style={styles.grabber} />
          </View>
        </GestureDetector>
        <View style={styles.body}>
          <SettingsScreen />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  dim: { backgroundColor: 'rgba(0,0,0,0.25)' },
  sheet: {
    backgroundColor: PAPER,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  },
  grabberArea: { height: 20, alignItems: 'center', justifyContent: 'center', cursor: 'grab' as 'pointer' },
  grabber: { width: 36, height: 5, borderRadius: 3, backgroundColor: 'rgba(60,60,67,0.3)' },
  body: { flex: 1 },
});
