// The map library on the web, plus what its web version doesn't have yet: `Images` (the textures the doodle
// layers draw with: road wiggles, waves, flowers, the compass), added straight to the Mapbox map.
import { useContext, useEffect } from 'react';
import { Asset } from 'expo-asset';
// eslint-disable-next-line import/no-unresolved
// @ts-expect-error the web build's internal context has no type declarations
import MapContext from '@rnmapbox/maps/lib/module/web/MapContext';

import MapboxGL from '@rnmapbox/maps';

export * from '@rnmapbox/maps';
export { default } from '@rnmapbox/maps';

type ImageEntry = number | { image: number; scale?: number };

export function Images({ images }: { images: Record<string, ImageEntry> }) {
  const { map, styleGeneration } = useContext(MapContext) as { map?: any; styleGeneration?: number };
  useEffect(() => {
    if (!map) return;
    // handy when debugging in the browser console
    (window as unknown as { __whimMap?: unknown }).__whimMap = map;
    for (const [name, entry] of Object.entries(images)) {
      const { image, scale = 1 } = typeof entry === 'number' ? { image: entry } : entry;
      const uri = Asset.fromModule(image).uri;
      if (!uri || map.hasImage(name)) continue;
      map.loadImage(uri, (error: unknown, img: unknown) => {
        if (!error && img && !map.hasImage(name)) map.addImage(name, img, { pixelRatio: scale });
      });
    }
  }, [map, styleGeneration, images]);
  return null;
}

// Your style's color theme flattens every color to the canvas, and on the web that includes the space around the
// globe; keep the space dark (with its stars), as on the phone.
const RealAtmosphere = MapboxGL.Atmosphere;
export function Atmosphere(props: Parameters<typeof RealAtmosphere>[0]) {
  const { map, styleGeneration } = useContext(MapContext) as { map?: any; styleGeneration?: number };
  const spec = JSON.stringify(props.style);
  useEffect(() => {
    if (!map || !styleGeneration) return;
    const fog = map.getFog();
    if (fog && fog['space-color-use-theme'] !== 'none') map.setFog({ ...fog, 'space-color-use-theme': 'none' });
  }, [map, styleGeneration, spec]);
  return <RealAtmosphere {...props} />;
}
