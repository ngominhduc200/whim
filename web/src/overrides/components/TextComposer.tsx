// Web version of app/src/components/TextComposer.tsx: the same sheet, sitting on an iPhone-style keyboard drawn
// by whim, on a computer and on a phone alike (a phone's own keyboard brings Safari's toolbar, and Safari scrolls
// the page for it). Typing on a computer's keyboard works too.
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text, TextInput } from '@/components/Text';
import { SHEET, SHEET_FILL } from '@/lib/colors';
import { BAR_ICON, EDGE, TAP } from '@/lib/layout';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { press } from '@/lib/press';
import { IOSKeyboard } from '@/web/IOSKeyboard';

export const TEXT_LIMIT = 150;
// the typed text's line height (scaled by Text's 1.15 for Gaegu on screen)
const LINE = 22;

type Props = {
  initial: string;
  onSave: (text: string) => void;
  onCancel: () => void;
};

/** The text sheet on its drawn keyboard (design/5-text.png). Mount it only while editing. */
export function TextComposer({ initial, onSave, onCancel }: Props) {
  const [text, setText] = useState(initial);
  const save = () => onSave(text.trim());
  return (
    <View style={styles.fill} pointerEvents="box-none">
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable
            onPress={onCancel}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={({ pressed }) => [styles.icon, styles.iconLeft, pressed && press.dim]}
          >
            <DoodleIcon name="close" size={BAR_ICON} />
          </Pressable>
          <Text style={styles.title}>Type your message</Text>
          <Pressable
            onPress={save}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Save text"
            style={({ pressed }) => [styles.icon, styles.iconRight, pressed && press.dim]}
          >
            <DoodleIcon name="check" size={BAR_ICON} />
          </Pressable>
        </View>
        <View style={styles.field}>
          <TextInput
            value={text}
            onChangeText={setText}
            maxLength={TEXT_LIMIT}
            autoFocus
            // a cursor, but no phone keyboard (whim draws its own below)
            inputMode="none"
            multiline
            submitBehavior="submit"
            returnKeyType="done"
            onSubmitEditing={save}
            placeholder="Say something about this place"
            placeholderTextColor="#aeaeb2"
            style={styles.input}
          />
          <Text style={styles.counter} numberOfLines={1}>
            {text.length}/{TEXT_LIMIT}
          </Text>
        </View>
      </View>
      {/* the keyboard is drawn by whim (the phone's own isn't used: it brings Safari's toolbar, and Safari scrolls
          the page for it); a computer's keyboard types too */}
      <IOSKeyboard
        onText={(s) => setText((t) => (t + s).slice(0, TEXT_LIMIT))}
        onDelete={() => setText((t) => t.slice(0, -1))}
        onReturn={save}
        capitalize={text.length === 0 || /[.!?]\s$/.test(text)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // before it's placed on the keyboard: at the top, unseen
  // (fixed to the screen, so it's at the top whatever the slide is doing)
  waiting: { position: 'fixed' as 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: SHEET,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: EDGE,
    paddingBottom: 12,
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 },
  icon: { width: TAP, height: TAP, justifyContent: 'center' },
  iconLeft: { alignItems: 'flex-start' },
  iconRight: { alignItems: 'flex-end' },
  title: { fontSize: 17, fontWeight: '600' },
  field: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: SHEET_FILL,
    borderRadius: 22,
    paddingLeft: 16,
    paddingRight: 14,
    paddingVertical: 10,
    gap: 8,
  },
  // a fixed line height, so the box keeps exactly the same height while you type (it only grows a line at a time)
  // (no browser focus outline: the field's own box already shows where you type)
  input: {
    flex: 1,
    fontSize: 18,
    lineHeight: LINE,
    minHeight: LINE * 1.15,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
    outlineStyle: 'none' as 'solid',
  },
  // fixed width, wide enough for "150/150" on one line: Gaegu's digits differ in width, and a counter that grows or
  // shrinks would make the text re-wrap
  counter: { width: 64, textAlign: 'right', fontSize: 13, color: '#8e8e93' },
});
