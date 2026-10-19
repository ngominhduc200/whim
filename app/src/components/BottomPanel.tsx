import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { SHEET } from '@/lib/colors';
import { EDGE } from '@/lib/layout';

type Props = {
  visible: boolean;
  /** Height of the sheet itself, above the home-indicator inset. */
  height: number;
  onSwipeDown: () => void;
  /** Floats just above the sheet's top edge and moves with it (e.g. undo/redo). */
  accessory?: ReactNode;
  children: ReactNode;
};

const SPRING = { damping: 26, stiffness: 260, mass: 0.9 };
const ACCESSORY_SPACE = 64;

/** iOS-style bottom sheet: springs up, follows your finger when dragged down, closes past a threshold. */
export function BottomPanel({ visible, height, onSwipeDown, accessory, children }: Props) {
  const insets = useSafeAreaInsets();
  const full = height + insets.bottom;
  const offset = useSharedValue(full + ACCESSORY_SPACE);

  useEffect(() => {
    offset.set(visible ? withSpring(0, SPRING) : withTiming(full + ACCESSORY_SPACE, { duration: 220 }));
  }, [visible, full, offset]);

  const drag = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      // rubber-band when pulled up, follow the finger when pulled down
      offset.set(e.translationY < 0 ? e.translationY * 0.15 : e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > full * 0.3 || e.velocityY > 800) scheduleOnRN(onSwipeDown);
      else offset.set(withSpring(0, SPRING));
    });

  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: offset.get() }] }));

  return (
    <Animated.View
      pointerEvents={visible ? 'box-none' : 'none'}
      style={[styles.wrap, { height: full + ACCESSORY_SPACE }, animated]}>
      <View pointerEvents="box-none" style={styles.accessory}>
        {accessory}
      </View>
      <GestureDetector gesture={drag}>
        <View style={[styles.sheet, { height: full, paddingBottom: insets.bottom }]}>
          <View style={styles.grabber} />
          {children}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  accessory: { height: ACCESSORY_SPACE, justifyContent: 'flex-end', paddingBottom: 12, paddingHorizontal: EDGE },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  },
  // the swipe-down handle, with room above and below
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, backgroundColor: '#d1d1d6', marginTop: 10, marginBottom: 6 },
});
