import { useEffect, type ReactNode } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const SPRING = { damping: 18, stiffness: 180, mass: 0.8 };

type Props = {
  /** Where this pin starts, relative to its own spot (the stack it split out of). Omit for no animation. */
  from?: { x: number; y: number };
  children: ReactNode;
};

/** When a stack splits, each new pin or smaller stack springs out from the "mother" stack to its own spot. */
export function SplitIn({ from, children }: Props) {
  const x = useSharedValue(from?.x ?? 0);
  const y = useSharedValue(from?.y ?? 0);
  const scale = useSharedValue(from ? 0.8 : 1);
  useEffect(() => {
    x.set(withSpring(0, SPRING));
    y.set(withSpring(0, SPRING));
    scale.set(withSpring(1, SPRING));
  }, [x, y, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// Grouping is splitting played backwards: the same spring, from full size down to SplitIn's 80%, and no fading.
// A split's stack vanishes the instant its pieces leave it; here the pieces vanish, and the stack appears, the
// instant they arrive (when the spring first reaches the stack).
const ARRIVED = 0.97;

/** How long a merging pin's ghost stays mounted (it's invisible once it has arrived). */
export const MERGE_OUT_MS = 650;

/**
 * The reverse of SplitIn: when zooming out merges pins into a bigger stack, each one springs from its own spot
 * into the stack (`to`, relative to its own spot), shrinking to 80%, and disappears as it arrives.
 */
export function MergeOut({ to, children }: { to: { x: number; y: number }; children: ReactNode }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(1, SPRING));
  }, [t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.get() >= ARRIVED ? 0 : 1,
    transform: [{ translateX: to.x * t.get() }, { translateY: to.y * t.get() }, { scale: 1 - 0.2 * t.get() }],
  }));
  return (
    <Animated.View style={style} pointerEvents="none">
      {children}
    </Animated.View>
  );
}

/** A newly merged stack: hidden while the pieces spring into it, then there, at full size, the moment they arrive. */
export function GatherIn({ children }: { children: ReactNode }) {
  // runs the pieces' exact spring, so it appears on the same frame they vanish
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withSpring(1, SPRING));
  }, [t]);
  const style = useAnimatedStyle(() => ({ opacity: t.get() >= ARRIVED ? 1 : 0 }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
