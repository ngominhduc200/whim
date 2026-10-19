import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { DoodlePhoto, doodleMargin } from '@/components/doodle/DoodlePhoto';
import { photoSource, type Post } from '@/lib/posts';

export const PIN_WIDTH = 56;
/** The hand-drawn frame's line on the map: thinner than on the big screens since pins are small, but the UI's 2pt minimum. */
export const PIN_FRAME_STROKE = 2;

type Props = { post: Post; onPress: (post: Post) => void };

// The bottom edge of the photo (not of the doodle margin around it) sits on the post's location.
const PIN_MARGIN = doodleMargin(PIN_WIDTH);
const PIN_HEIGHT = (PIN_WIDTH * 4) / 3;
export const PIN_ANCHOR = { x: 0.5, y: (PIN_MARGIN + PIN_HEIGHT) / (PIN_HEIGHT + 2 * PIN_MARGIN) };

/** The post's photo in its hand-drawn frame, with its doodles (no text). Anchor the marker with PIN_ANCHOR. */
export const PostPin = memo(function PostPin({ post, onPress }: Props) {
  return (
    <Pressable
      onPress={() => onPress(post)}
      accessibilityRole="button"
      accessibilityLabel="Open post"
      style={({ pressed }) => [styles.pin, pressed && styles.pressed]}>
      <DoodlePhoto
        source={photoSource(post)}
        strokes={post.strokes}
        width={PIN_WIDTH}
        frameStroke={PIN_FRAME_STROKE}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  pin: { alignItems: 'center' },
  pressed: { transform: [{ scale: 0.94 }] },
});
