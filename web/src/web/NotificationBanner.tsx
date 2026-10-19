// whim's notification banner on the web, styled and behaving like an iPhone banner: it slides down from the top,
// stays a few seconds and slides back up (or swipe it up). Tapping it does what tapping the phone notification
// does (lib/notify.ts on the web).
import { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { INK } from '@/lib/colors';
import { bannerTapped, NEARBY_TEXT, onBanner } from '@/lib/notify';

const SHOW_MS = 4500;
const HIDDEN = -140;
const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

export function NotificationBanner() {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);
  const y = useSharedValue(HIDDEN);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    y.set(withTiming(HIDDEN, { duration: 260, easing: Easing.in(Easing.cubic) }, (done) => done && scheduleOnRN(setShown, false)));
  };

  useEffect(
    () =>
      onBanner(() => {
        setShown(true);
        y.set(HIDDEN);
        y.set(withSpring(0, { damping: 18, stiffness: 220 }));
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(hide, SHOW_MS);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const swipe = Gesture.Pan().onEnd((e) => {
    if (e.translationY < -20) scheduleOnRN(hide);
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  if (!shown) return null;
  return (
    <Animated.View style={[styles.wrap, { top: insets.top + 6 }, style]}>
      <GestureDetector gesture={swipe}>
        <Pressable
          onPress={() => {
            hide();
            bannerTapped();
          }}
          accessibilityRole="button"
          accessibilityLabel={`whim: ${NEARBY_TEXT}`}
          style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
        >
          <Image source={require('@/assets/images/app-icon.png')} style={styles.icon} />
          <View style={styles.text}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>whim</Text>
              <Text style={styles.time}>now</Text>
            </View>
            <Text style={styles.body}>{NEARBY_TEXT}</Text>
          </View>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 8, right: 8, zIndex: 1000 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(245,245,245,0.82)',
    backdropFilter: 'blur(20px) saturate(180%)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    cursor: 'pointer',
  },
  pressed: { transform: [{ scale: 0.98 }] },
  icon: { width: 38, height: 38, borderRadius: 9 },
  text: { flex: 1, gap: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  title: { fontFamily: SYSTEM_FONT, fontWeight: '600', fontSize: 15, color: INK },
  time: { fontFamily: SYSTEM_FONT, fontSize: 13, color: 'rgba(60,60,67,0.6)' },
  body: { fontFamily: SYSTEM_FONT, fontSize: 15, color: INK },
});
