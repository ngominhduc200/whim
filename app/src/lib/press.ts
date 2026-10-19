import { StyleSheet } from 'react-native';

// How buttons answer a press, everywhere in the app: text and icon buttons dim; round buttons, pins and other
// "objects" shrink a little. Use as `style={({ pressed }) => [yourStyle, pressed && press.dim]}`.
export const press = StyleSheet.create({
  dim: { opacity: 0.6 },
  shrink: { transform: [{ scale: 0.92 }] },
});
