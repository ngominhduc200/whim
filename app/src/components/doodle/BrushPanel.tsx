import * as Haptics from 'expo-haptics';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { BottomPanel } from '@/components/BottomPanel';
import { Text } from '@/components/Text';
import { BAR_ICON, EDGE, TAP } from '@/lib/layout';
import { BRUSH_COLORS } from '@/lib/strokes';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { INK, SHEET, SHEET_FILL } from '@/lib/colors';
import { press } from '@/lib/press';

type Tab = 'brush' | 'eraser';

type Props = {
  visible: boolean;
  tab: Tab;
  onTab: (tab: Tab) => void;
  color: string;
  onColor: (color: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDone: () => void;
};

// Layout from design/4-brush.png: tabs ~26pt below the sheet top, colors ~97pt, sheet ~166pt tall.
const SHEET_HEIGHT = 176; // includes the handle's 10pt of extra breathing room

export function BrushPanel({ visible, tab, onTab, color, onColor, canUndo, canRedo, onUndo, onRedo, onDone }: Props) {
  const undoRedo = (
    <View style={styles.undoPill}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        hitSlop={8}
        accessibilityLabel="Undo"
        style={({ pressed }) => [styles.undoBtn, pressed && press.dim]}
      >
        <DoodleIcon name="undo" size={18} color={canUndo ? INK : '#c7c7cc'} />
      </Pressable>
      <View style={styles.undoDivider} />
      <Pressable
        onPress={onRedo}
        disabled={!canRedo}
        hitSlop={8}
        accessibilityLabel="Redo"
        style={({ pressed }) => [styles.undoBtn, pressed && press.dim]}
      >
        <DoodleIcon name="redo" size={18} color={canRedo ? INK : '#c7c7cc'} />
      </Pressable>
    </View>
  );

  return (
    <BottomPanel visible={visible} height={SHEET_HEIGHT} onSwipeDown={onDone} accessory={undoRedo}>
      <View style={styles.tabsRow}>
        <View style={styles.tabs}>
          <TabButton label="Brush" icon="brush" active={tab === 'brush'} onPress={() => onTab('brush')} />
          <TabButton label="Eraser" icon="eraser" active={tab === 'eraser'} onPress={() => onTab('eraser')} />
        </View>
        <Pressable
          onPress={onDone}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Save doodles"
          style={({ pressed }) => [styles.done, pressed && press.dim]}
        >
          <DoodleIcon name="check" size={BAR_ICON} />
        </Pressable>
      </View>

      {tab === 'brush' ? (
        <View style={styles.colors} accessibilityRole="radiogroup">
          {BRUSH_COLORS.map((c) => {
            const selected = c.value === color;
            return (
              <Pressable
                key={c.value}
                onPress={() => {
                  Haptics.selectionAsync();
                  onColor(c.value);
                }}
                accessibilityRole="radio"
                accessibilityLabel={c.name}
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.ring, pressed && press.shrink]}
              >
                {/* absolute, but centered by the ring box's alignment (its drawing isn't quite square) */}
                {selected && <DoodleIcon name="buttonRing" size={TAP} color={edgeColor(c.value)} style={styles.centered} />}
                <View style={styles.swatch}>
                  {/* white would vanish on the light panel, so it sits on a slightly bigger warm-grey copy of itself */}
                  {c.value === WHITE && (
                    <Image source={SWATCH_IMAGE} tintColor={WHITE_EDGE} style={[styles.swatchImage, styles.whiteEdge]} />
                  )}
                  <Image source={SWATCH_IMAGE} tintColor={c.value} style={styles.swatchImage} />
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.hint}>Touch a line to erase it</Text>
      )}
    </BottomPanel>
  );
}

function TabButton({ label, icon, active, onPress }: { label: string; icon: 'brush' | 'eraser'; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        if (!active) Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [styles.tab, active && styles.tabActive, pressed && !active && press.dim]}
    >
      <DoodleIcon name={icon} size={18} color={active ? INK : '#8e8e93'} />
      <Text style={[styles.tabLabel, !active && styles.tabLabelInactive]}>{label}</Text>
    </Pressable>
  );
}

// a roughened round blob (scripts/swatch.svg, rendered white by scripts/build-landmark-icons.mjs), tinted per color
// a compact pill, so it floats clear of the photo above the panel (taps reach a little past each button)
const PILL_BTN = 36;
const PILL_PAD_X = 4;
const PILL_PAD_Y = 2;
const SWATCH_IMAGE = require('@/assets/landmarks/swatch.png');
const SWATCH = 30;
const WHITE = '#FFFFFF';
const WHITE_EDGE = '#D9CFC3';
/** The selected ring is drawn in the swatch's own color (white uses a warm grey so it shows). */
const edgeColor = (color: string) => (color === WHITE ? WHITE_EDGE : color);
const styles = StyleSheet.create({
  tabsRow: { height: 52, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, height: TAP, borderRadius: TAP / 2 },
  tabActive: { backgroundColor: SHEET_FILL },
  tabLabel: { fontSize: 16, color: INK },
  tabLabelInactive: { color: '#8e8e93' },
  done: { position: 'absolute', right: EDGE, height: 44, width: 44, alignItems: 'flex-end', justifyContent: 'center' },
  colors: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 20 },
  // a full 44pt tap target around each scribbled swatch; the selected one gets the hand-drawn button outline
  ring: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: SWATCH, height: SWATCH, alignItems: 'center', justifyContent: 'center' },
  swatchImage: { width: SWATCH, height: SWATCH },
  whiteEdge: { position: 'absolute', transform: [{ scale: 1.07 }] },
  centered: { position: 'absolute' },
  hint: { textAlign: 'center', color: '#8e8e93', fontSize: 18, marginTop: 30 },
  undoPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SHEET,
    // compact: 36pt buttons with a sliver of padding, and a little air around the divider
    borderRadius: (PILL_BTN + 2 * PILL_PAD_Y) / 2,
    paddingVertical: PILL_PAD_Y,
    paddingHorizontal: PILL_PAD_X,
    gap: 2,
    boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
  },
  undoBtn: { width: PILL_BTN + 4, height: PILL_BTN, alignItems: 'center', justifyContent: 'center' },
  undoDivider: { width: StyleSheet.hairlineWidth, height: 16, backgroundColor: '#c6c6c8' },
});
