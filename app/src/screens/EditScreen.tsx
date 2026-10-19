import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useReducer, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { BrushPanel } from '@/components/doodle/BrushPanel';
import { DoodleCanvas, type DoodleTool } from '@/components/doodle/DoodleCanvas';
import { PhotoFrame } from '@/components/PhotoFrame';
import { TextComposer } from '@/components/TextComposer';
import { ACCENT, ACCENT_MUTED, DRAW_CANVAS, INK, PAPER } from '@/lib/colors';
import { CLOSE_ICON, EDGE, TAP, TOP_BUTTON_TOP, usePhotoFrame } from '@/lib/layout';
import { getCurrentLngLat, nearby } from '@/lib/location';
import { newId, savePost } from '@/lib/posts';
import { BRUSH_COLORS, DOODLE_MARGIN, STROKE_WIDTH, strokesHit, type Point, type Stroke } from '@/lib/strokes';
import { DoodleLoader } from '@/components/DoodleLoader';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { press } from '@/lib/press';

type Mode = 'idle' | 'brush' | 'text';

// Doodle history. Undo/redo snapshots only live for one brush session; Back restores the session's start.
type Doodles = { strokes: Stroke[]; past: Stroke[][]; future: Stroke[][]; sessionStart: Stroke[]; erasing: boolean };
type Action =
  | { type: 'begin' }
  | { type: 'add'; stroke: Stroke }
  | { type: 'eraseStart' }
  | { type: 'erase'; ids: string[] }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'cancel' };

function doodles(state: Doodles, action: Action): Doodles {
  switch (action.type) {
    case 'begin':
      return { ...state, past: [], future: [], sessionStart: state.strokes };
    case 'add':
      return { ...state, strokes: [...state.strokes, action.stroke], past: [...state.past, state.strokes], future: [] };
    case 'eraseStart':
      return { ...state, erasing: false };
    case 'erase': {
      if (action.ids.length === 0) return state;
      const strokes = state.strokes.filter((s) => !action.ids.includes(s.id));
      // one drag of the eraser is one undo step, however many lines it removes
      const past = state.erasing ? state.past : [...state.past, state.strokes];
      return { ...state, strokes, past, future: state.erasing ? state.future : [], erasing: true };
    }
    case 'undo': {
      if (!state.past.length) return state;
      return {
        ...state,
        strokes: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
        future: [state.strokes, ...state.future],
      };
    }
    case 'redo': {
      if (!state.future.length) return state;
      return { ...state, strokes: state.future[0], past: [...state.past, state.strokes], future: state.future.slice(1) };
    }
    case 'cancel':
      return { ...state, strokes: state.sessionStart, past: [], future: [] };
  }
}

const ERASER_RADIUS = 10;
const POST_RADIUS_M = 20;
const CAPTION_LINE_HEIGHT = 22; // scaled by Text's 1.15 (Gaegu) on screen
// distance from the bottom of the screen to the top of the Brush / Text / Post bar, plus a little air
const BOTTOM_BAR_TOP = 44 + 52 + 12;

export function EditScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const insets = useSafeAreaInsets();
  const frame = usePhotoFrame();
  const { width: screenW, height: screenH } = useWindowDimensions();
  // the white drawing area reaches EDGE (24pt) from the screen's sides, with the same margin above and below the
  // photo; never more than DOODLE_MARGIN, the room every other view leaves around a photo for its doodles
  const margin = Math.min(DOODLE_MARGIN, (screenW - 2 * EDGE - frame.width) / 2);
  // the saved text gets the room between the photo and the bottom bar; long text shrinks a little to fit
  const captionTop = frame.top + frame.height + 36;
  // the saved text keeps its typed size; if it's taller than the room above the bottom bar, it scrolls
  const captionMaxHeight = Math.max(60, screenH - BOTTOM_BAR_TOP - captionTop);
  const [mode, setMode] = useState<Mode>('idle');
  const [tab, setTab] = useState<'brush' | 'eraser'>('brush');
  const [color, setColor] = useState<string>(BRUSH_COLORS[0].value);
  const [state, dispatch] = useReducer(doodles, { strokes: [], past: [], future: [], sessionStart: [], erasing: false });
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const { strokes } = state;
  const canPost = (strokes.length > 0 || text.length > 0) && mode === 'idle' && !posting;
  const tool: DoodleTool = mode !== 'brush' ? 'none' : tab;

  const onStroke = useCallback(
    (points: Point[]) => dispatch({ type: 'add', stroke: { id: newId(), color, width: STROKE_WIDTH, points } }),
    [color],
  );

  const onErase = useCallback(
    (x: number, y: number, first: boolean) => {
      if (first) dispatch({ type: 'eraseStart' });
      const ids = strokesHit(strokes, x, y, frame.width, frame.height, ERASER_RADIUS);
      if (ids.length) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        dispatch({ type: 'erase', ids });
      }
    },
    [strokes, frame.width, frame.height],
  );

  const openBrush = () => {
    Haptics.selectionAsync();
    dispatch({ type: 'begin' });
    setTab('brush');
    setMode('brush');
  };
  const saveBrush = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode('idle');
  };

  const close = () => {
    // the X leaves the whole capture flow, from wherever you are in it, straight back to the map
    const leave = () => router.dismissAll();
    if (!strokes.length && !text) return leave();
    Alert.alert('Discard This Photo?', 'Your doodles and text will be lost.', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: leave },
    ]);
  };

  const post = async () => {
    if (!canPost || !uri) return;
    setPosting(true);
    const here = await getCurrentLngLat();
    if (!here) {
      setPosting(false);
      return;
    }
    try {
      // pinned somewhere within 20 m of you, not on your exact spot
      const [lng, lat] = nearby(here, POST_RADIUS_M);
      await savePost({ sourceUri: uri, strokes, text, lng, lat });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // the map puts up a copy of this photo to shrink into the new pin; a moment lets its image load first,
      // so this screen fades away over an identical picture
      setTimeout(() => router.dismissAll(), 150);
    } catch (e) {
      setPosting(false);
      Alert.alert("Couldn't Save Post", (e as Error).message);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {mode === 'brush' && (
        // the area you can draw in: the photo plus a margin on every side
        <View
          style={[
            styles.drawArea,
            {
              left: frame.left - margin,
              top: frame.top - margin,
              width: frame.width + 2 * margin,
              height: frame.height + 2 * margin,
            },
          ]}
        />
      )}
      <PhotoFrame frame={frame} uri={uri} matte={mode === 'brush' ? DRAW_CANVAS : PAPER} />
      <DoodleCanvas frame={frame} margin={margin} strokes={strokes} tool={tool} color={color} onStroke={onStroke} onErase={onErase} />

      {text.length > 0 && mode === 'idle' && (
        <ScrollView
          style={[styles.caption, { left: frame.left, top: captionTop, width: frame.width, maxHeight: captionMaxHeight }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Pressable
            onPress={() => setMode('text')}
            accessibilityRole="button"
            accessibilityHint="Edit text"
            style={({ pressed }) => pressed && press.dim}
          >
            <Text style={styles.captionText}>{text}</Text>
          </Pressable>
        </ScrollView>
      )}

      <Pressable
        onPress={close}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={({ pressed }) => [styles.topLeft, { top: insets.top + TOP_BUTTON_TOP }, pressed && press.dim]}
      >
        <DoodleIcon name="close" size={CLOSE_ICON} />
      </Pressable>

      {mode === 'idle' && (
        <>
          <View style={styles.tools}>
            <ToolButton label="Draw" icon={<DoodleIcon name="brush" size={24} />} onPress={openBrush} />
            <ToolButton label="Text" icon={<DoodleIcon name="text" size={24} />} onPress={() => setMode('text')} />
          </View>
          {/* same style as Draw and Text; greyed out until there's a doodle or text */}
          <View style={styles.postTool}>
            <ToolButton
              label="Post"
              icon={
                posting ? (
                  <DoodleLoader size={30} color={ACCENT} />
                ) : (
                  <DoodleIcon name="post" size={24} color={canPost ? ACCENT : ACCENT_MUTED} />
                )
              }
              color={ACCENT}
              disabledColor={ACCENT_MUTED}
              onPress={post}
              disabled={!canPost}
            />
          </View>
        </>
      )}

      <BrushPanel
        visible={mode === 'brush'}
        tab={tab}
        onTab={setTab}
        color={color}
        onColor={setColor}
        canUndo={state.past.length > 0}
        canRedo={state.future.length > 0}
        onUndo={() => dispatch({ type: 'undo' })}
        onRedo={() => dispatch({ type: 'redo' })}
        onDone={saveBrush}
      />

      {mode === 'text' && (
        <TextComposer
          initial={text}
          onCancel={() => setMode('idle')}
          onSave={(t) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setText(t);
            setMode('idle');
          }}
        />
      )}
    </View>
  );
}

const DISABLED = '#c7c7cc';

function ToolButton({
  label,
  icon,
  onPress,
  disabled,
  color,
  disabledColor = DISABLED,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Label color when enabled. */
  color?: string;
  /** Label color when disabled. */
  disabledColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={8}
      style={({ pressed }) => [styles.tool, pressed && styles.pressed]}
    >
      <View style={styles.toolIcon}>{icon}</View>
      <Text style={[styles.toolLabel, color != null && { color }, disabled && { color: disabledColor }]}>{label}</Text>
    </Pressable>
  );
}

// Bottom bar positions from design/3-edit.png (distances from the screen bottom).
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  drawArea: { position: 'absolute', backgroundColor: DRAW_CANVAS, borderRadius: 6 },
  caption: { position: 'absolute' },
  captionText: { fontSize: 18, lineHeight: CAPTION_LINE_HEIGHT, color: INK },
  // just the X, in a full tap target
  topLeft: { position: 'absolute', left: EDGE, width: TAP, height: TAP, justifyContent: 'center' },
  tools: { position: 'absolute', left: EDGE, bottom: 44, flexDirection: 'row', gap: 20 },
  postTool: { position: 'absolute', right: EDGE, bottom: 44 },
  tool: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: TAP, minHeight: TAP },
  toolIcon: { height: 26, justifyContent: 'center' },
  toolLabel: { fontSize: 16 },
  pressed: { opacity: 0.6 },
});
