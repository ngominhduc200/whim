// The map library on the web, plus what its web version doesn't have yet: `Images` (the textures the doodle
// layers draw with: road wiggles, waves, flowers, the compass), added straight to the Mapbox map.
import { forwardRef, useContext, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Image, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

// Keeps a "selected" marker (your location cloud) drawn above the others, as it is on the phone (the web map
// ignores isSelected and stacks markers in the order they were added).
// (typed loosely: the native MarkerView's types don't declare the ref the web one exposes)
const RealMarkerView = MapboxGL.MarkerView as unknown as React.ComponentType<Record<string, unknown>>;
export const MarkerView = forwardRef<unknown, ComponentProps<typeof MapboxGL.MarkerView>>(function MarkerView(props, ref) {
  const marker = useRef<{ getElement(): HTMLElement } | null>(null);
  useEffect(() => {
    const el = marker.current?.getElement();
    if (el) el.style.zIndex = props.isSelected ? '10' : '';
  });
  return (
    <RealMarkerView
      {...props}
      ref={(m: unknown) => {
        marker.current = m as { getElement(): HTMLElement } | null;
        if (typeof ref === 'function') ref(m);
        else if (ref) ref.current = m;
      }}
    />
  );
});

// The compass, which the web map doesn't draw: the same hand-drawn needle, at the same spot, turning with the map.
// It fades out when the map faces north (as compassFadeWhenNorth does on the phone); tap it to face north again.
type CompassProps = { position?: { top?: number; left?: number; right?: number; bottom?: number }; fadeWhenNorth?: boolean };
function WebCompass({ position, fadeWhenNorth }: CompassProps) {
  const { map } = useContext(MapContext) as { map?: any };
  const [bearing, setBearing] = useState(0);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!map) return;
    const update = () => setBearing(map.getBearing());
    update();
    map.on('rotate', update);
    return () => map.off('rotate', update);
  }, [map]);
  const north = Math.abs(((bearing % 360) + 360) % 360) < 0.5 || Math.abs((((bearing % 360) + 360) % 360) - 360) < 0.5;
  const hidden = fadeWhenNorth && north;
  return (
    <Pressable
      onPress={() => map?.easeTo({ bearing: 0, duration: 400 })}
      accessibilityRole="button"
      accessibilityLabel="Face north"
      disabled={hidden}
      style={{
        position: 'absolute',
        top: (position?.top ?? 0) + insets.top,
        left: position?.left,
        right: position?.right,
        width: 44,
        height: 44,
        opacity: hidden ? 0 : 1,
        transitionProperty: 'opacity',
        transitionDuration: '250ms',
        zIndex: 5,
      } as object}
    >
      <Image source={COMPASS} style={{ width: 44, height: 44, transform: [{ rotate: `${-bearing}deg` }] }} />
    </Pressable>
  );
}
const COMPASS = require('@/assets/landmarks/compass.png');

const RealMapView = MapboxGL.MapView as unknown as React.ComponentType<Record<string, unknown>>;
export const MapView = forwardRef<unknown, ComponentProps<typeof MapboxGL.MapView>>(function MapView(props, ref) {
  const { children, compassEnabled, compassPosition, compassFadeWhenNorth } = props as Record<string, any>;
  return (
    <RealMapView {...props} ref={ref}>
      {children}
      {compassEnabled !== false && <WebCompass position={compassPosition} fadeWhenNorth={compassFadeWhenNorth} />}
    </RealMapView>
  );
});
