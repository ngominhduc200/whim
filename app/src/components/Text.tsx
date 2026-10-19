import { Gaegu_300Light, Gaegu_400Regular, Gaegu_700Bold, useFonts } from '@expo-google-fonts/gaegu';
import { forwardRef } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, type TextProps, type TextInputProps, type TextStyle } from 'react-native';

import { INK } from '@/lib/colors';

// Gaegu, the app's one typeface (fonts.google.com/specimen/Gaegu). Use these instead of react-native's Text/TextInput.
export const FONTS = { light: 'Gaegu_300Light', regular: 'Gaegu_400Regular', bold: 'Gaegu_700Bold' } as const;

export function useAppFonts() {
  const [loaded, error] = useFonts({ Gaegu_300Light, Gaegu_400Regular, Gaegu_700Bold });
  // if the font somehow fails, carry on with the system font rather than a blank app
  return loaded || error != null;
}

// Gaegu is drawn small for its point size, so text is scaled up a little to match the system font's visual size.
const SIZE_SCALE = 1.15;
const DEFAULT_SIZE = 17;

// All text in the app is Gaegu Bold. (A custom font has no synthesized weights, so fontWeight is ignored.)
const APP_FONT = FONTS.bold;

function gaegu(style: TextProps['style']): TextStyle {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = (flat.fontSize ?? DEFAULT_SIZE) * SIZE_SCALE;
  return {
    fontFamily: APP_FONT,
    fontWeight: undefined,
    // the app's "black" unless a color is set
    color: flat.color ?? INK,
    fontSize,
    lineHeight: flat.lineHeight != null ? flat.lineHeight * SIZE_SCALE : undefined,
  };
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[style, gaegu(style)]} />;
}

export const TextInput = forwardRef<RNTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={[style, gaegu(style)]} />;
});
