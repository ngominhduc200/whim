import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { INK } from '@/lib/colors';

/** The wrapper's fill (icons/svgs.ts `buttonWrapper`), for buttons that draw their own outline. */
export const BUTTON_FACE = '#FFFBF3';
/** A very soft shadow, so buttons lift just slightly off the map. */
export const BUTTON_SHADOW = '0 1px 3px rgba(45,38,27,0.12)';

type Props = {
  size: number;
  onPress: () => void;
  accessibilityLabel: string;
  symbol?: SymbolViewProps['name'];
  symbolSize?: number;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
};

/** Round icon button: the icon inside the hand-drawn round wrapper, with a very soft shadow. */
export function CircleButton({ size, onPress, accessibilityLabel, symbol, symbolSize, style, children }: Props) {
  const round = { width: size, height: size, borderRadius: size / 2 };
  const content = children ?? (symbol ? <SymbolView name={symbol} size={symbolSize ?? size * 0.45} tintColor={INK} weight="medium" /> : null);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [round, styles.shadow, style, pressed && styles.pressed]}>
      <DoodleIcon name="buttonWrapper" size={size} style={StyleSheet.absoluteFill} />
      <View style={[round, styles.center]}>{content}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  shadow: { boxShadow: BUTTON_SHADOW },
  pressed: { transform: [{ scale: 0.92 }] },
});
