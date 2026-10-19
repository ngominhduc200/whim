import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/Text';
import { DoodlePhoto, doodleMargin } from '@/components/doodle/DoodlePhoto';
import { PIN_FRAME_STROKE, PIN_WIDTH } from '@/components/map/PostPin';
import type { MapItem } from '@/lib/clusters';
import { photoSource } from '@/lib/posts';
import { INK, LAND } from '@/lib/colors';

type Cluster = Extract<MapItem, { kind: 'cluster' }>;
type Props = { cluster: Cluster; onPress: (cluster: Cluster) => void };

/**
 * Always exactly two photos, stacked and slightly tilted like design/7-cluster-ref.png. Only the front one has
 * doodles. The badge shows how many posts are in it.
 */
export const ClusterPin = memo(function ClusterPin({ cluster, onPress }: Props) {
  const { front, back, count } = cluster;
  const m = doodleMargin(PIN_WIDTH);
  return (
    <Pressable
      onPress={() => onPress(cluster)}
      accessibilityRole="button"
      accessibilityLabel={`${count} posts. Zoom in`}
      style={({ pressed }) => [styles.pin, pressed && styles.pressed]}>
      <View>
        <DoodlePhoto
          source={photoSource(back)}
          strokes={back.strokes}
          showStrokes={false}
          width={PIN_WIDTH}
          frameStroke={PIN_FRAME_STROKE}
          style={styles.back}
        />
        <DoodlePhoto
          source={photoSource(front)}
          strokes={front.strokes}
          width={PIN_WIDTH}
          frameStroke={PIN_FRAME_STROKE}
          style={styles.front}
        />
        <View style={[styles.badge, { right: m - 9, bottom: m - 7 }]}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
  back: { position: 'absolute', transform: [{ translateX: 7 }, { translateY: -4 }, { rotate: '8deg' }] },
  front: { transform: [{ rotate: '-4deg' }] },
  badge: {
    position: 'absolute',
    minWidth: 24,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: INK,
    borderWidth: 2,
    borderColor: LAND, // the map's land color
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
