// expo-symbols on the web: the few iOS system symbols the app uses (SF Symbols only exist on Apple devices),
// drawn as simple line icons of the same size and color.
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

type Props = { name: string | { ios?: string }; size?: number; tintColor?: string; weight?: string; style?: StyleProp<ViewStyle> };

const ICONS: Record<string, (c: string) => ReactNode> = {
  'person.crop.circle': (c) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={c} />
      <circle cx="12" cy="10" r="3.4" stroke={c} />
      <path d="M5.6 18.6c1.4-2.4 3.7-3.6 6.4-3.6s5 1.2 6.4 3.6" stroke={c} />
    </>
  ),
  bell: (c) => (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.6H4.4z" stroke={c} strokeLinejoin="round" />
      <path d="M10 20.2a2.2 2.2 0 0 0 4 0" stroke={c} />
    </>
  ),
  'hand.raised': (c) => (
    <path
      d="M8 12.5V5.6a1.4 1.4 0 0 1 2.8 0V11m0-6.6a1.4 1.4 0 0 1 2.8 0V11m0-5.6a1.4 1.4 0 0 1 2.8 0V12m0-3.6a1.4 1.4 0 0 1 2.8 0v6.6c0 3.9-2.8 6.6-6.4 6.6-2.6 0-4.2-1.3-5.6-3.6L4.6 14a1.4 1.4 0 0 1 2.3-1.6L8 13.8"
      stroke={c}
      strokeLinejoin="round"
    />
  ),
  'info.circle': (c) => (
    <>
      <circle cx="12" cy="12" r="10" stroke={c} />
      <path d="M12 11v6" stroke={c} />
      <circle cx="12" cy="7.6" r="0.6" fill={c} stroke={c} />
    </>
  ),
  'chevron.right': (c) => <path d="M9 5l7 7-7 7" stroke={c} strokeLinejoin="round" />,
  trash: (c) => (
    <>
      <path d="M4.5 6.5h15M9.5 6.5V4.6h5v1.9M6.5 6.5l.9 13h9.2l.9-13" stroke={c} strokeLinejoin="round" />
      <path d="M10.2 10v6M13.8 10v6" stroke={c} />
    </>
  ),
  camera: (c) => (
    <>
      <path d="M3.5 8.5h3.4l1.6-2.4h7l1.6 2.4h3.4v10h-17z" stroke={c} strokeLinejoin="round" />
      <circle cx="12" cy="13.2" r="3.4" stroke={c} />
    </>
  ),
  'photo.on.rectangle': (c) => (
    <>
      <rect x="3.5" y="6" width="17" height="13" rx="2" stroke={c} />
      <path d="M3.5 16l4.5-4.5 4 4 2.5-2.5 6 6" stroke={c} strokeLinejoin="round" />
      <circle cx="15.5" cy="9.8" r="1.4" stroke={c} />
    </>
  ),
  checkmark: (c) => <path d="M5 12.5l4.5 4.5L19 7.5" stroke={c} strokeLinejoin="round" />,
};

export function SymbolView({ name, size = 24, tintColor = '#000', weight, style }: Props) {
  const key = typeof name === 'string' ? name : (name.ios ?? '');
  const draw = ICONS[key];
  const stroke = weight === 'semibold' || weight === 'bold' ? 2.2 : 1.7;
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      {draw ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth={stroke} strokeLinecap="round">
          {draw(tintColor)}
        </svg>
      ) : null}
    </View>
  );
}

export type SymbolViewProps = Props;
