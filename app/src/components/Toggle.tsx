import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ACCENT } from '@/lib/colors';

const WIDTH = 51;
const HEIGHT = 31;
const KNOB = 27;
const INSET = (HEIGHT - KNOB) / 2;
const OFF_TRACK = '#E3DCD3';

type Props = { value: boolean; onValueChange: (on: boolean) => void; accessibilityLabel: string };

/**
 * An on/off switch drawn by the app (orange when on). iOS's own switch is laid out at a fixed size that doesn't
 * match how newer iOS versions draw it, so it sits off-center in a row; this one is exactly the size it takes up.
 */
export function Toggle({ value, onValueChange, accessibilityLabel }: Props) {
  const on = useSharedValue(value ? 1 : 0);
  useEffect(() => {
    on.set(withTiming(value ? 1 : 0, { duration: 180 }));
  }, [value, on]);

  const trackStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(on.get(), [0, 1], [OFF_TRACK, ACCENT]) }));
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: on.get() * (WIDTH - KNOB - 2 * INSET) }] }));

  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onValueChange(!value);
      }}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => pressed && styles.pressed}
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.knob, knobStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // a light squeeze while held (the knob already slides, so a full-size shrink would be too much)
  pressed: { transform: [{ scale: 0.95 }] },
  track: { width: WIDTH, height: HEIGHT, borderRadius: HEIGHT / 2, padding: INSET },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)' },
});
