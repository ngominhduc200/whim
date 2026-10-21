import { ShapeSource, SymbolLayer, type MapView, type SymbolLayerStyle } from '@rnmapbox/maps';
import type { Feature, FeatureCollection, Point, Polygon, MultiPolygon, Position } from 'geojson';
import { useCallback, useRef, useState, type RefObject } from 'react';

import { AREA_LAYERS, FLOWER_ICON } from '@/lib/mapStyle';

// Forests, woods and parks filled with little upright doodles (pines and trees; trees, flowers and the odd pine in
// parks), so each reads as a whole area of them. Mapbox can only repeat a texture over an area, which turns and
// tilts with the map, so instead the areas on screen are looked up whenever the map comes to rest and a doodle is
// put down every so often inside them. They sit on a grid fixed to the map (with a little random shift per spot,
// the same every time), so panning doesn't shuffle them; each zoom level has its own, finer grid.

/** About this far apart on screen, in points. */
const SPACING = 44;
/** Never more than this many at once (a huge forest filling the screen). */
const MAX_DOODLES = 600;
const EMPTY: FeatureCollection<Point> = { type: 'FeatureCollection', features: [] };

type Bounds = { ne: Position; sw: Position };
type Area = { kind: 'forest' | 'park'; rings: Position[][][]; box: [number, number, number, number] };

// the world in points at zoom z (Web Mercator), and back
const toWorld = ([lng, lat]: Position, size: number) => {
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return [((lng + 180) / 360) * size, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size];
};
const fromWorld = (x: number, y: number, size: number): Position => [
  (x / size) * 360 - 180,
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI,
];

// a steady pseudo-random number in [0, 1) for a grid spot
const hash = (i: number, j: number, k: number) => {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

function inRing([x, y]: Position, ring: Position[]) {
  let inside = false;
  for (let a = 0, b = ring.length - 1; a < ring.length; b = a++) {
    const [xa, ya] = ring[a];
    const [xb, yb] = ring[b];
    if (ya > y !== yb > y && x < ((xb - xa) * (y - ya)) / (yb - ya) + xa) inside = !inside;
  }
  return inside;
}
// inside the outer ring and outside its holes (a lake in a park)
const inPolygon = (p: Position, rings: Position[][]) => inRing(p, rings[0]) && !rings.slice(1).some((h) => inRing(p, h));

function toArea(f: Feature): Area | null {
  const g = f.geometry as Polygon | MultiPolygon;
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : null;
  if (!polys) return null;
  let [w, s, e, n] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const poly of polys)
    for (const [x, y] of poly[0]) {
      w = Math.min(w, x);
      e = Math.max(e, x);
      s = Math.min(s, y);
      n = Math.max(n, y);
    }
  const kind = /park|grass|cemetery/.test(String(f.properties?.class ?? '')) ? 'park' : 'forest';
  return { kind, rings: polys, box: [w, s, e, n] };
}

// what grows where: forests are mostly pines; parks mostly trees and flowers
function pick(kind: Area['kind'], r: number) {
  if (kind === 'forest') return r < 0.62 ? 'pine' : 'tree';
  return r < 0.45 ? 'tree' : r < 0.82 ? FLOWER_ICON : 'pine';
}

export function useAreaDoodles(mapRef: RefObject<MapView | null>) {
  const [shape, setShape] = useState<FeatureCollection<Point>>(EMPTY);
  const busy = useRef(false);

  const refresh = useCallback(
    async (view: { zoom: number; bounds: Bounds }) => {
      const map = mapRef.current;
      if (!map || busy.current) return;
      busy.current = true;
      try {
        const found = await map.queryRenderedFeaturesInRect([], [], AREA_LAYERS);
        const areas = (found?.features ?? []).map(toArea).filter((a): a is Area => !!a);
        if (!areas.length) return void setShape(EMPTY);
        const z = Math.floor(view.zoom);
        const size = 512 * 2 ** z;
        const [x0, y0] = toWorld(view.bounds.sw, size);
        const [x1, y1] = toWorld(view.bounds.ne, size);
        const [i0, i1] = [Math.floor(Math.min(x0, x1) / SPACING), Math.ceil(Math.max(x0, x1) / SPACING)];
        const [j0, j1] = [Math.floor(Math.min(y0, y1) / SPACING), Math.ceil(Math.max(y0, y1) / SPACING)];
        if ((i1 - i0) * (j1 - j0) > 20_000) return;
        const features: Feature<Point>[] = [];
        for (let i = i0; i <= i1 && features.length < MAX_DOODLES; i++) {
          for (let j = j0; j <= j1 && features.length < MAX_DOODLES; j++) {
            // a few spots stay empty, so it isn't a plantation
            if (hash(i, j, z + 101) < 0.12) continue;
            const p = fromWorld((i + 0.15 + 0.7 * hash(i, j, z)) * SPACING, (j + 0.15 + 0.7 * hash(j, i, z + 7)) * SPACING, size);
            const area = areas.find((a) => p[0] >= a.box[0] && p[0] <= a.box[2] && p[1] >= a.box[1] && p[1] <= a.box[3] && a.rings.some((r) => inPolygon(p, r)));
            if (!area) continue;
            features.push({
              type: 'Feature',
              id: `${z}:${i}:${j}`,
              geometry: { type: 'Point', coordinates: p },
              properties: { icon: pick(area.kind, hash(i, j, z + 53)) },
            });
          }
        }
        setShape({ type: 'FeatureCollection', features });
      } catch {
        // the map was busy or gone: tried again when it next comes to rest
      } finally {
        busy.current = false;
      }
    },
    [mapRef],
  );

  return { shape, refresh };
}

const style: SymbolLayerStyle = {
  iconImage: ['get', 'icon'],
  iconAnchor: 'bottom',
  iconSize: ['interpolate', ['linear'], ['zoom'], 8, 0.36, 12, 0.48, 15, 0.6, 18, 0.72],
  // always upright on screen, even when the map turns or tilts
  iconRotationAlignment: 'viewport',
  iconPitchAlignment: 'viewport',
  // every doodle shows, and none of them pushes a name off the map
  iconAllowOverlap: true,
  iconIgnorePlacement: true,
  // nearer (lower on the screen) in front
  symbolZOrder: 'viewport-y',
  iconEmissiveStrength: 1,
};

/** The doodles filling the forests and parks on screen, just above the roads. */
export function AreaDoodles({ shape }: { shape: FeatureCollection<Point> }) {
  return (
    <ShapeSource id="area-doodles" shape={shape}>
      <SymbolLayer id="area-doodles" aboveLayerID="doodle-road" style={style} />
    </ShapeSource>
  );
}
