// Web version of app/src/components/PhotoFrame.tsx: the same photo (or camera preview) in its hand-drawn frame,
// with everything outside the drawn line covered in the background color, drawn as one SVG that never catches
// clicks (so buttons inside the frame, like "Allow camera", can be pressed).
import { Image } from 'expo-image';
import { useId, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FRAME_HEIGHT, FRAME_INSET_X, FRAME_INSET_Y, FRAME_PATH_D, FRAME_WIDTH } from '@/components/frame';
import { ICON_SVGS } from '@/components/icons/svgs';
import { PHOTO_WIDTH } from '@/lib/layout';

type Props = {
  frame: { left: number; top: number; width: number; height: number };
  uri?: string;
  children?: ReactNode;
  matte: string;
};

// how far the cover reaches past the photo's rectangle
const BLEED = 3;
const FRAME_INNER = ICON_SVGS.photoFrame.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export function PhotoFrame({ frame, uri, children, matte }: Props) {
  const s = frame.width / PHOTO_WIDTH;
  const box = { x: frame.left - FRAME_INSET_X * s, y: frame.top - FRAME_INSET_Y * s, width: FRAME_WIDTH * s, height: FRAME_HEIGHT * s };
  const maskId = `matte-${useId().replace(/[:«»]/g, '')}`;
  return (
    <>
      <View style={[styles.inner, { left: box.x, top: box.y, width: box.width, height: box.height }]}>
        {children ?? (uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} /> : null)}
      </View>
      <svg
        width={box.width}
        height={box.height}
        style={{ position: 'absolute', left: box.x, top: box.y, pointerEvents: 'none', overflow: 'visible' }}
      >
        <defs>
          {/* everything but the inside of the drawn line */}
          <mask id={maskId} maskUnits="userSpaceOnUse" x={-BLEED} y={-BLEED} width={box.width + 2 * BLEED} height={box.height + 2 * BLEED}>
            <rect x={-BLEED} y={-BLEED} width={box.width + 2 * BLEED} height={box.height + 2 * BLEED} fill="white" />
            <path d={FRAME_PATH_D} transform={`scale(${s})`} fill="black" />
          </mask>
        </defs>
        {/* reaches a little past the photo's rectangle, so not even a hairline of its straight edge shows */}
        <rect x={-BLEED} y={-BLEED} width={box.width + 2 * BLEED} height={box.height + 2 * BLEED} fill={matte} mask={`url(#${maskId})`} />
        <g transform={`scale(${s})`} fill="none" dangerouslySetInnerHTML={{ __html: FRAME_INNER }} />
      </svg>
    </>
  );
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', overflow: 'hidden', backgroundColor: '#f2f2f7' },
});
