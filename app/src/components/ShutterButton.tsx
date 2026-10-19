import { Pressable, StyleSheet, View } from 'react-native';

import { BUTTON_FACE, BUTTON_SHADOW } from '@/components/CircleButton';
import { DoodleIcon, ICON_COLOR } from '@/components/icons/DoodleIcon';
import { useShutterFrame } from '@/lib/layout';

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  /** "map": the hand-drawn camera button. "camera": the shutter, with a grey ring and the take-photo icon. */
  variant: 'map' | 'camera';
  disabled?: boolean;
};

/**
 * The big round button. Absolutely positioned so the map button and camera shutter line up exactly.
 * Its face is the same warm off-white as the other icon buttons' hand-drawn wrapper; the icon draws its own
 * circle outline.
 */
export function ShutterButton({ onPress, accessibilityLabel, variant, disabled }: Props) {
  const frame = useShutterFrame();
  // the face sits just inside the hand-drawn circle's line
  const inset = variant === 'map' ? 2 : 0;
  const face = { position: 'absolute' as const, top: inset, left: inset, right: inset, bottom: inset, borderRadius: frame.width / 2 - inset };
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        frame,
        { borderRadius: frame.width / 2 },
        variant === 'map' ? styles.map : styles.camera,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <View style={[face, styles.solid]} />
      {variant === 'map' ? (
        // the icon draws the button's hand-drawn circle and the camera
        <DoodleIcon name="cameraButton" size={frame.width} color={ICON_COLOR} />
      ) : (
        // the icon's hand-drawn circle is the button's edge
        <DoodleIcon name="shutter" size={frame.width} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute' },
  map: { boxShadow: BUTTON_SHADOW },
  camera: { boxShadow: BUTTON_SHADOW },
  solid: { backgroundColor: BUTTON_FACE },
  pressed: { transform: [{ scale: 0.93 }] },
  disabled: { opacity: 0.4 },
});
