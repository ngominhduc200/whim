import { Canvas, ImageSVG, Path, PathOp, Skia } from '@shopify/react-native-skia';
import { Image } from 'expo-image';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { FRAME_HEIGHT, FRAME_INSET_X, FRAME_INSET_Y, FRAME_WIDTH, framePath } from '@/components/frame';
import { svgFor } from '@/components/icons/DoodleIcon';
import { PHOTO_WIDTH } from '@/lib/layout';

type Props = {
  frame: { left: number; top: number; width: number; height: number };
  uri?: string;
  /** Rendered inside the frame instead of a photo (the live camera preview). */
  children?: ReactNode;
  /** The color behind the frame. The photo's edges outside the drawn line are covered in it. */
  matte: string;
};

/**
 * The photo inside its hand-drawn frame (components/frame.ts). The camera preview is a native view that can't be
 * clipped to a drawn shape, so instead everything between the photo's rectangle and the frame line is covered in
 * the background color: the photo's edges then follow the line.
 */
export function PhotoFrame({ frame, uri, children, matte }: Props) {
  const s = frame.width / PHOTO_WIDTH;
  const box = { x: frame.left - FRAME_INSET_X * s, y: frame.top - FRAME_INSET_Y * s, width: FRAME_WIDTH * s, height: FRAME_HEIGHT * s };

  const outside = useMemo(() => {
    const rect = Skia.Path.Make();
    rect.addRect(Skia.XYWHRect(0, 0, box.width, box.height));
    const inside = framePath(FRAME_INSET_X * s, FRAME_INSET_Y * s, s);
    return Skia.Path.MakeFromOp(rect, inside, PathOp.Difference)!;
  }, [box.width, box.height, s]);
  const line = svgFor('photoFrame', box.width, box.height);

  return (
    <>
      {/* the photo fills the whole frame drawing; everything past the drawn line is covered by the matte */}
      <View style={[styles.inner, { left: box.x, top: box.y, width: box.width, height: box.height }]}>
        {children ?? (uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} /> : null)}
      </View>
      <Canvas style={[styles.abs, { left: box.x, top: box.y, width: box.width, height: box.height }]} pointerEvents="none">
        <Path path={outside} color={matte} />
        <ImageSVG svg={line} x={0} y={0} width={box.width} height={box.height} />
      </Canvas>
    </>
  );
}

const styles = StyleSheet.create({
  inner: { position: 'absolute', overflow: 'hidden', backgroundColor: '#f2f2f7' },
  abs: { position: 'absolute' },
});
