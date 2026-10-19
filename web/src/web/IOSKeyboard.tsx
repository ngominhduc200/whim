// An iPhone-style keyboard for the web version of the text sheet, so typing looks like it does on the phone. Keys
// type into the same field as the computer's keyboard. Mousing down on it doesn't move focus, so the field keeps
// its cursor.
import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK } from '@/lib/colors';

type Props = {
  onText: (s: string) => void;
  onDelete: () => void;
  onReturn: () => void;
  /** Starts with a capital (iOS capitalizes the first letter and after a sentence). */
  capitalize: boolean;
};

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const NUMBERS = ['1234567890', '-/:;()$&@"', ".,?!'"];
const SYSTEM_FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

export function IOSKeyboard({ onText, onDelete, onReturn, capitalize }: Props) {
  const insets = useSafeAreaInsets();
  const [shift, setShift] = useState<boolean | null>(null); // null: follow capitalize
  const [numbers, setNumbers] = useState(false);
  const upper = shift ?? capitalize;
  const type = (s: string) => {
    onText(upper && !numbers ? s.toUpperCase() : s);
    setShift(null);
  };
  const rows = numbers ? NUMBERS : LETTERS;

  return (
    <div onMouseDown={(e) => e.preventDefault()} style={{ width: '100%' }}>
      <View style={[styles.board, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.row}>
          {rows[0].split('').map((k) => (
            <Key key={k} onPress={() => type(k)} label={upper && !numbers ? k.toUpperCase() : k} />
          ))}
        </View>
        <View style={[styles.row, !numbers && styles.inset]}>
          {rows[1].split('').map((k) => (
            <Key key={k} onPress={() => type(k)} label={upper && !numbers ? k.toUpperCase() : k} />
          ))}
        </View>
        <View style={styles.row}>
          <Key wide special onPress={() => (numbers ? setNumbers(false) : setShift(!upper))} active={upper && !numbers} label={numbers ? 'ABC' : '⇧'} />
          <View style={styles.middle}>
            {rows[2].split('').map((k) => (
              <Key key={k} onPress={() => type(k)} label={upper && !numbers ? k.toUpperCase() : k} />
            ))}
          </View>
          <Key wide special onPress={onDelete} label="⌫" />
        </View>
        <View style={styles.row}>
          <Key wide special onPress={() => setNumbers(!numbers)} label={numbers ? 'ABC' : '123'} small />
          <Key grow onPress={() => type(' ')} label="space" small />
          <Key special onPress={onReturn} label="return" small extraWide />
        </View>
      </View>
    </div>
  );
}

function Key({
  label,
  onPress,
  special,
  wide,
  grow,
  small,
  active,
  extraWide,
}: {
  label: ReactNode;
  onPress: () => void;
  special?: boolean;
  wide?: boolean;
  grow?: boolean;
  small?: boolean;
  active?: boolean;
  extraWide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.key,
        special && styles.special,
        active && styles.active,
        wide && styles.wide,
        extraWide && styles.extraWide,
        grow && styles.grow,
        pressed && (special ? styles.specialPressed : styles.keyPressed),
      ]}
    >
      <Text style={[styles.label, small && styles.small]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  board: { width: '100%', backgroundColor: '#D1D4DA', paddingTop: 8, paddingHorizontal: 3, gap: 11 },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  inset: { paddingHorizontal: 18 },
  middle: { flex: 1, minWidth: 0, flexDirection: 'row', gap: 6, marginHorizontal: 8 },
  key: {
    flex: 1,
    minWidth: 0,
    height: 42,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 0 rgba(0,0,0,0.3)',
    cursor: 'pointer',
    userSelect: 'none',
  },
  keyPressed: { backgroundColor: '#ABB0BA' },
  special: { backgroundColor: '#ABB0BA' },
  specialPressed: { backgroundColor: '#FFFFFF' },
  active: { backgroundColor: '#FFFFFF' },
  wide: { flexGrow: 0, flexShrink: 0, flexBasis: 42, width: 42 },
  extraWide: { flexGrow: 0, flexShrink: 0, flexBasis: 88, width: 88 },
  grow: { flex: 1 },
  label: { fontFamily: SYSTEM_FONT, fontSize: 22, color: INK },
  small: { fontSize: 15 },
});
