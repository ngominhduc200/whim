import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { DoodleIcon } from '@/components/icons/DoodleIcon';
import { PAPER } from '@/lib/colors';
import { isNearbyRepeatOn, setNearbyRepeat } from '@/lib/notify';
import { clearPosts } from '@/lib/posts';
import { CLOSE_ICON, EDGE, TAP } from '@/lib/layout';
import { press } from '@/lib/press';

const ROW_TITLE_SIZE = 18;
const DANGER = '#E5484D';

// not built yet: shown, but disabled
const LATER: { title: string; symbol: SymbolViewProps['name'] }[] = [
  { title: 'Account', symbol: 'person.crop.circle' },
  { title: 'Privacy', symbol: 'hand.raised' },
  { title: 'About whim', symbol: 'info.circle' },
];

/**
 * Settings: the "Moment nearby" notification (a demo: every minute while it's on), the settings to come
 * (disabled), and clearing your posts.
 */
export function SettingsScreen({ onClose, onContentHeight }: { onClose?: () => void; onContentHeight?: (h: number) => void } = {}) {
  const [notifying, setNotifying] = useState(false);
  useEffect(() => {
    isNearbyRepeatOn().then(setNotifying);
  }, []);
  const removeMyPosts = () => {
    const clear = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      clearPosts();
    };
    const message = "Every post you made will be taken off the map. This can't be undone.";
    // (React Native's alerts don't exist in a browser; the browser's own confirm does the same job there)
    if (Platform.OS === 'web') {
      if (window.confirm(`Clear all your posts?\n\n${message}`)) clear();
      return;
    }
    Alert.alert('Clear All Your Posts?', message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: clear },
    ]);
  };
  const toggleNotifications = (on: boolean) => {
    setNotifying(on);
    // if permission is refused, it flips back off
    setNearbyRepeat(on).then(setNotifying);
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={(_, h) => onContentHeight?.(h)}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable
          onPress={onClose ?? (() => router.back())}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={({ pressed }) => [styles.close, pressed && press.dim]}
        >
          <DoodleIcon name="close" size={CLOSE_ICON} />
        </Pressable>
      </View>

      <View>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.rowIcon}>
              <SymbolView name="bell" size={20} tintColor="#8e8e93" />
            </View>
            <Text style={styles.rowTitle}>Notifications</Text>
            <Toggle value={notifying} onValueChange={toggleNotifications} accessibilityLabel="Moment nearby notifications every minute" />
          </View>
        </View>
        <Text style={styles.note}>
          For demo and testing: with notifications on, you get a &quot;Someone left a Moment nearby&quot; alert every minute. Tap it to be
          pointed to the moment.
        </Text>
      </View>

      <View style={[styles.group, styles.disabled]} accessibilityState={{ disabled: true }}>
        {LATER.map((row, i) => (
          <View key={row.title} style={styles.row}>
            {/* the divider runs from the titles' left edge, like iOS lists; the row's content stays in line */}
            {i > 0 && <View style={styles.divider} />}
            <View style={styles.rowIcon}>
              <SymbolView name={row.symbol} size={20} tintColor="#8e8e93" />
            </View>
            <Text style={styles.rowTitle}>{row.title}</Text>
            <SymbolView name="chevron.right" size={13} tintColor="#c4c4c7" weight="semibold" />
          </View>
        ))}
      </View>

      {/* for testing: clears every post you made off the map (the sample posts stay) */}
      <View style={styles.group}>
        <Pressable onPress={removeMyPosts} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && press.dim]}>
          <View style={styles.rowIcon}>
            <SymbolView name="trash" size={20} tintColor={DANGER} />
          </View>
          <Text style={[styles.rowTitle, styles.danger]}>Clear all my posts</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAPER },
  // the same 24pt above the title and below the last row
  content: { padding: EDGE, gap: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 28, fontWeight: '700' },
  // just the X, in a full tap target, at the right edge
  close: { width: TAP, height: TAP, alignItems: 'flex-end', justifyContent: 'center' },
  group: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  // every row: the same 16pt padding, a 24pt icon column, the title, then the chevron or switch at the right edge
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, minHeight: 52 },
  rowIcon: { width: 24, alignItems: 'center' },
  divider: {
    position: 'absolute',
    top: 0,
    left: 16 + 24 + 12,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#c6c6c8',
  },
  rowTitle: { flex: 1, fontSize: ROW_TITLE_SIZE },
  // the description under a group, like iOS settings footers
  note: { color: '#8e8e93', fontSize: 14, lineHeight: 18, marginTop: 8 },
  disabled: { opacity: 0.45 },
  danger: { color: DANGER },
});
