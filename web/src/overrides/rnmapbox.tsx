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
import mapboxgl from 'mapbox-gl';

import { FONTS } from '@/components/Text';

// Every label is drawn in the browser in the app's font (Gaegu, already loaded before the map appears), not with
// Mapbox's server fonts, as on the phone. The library makes its map with `new mapboxgl.Map(...)`, so the option is
// added there.
// (Safari draws text in a font on a canvas only once it has drawn with it there: until then it falls back to a serif,
// and the map would keep those first letters. So the font is drawn once on a canvas before the map starts.)
function warmUpFont() {
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return;
  ctx.font = `48px ${FONTS.regular}`;
  ctx.fillText('Aa', 0, 48);
}
const RealMap = mapboxgl.Map;
(mapboxgl as unknown as { Map: unknown }).Map = class extends RealMap {
  constructor(options: ConstructorParameters<typeof RealMap>[0]) {
    warmUpFont();
    super({ ...options, localFontFamily: FONTS.regular });
  }
};

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

// The tilt limit, which the web map view doesn't pass on to the map.
function MaxPitch({ value }: { value: number }) {
  const { map } = useContext(MapContext) as { map?: any };
  useEffect(() => {
    map?.setMaxPitch(value);
  }, [map, value]);
  return null;
}

// While the map follows you (Focus, the notification guide), whim moves it every frame, and each move cancels any
// touch on the map in progress, so a drag never gets far enough to count and the map can't tell you touched it.
// So a finger (or mouse, or trackpad) moving on the map is reported straight away as a gesture, which ends the
// following; from then on the map is yours as usual. (A tap that doesn't move isn't a gesture.)
const DRAG_PX = 4;
function GestureWatch({ onGesture }: { onGesture?: (state: unknown) => void }) {
  const { map } = useContext(MapContext) as { map?: any };
  const latest = useRef(onGesture);
  useEffect(() => {
    latest.current = onGesture;
  }, [onGesture]);
  useEffect(() => {
    if (!map) return;
    const canvas: HTMLElement = map.getCanvasContainer();
    let start: { x: number; y: number } | null = null;
    const report = () => {
      const c = map.getCenter();
      const b = map.getBounds();
      latest.current?.({
        properties: {
          center: [c.lng, c.lat],
          bounds: { ne: [b.getEast(), b.getNorth()], sw: [b.getWest(), b.getSouth()] },
          zoom: map.getZoom(),
          heading: map.getBearing(),
          pitch: map.getPitch(),
        },
        gestures: { isGestureActive: true },
        timestamp: Date.now(),
      });
    };
    const point = (e: TouchEvent | MouseEvent) => ('touches' in e ? e.touches[0] : e);
    const down = (e: TouchEvent | MouseEvent) => {
      const p = point(e);
      start = p ? { x: p.clientX, y: p.clientY } : null;
      // two fingers: a pinch or a turn
      if ('touches' in e && e.touches.length > 1) report();
    };
    const move = (e: TouchEvent | MouseEvent) => {
      const p = point(e);
      if (!start || !p) return;
      if (Math.hypot(p.clientX - start.x, p.clientY - start.y) > DRAG_PX) {
        start = null;
        report();
      }
    };
    const up = () => {
      start = null;
    };
    const opts = { passive: true, capture: true } as const;
    canvas.addEventListener('touchstart', down, opts);
    canvas.addEventListener('mousedown', down, opts);
    canvas.addEventListener('touchmove', move, opts);
    canvas.addEventListener('mousemove', move, opts);
    canvas.addEventListener('touchend', up, opts);
    canvas.addEventListener('mouseup', up, opts);
    canvas.addEventListener('wheel', report, opts);
    return () => {
      canvas.removeEventListener('touchstart', down, opts);
      canvas.removeEventListener('mousedown', down, opts);
      canvas.removeEventListener('touchmove', move, opts);
      canvas.removeEventListener('mousemove', move, opts);
      canvas.removeEventListener('touchend', up, opts);
      canvas.removeEventListener('mouseup', up, opts);
      canvas.removeEventListener('wheel', report, opts);
    };
  }, [map]);
  return null;
}

const RealMapView = MapboxGL.MapView as unknown as React.ComponentType<Record<string, unknown>>;
export const MapView = forwardRef<unknown, ComponentProps<typeof MapboxGL.MapView>>(function MapView(props, ref) {
  const { children, compassEnabled, compassPosition, compassFadeWhenNorth, maxPitch, onCameraChanged } = props as Record<string, any>;
  return (
    <RealMapView {...props} ref={ref}>
      {children}
      <GestureWatch onGesture={onCameraChanged} />
      {maxPitch != null && <MaxPitch value={maxPitch} />}
      {compassEnabled !== false && <WebCompass position={compassPosition} fadeWhenNorth={compassFadeWhenNorth} />}
    </RealMapView>
  );
});
