import type { StandardStyleConfig } from '@rnmapbox/maps';

import { CANVAS_THEME_LUT } from './canvasTheme';
import PALETTE from './palette.json';
import { LANDMARK_NAMES } from '@/data/landmarks';
import { SKIPPED_MAKI, STORE_ICON_EXPRESSION } from '@/data/storeIcons';

/**
 * The map is a canvas: your Mapbox Standard style (from Studio) underneath, flattened to one color so all its
 * detail is hidden, with hand-drawn doodles on top: wiggle roads, waves on the water, trees and
 * flowers in forests and parks, and small mountains on summits. Colors live in palette.json, shared with
 * scripts/build-landmark-icons.mjs (which draws the doodles and textures).
 */
export const MAP_STYLE_URL = 'mapbox://styles/ngominhduc200/cmve6q4wc008a01so61cy8j4a';

/** The doodles' pen color (landmarks, trees, flowers, mountains). */
export const INK = PALETTE.ink;
/** The canvas (land). */
export const PAPER = PALETTE.land;
/** Water: a touch deeper than the land, so the two read apart. */
export const WATER = PALETTE.water;
/** The map's doodles draw in exactly their colors, unaffected by Standard's day lighting. */
const UNLIT = 1;

export const STANDARD_CONFIG: Omit<StandardStyleConfig, 'theme'> & Record<string, string | boolean> = {
  // a custom color theme that maps every color to the canvas color: land, water, parks, buildings, roads and
  // mountain shading all become one flat color, so Standard only provides the globe and lighting
  theme: 'custom',
  'theme-data': CANVAS_THEME_LUT,
  // nothing extra: no 3D, no labels, no landmarks of its own
  showLandmarkIcons: false,
  show3dLandmarks: false,
  show3dObjects: false,
  show3dBuildings: false,
  show3dTrees: false,
  show3dFacades: false,
  showPedestrianRoads: false,
  showPlaceLabels: false,
  showRoadLabels: false,
  showPointOfInterestLabels: false,
  showTransitLabels: false,
  showLandmarkIconLabels: false,
  showAdminBoundaries: false,
};

export type Layer = {
  id: string;
  type: 'line' | 'fill' | 'symbol';
  source: 'streets' | 'terrain';
  'source-layer': string;
  minzoom?: number;
  maxzoom?: number;
  filter?: unknown;
  layout?: Record<string, unknown>;
  paint?: Record<string, unknown>;
};

// ---- Roads ----

// Drawn with a hand-drawn wiggle texture from scripts/build-landmark-icons.mjs (frequency 1000%, wiggle 10%,
// smoothen 100%) instead of a sharp straight line. Mapbox stretches the texture to the line width and the
// stroke fills STROKE_BAND of it, so the widths below are visible stroke widths, divided by STROKE_BAND for
// Mapbox. Keep it in sync with the script.
export const LINE_PATTERNS = { roadMain: 'road-main', roadMinor: 'road-minor' } as const;
const STROKE_BAND = 0.4;

// Visible road width per class, as [zoom, width] stops. Only the main network, kept simple: no ramps or
// connector links (the split pieces and loops around interchanges), no roundabouts; secondary roads from zoom
// 12 and streets only at street level (15+). Alleys, paths and service roads are left out.
const ROAD_WIDTHS: Record<string, [number, number][]> = {
  motorway: [[5, 0.5], [6, 0.8], [8, 1.0], [10, 1.2], [12, 1.6], [13, 2.2], [14, 3], [15, 4], [16, 5.5], [17, 7.5], [18, 10], [20, 22]],
  // smaller highways join the big ones from zoom 9
  primary: [[8.75, 0], [9, 0.6], [10, 0.9], [12, 1.3], [13, 1.8], [14, 2.6], [15, 3.5], [16, 4.8], [17, 6.5], [18, 9], [20, 20]],
  secondary: [[11.5, 0], [12, 0.7], [13, 1.2], [14, 1.9], [15, 2.8], [16, 3.8], [17, 5.2], [18, 7], [20, 16]],
  street: [[14.75, 0], [15, 0.9], [16, 2], [17, 3.2], [18, 4.5], [20, 11]],
};
const ROAD_CLASSES: Record<string, string[]> = {
  motorway: ['motorway', 'trunk'],
  primary: ['primary'],
  secondary: ['secondary', 'tertiary'],
  street: ['street', 'street_limited'],
};
const MAIN_ROADS = [...ROAD_CLASSES.motorway, ...ROAD_CLASSES.primary];

function widthAt(stops: [number, number][], z: number) {
  if (z <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z1, w1] = stops[i];
    if (z <= z1) {
      const [z0, w0] = stops[i - 1];
      return w0 + ((w1 - w0) * (z - z0)) / (z1 - z0);
    }
  }
  return stops[stops.length - 1][1];
}

// Precomputed every quarter zoom so each class can start at its own zoom.
const STOP_ZOOMS = Array.from({ length: 61 }, (_, i) => 5 + i * 0.25);

function roadWidth() {
  const stops: unknown[] = [];
  for (const z of STOP_ZOOMS) {
    const match: unknown[] = ['match', ['get', 'class']];
    for (const [group, classes] of Object.entries(ROAD_CLASSES)) {
      match.push(classes, widthAt(ROAD_WIDTHS[group], z) / STROKE_BAND);
    }
    match.push(0);
    stops.push(z, match);
  }
  return ['interpolate', ['linear'], ['zoom'], ...stops];
}

function roadLayer(): Layer {
  return {
    id: 'doodle-road',
    type: 'line',
    source: 'streets',
    'source-layer': 'road',
    minzoom: 5,
    filter: [
      'all',
      ['==', ['geometry-type'], 'LineString'],
      ['match', ['get', 'class'], Object.values(ROAD_CLASSES).flat(), true, false],
      ['match', ['get', 'type'], ['roundabout', 'mini_roundabout', 'circular', 'turning_circle', 'turning_loop'], false, true],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round', 'line-sort-key': ['match', ['get', 'class'], MAIN_ROADS, 2, 1] },
    paint: {
      'line-width': roadWidth(),
      // main roads get the full stroke, the rest a fainter one
      'line-pattern': ['match', ['get', 'class'], MAIN_ROADS, LINE_PATTERNS.roadMain, LINE_PATTERNS.roadMinor],
      'line-emissive-strength': UNLIT,
    },
  };
}

// ---- Doodles ----

/** Scattered little waves over the water (scripts/build-landmark-icons.mjs, registered by the map). */
export const WATER_PATTERN = 'water-waves';

function waterLayer(): Layer {
  return {
    id: 'canvas-water',
    type: 'fill',
    source: 'streets',
    'source-layer': 'water',
    paint: { 'fill-color': WATER, 'fill-emissive-strength': UNLIT },
  };
}

function wavesLayer(): Layer {
  return {
    id: 'doodle-water-waves',
    type: 'fill',
    source: 'streets',
    'source-layer': 'water',
    // not on the globe: too small to see there, and the pole cap smears the pattern into a blob
    minzoom: 5,
    paint: { 'fill-pattern': WATER_PATTERN, 'fill-emissive-strength': UNLIT },
  };
}

// Nature, kept sparse: little trees in forests and woods, a flower and a tree in parks, and a small mountain on
// summits. Each is a single doodle anchored inside its area (not a repeating ground pattern), so it stays upright
// when the map rotates; doodles that would crowd each other are skipped. Big forests come from the terrain
// tiles when zoomed out and the detailed street tiles closer in.
export const FLOWER_ICON = 'flower'; // registered by the map; trees and mountains use the landmark doodles
// Forests, woods and parks: invisible here, only so the map can say where they are on screen; components/map/
// AreaDoodles fills them with little upright trees and flowers. Big forests come from the terrain tiles when zoomed
// out and the detailed street tiles closer in.
export const AREA_LAYERS = ['area-forest-far', 'area-forest', 'area-park'];
function areaLayers(): Layer[] {
  const area = (id: string, source: Layer['source'], sourceLayer: string, filter: unknown, minzoom: number, maxzoom?: number): Layer => ({
    id,
    type: 'fill',
    source,
    'source-layer': sourceLayer,
    minzoom,
    ...(maxzoom ? { maxzoom } : {}),
    filter,
    paint: { 'fill-color': PAPER, 'fill-opacity': 0 },
  });
  return [
    area(AREA_LAYERS[0], 'terrain', 'landcover', ['==', ['get', 'class'], 'wood'], 8, 10),
    area(AREA_LAYERS[1], 'streets', 'landuse', ['match', ['get', 'class'], ['wood', 'scrub'], true, false], 10),
    area(AREA_LAYERS[2], 'streets', 'landuse', ['match', ['get', 'class'], ['park', 'grass', 'cemetery'], true, false], 12),
  ];
}

function natureLayers(): Layer[] {
  const doodle = (
    id: string,
    source: Layer['source'],
    sourceLayer: string,
    filter: unknown,
    icon: string,
    minzoom: number,
    opts: { maxzoom?: number; offset?: [number, number]; size?: unknown } = {},
  ): Layer => ({
    id,
    type: 'symbol',
    source,
    'source-layer': sourceLayer,
    minzoom,
    ...(opts.maxzoom ? { maxzoom: opts.maxzoom } : {}),
    filter,
    layout: {
      'icon-image': icon,
      'icon-size': opts.size ?? ['interpolate', ['linear'], ['zoom'], 7, 0.32, 13, 0.5, 17, 0.7],
      // a second doodle in the same area sits a little off the first, so areas get a small scatter
      'icon-offset': opts.offset ?? [0, 0],
      'icon-padding': 26,
      'icon-rotation-alignment': 'viewport',
      'icon-pitch-alignment': 'viewport',
    },
    paint: { 'icon-emissive-strength': UNLIT },
  });
  const summits = ['all', ['==', ['get', 'class'], 'landform'], ['match', ['get', 'maki'], ['mountain', 'volcano'], true, false], ['==', ['geometry-type'], 'Point']];
  // (forests, woods and parks themselves are filled with trees: see areaLayers; far out, before those fills
  // start, a big forest still gets a doodle or two)
  return [
    doodle('doodle-forest-far', 'terrain', 'landcover', ['==', ['get', 'class'], 'wood'], 'pine', 7, { maxzoom: 8 }),
    doodle('doodle-forest-far-2', 'terrain', 'landcover', ['==', ['get', 'class'], 'wood'], 'tree', 7, { maxzoom: 8, offset: [70, 45] }),
    doodle('doodle-national-park', 'streets', 'landuse_overlay', ['==', ['get', 'class'], 'national_park'], 'pine', 8, { offset: [-60, 30] }),
    doodle('doodle-peaks', 'streets', 'natural_label', summits, 'mountain', 7, {
      size: ['interpolate', ['linear'], ['zoom'], 7, 0.3, 12, 0.5, 16, 0.75],
    }),
  ];
}

// ---- Names ----

// Every name on the map, in Gaegu (the map draws label text with the app's own font: see the MapView setup), in a
// darker ink than the doodles so it reads, with a halo of the land color. Which names show depends on the zoom, as
// on any map: countries from space, cities as you come in, then neighbourhoods, streets and places.
export const LABEL_FONT = ['Gaegu Regular'];
// every name in English where the map data has it (most places do), otherwise in the local language
const NAME = ['coalesce', ['get', 'name_en'], ['get', 'name']];
const LABEL_INK = PALETTE.label;
const LABEL_HALO = PALETTE.land;
// Gaegu draws small for its size (the app scales its text by 1.15 too)
const G = 1.15;
const zoomSize = (...stops: number[]) => ['interpolate', ['linear'], ['zoom'], ...stops.map((v, i) => (i % 2 ? v * G : v))];

function label(id: string, sourceLayer: string, minzoom: number, filter: unknown, layout: Record<string, unknown>, opts: { maxzoom?: number; paint?: Record<string, unknown> } = {}): Layer {
  return {
    id,
    type: 'symbol',
    source: 'streets',
    'source-layer': sourceLayer,
    minzoom,
    ...(opts.maxzoom ? { maxzoom: opts.maxzoom } : {}),
    filter,
    layout: { 'text-font': LABEL_FONT, 'text-field': NAME, 'text-max-width': 8, 'text-line-height': 1.05, ...layout },
    paint: {
      'text-color': LABEL_INK,
      'text-halo-color': LABEL_HALO,
      'text-halo-width': 1.6,
      'text-emissive-strength': UNLIT,
      'icon-emissive-strength': UNLIT,
      ...opts.paint,
    },
  };
}

// Streets: the name of every road the map draws, from the zoom it starts drawing that kind of road (a bit after,
// for the big ones, so a road is on screen before its name), written along it.
const ROAD_NAME_FROM: Record<keyof typeof ROAD_CLASSES, number> = { motorway: 10, primary: 11, secondary: 13, street: 15 };

function roadNameLayers(): Layer[] {
  return (Object.keys(ROAD_CLASSES) as (keyof typeof ROAD_CLASSES)[]).map((group) =>
    label(
      `label-road-${group}`,
      'road',
      ROAD_NAME_FROM[group],
      [
        'all',
        ['==', ['geometry-type'], 'LineString'],
        ['match', ['get', 'class'], ROAD_CLASSES[group], true, false],
        ['has', 'name'],
      ],
      {
        'symbol-placement': 'line',
        // along the street, but facing you: in 3D a name stands up instead of lying flat on the tilted ground
        'text-pitch-alignment': 'viewport',
        'text-size': zoomSize(ROAD_NAME_FROM[group], 11, 16, 13, 19, 16),
        'text-max-angle': 30,
        'symbol-spacing': 320,
        'text-padding': 4,
      },
    ),
  );
}

// Places on the map (shops, cafés, restaurants, schools…) with a doodle for their kind: from zoom 12, only the
// best known, then more of them the closer you come (Mapbox ranks them 1–5 by how much they matter on a map).
// Parks only get their name (their trees and flowers are already drawn); landmarks with their own doodle are left
// to it.
function placeLayers(): Layer[] {
  const shown = ['<=', ['get', 'filterrank'], ['step', ['zoom'], 1, 14, 2, 16, 3, 17, 4, 18, 5]];
  const notLandmark = ['!', ['in', NAME, ['literal', LANDMARK_NAMES]]];
  const parks = ['==', ['get', 'class'], 'park_like'];
  return [
    label('label-parks', 'poi_label', 13, ['all', parks, ['has', 'name'], shown, notLandmark], {
      'text-size': zoomSize(13, 12, 17, 15),
      'text-padding': 6,
    }),
    label(
      'label-places',
      'poi_label',
      12,
      ['all', ['!', parks], ['has', 'name'], ['!', ['in', ['get', 'maki'], ['literal', SKIPPED_MAKI]]], shown, notLandmark],
      {
        'icon-image': STORE_ICON_EXPRESSION,
        // big from the start (zoom 12), a touch bigger up close
        'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.62, 16, 0.72, 19, 0.85],
        'icon-padding': 4,
        'text-size': zoomSize(12, 13, 16, 14, 19, 15),
        // the name beside its doodle, on whichever side has room
        'text-variable-anchor': ['top', 'bottom', 'right', 'left'],
        'text-radial-offset': 1.25,
        'text-justify': 'auto',
        'text-max-width': 7,
        'text-padding': 3,
        // a place keeps its doodle when its name doesn't fit
        'text-optional': true,
        // the most important places win where they'd overlap
        'symbol-sort-key': ['get', 'filterrank'],
      },
    ),
  ];
}

// Water, mountains, neighbourhoods, cities, states and countries.
function areaNameLayers(): Layer[] {
  const water = ['match', ['get', 'class'], ['ocean', 'sea', 'bay', 'water', 'reservoir'], true, false];
  const rivers = ['match', ['get', 'class'], ['river', 'canal', 'stream'], true, false];
  const summits = ['all', ['==', ['get', 'class'], 'landform'], ['match', ['get', 'maki'], ['mountain', 'volcano'], true, false]];
  // (cities with a skyline doodle have their name under it)
  const notLandmark = ['!', ['in', NAME, ['literal', LANDMARK_NAMES]]];
  const settlementRank = ['<=', ['get', 'symbolrank'], ['step', ['zoom'], 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 16, 18]];
  return [
    label('label-rivers', 'natural_label', 12, ['all', rivers, ['==', ['geometry-type'], 'LineString']], {
      'symbol-placement': 'line',
      'text-pitch-alignment': 'viewport',
      'text-size': zoomSize(12, 12, 17, 15),
      'text-letter-spacing': 0.1,
      'symbol-spacing': 400,
    }),
    label('label-water', 'natural_label', 3, ['all', water, ['==', ['geometry-type'], 'Point']], {
      'text-size': ['interpolate', ['linear'], ['zoom'], 3, ['match', ['get', 'class'], 'ocean', 17 * G, 13 * G], 12, ['match', ['get', 'class'], ['ocean', 'sea'], 20 * G, 15 * G]],
      'text-letter-spacing': 0.12,
      'text-max-width': 9,
    }),
    label('label-water-lines', 'natural_label', 3, ['all', water, ['==', ['geometry-type'], 'LineString']], {
      'symbol-placement': 'line-center',
      'text-size': zoomSize(3, 13, 12, 17),
      'text-letter-spacing': 0.12,
    }),
    // under the little mountain doodle on each summit
    label('label-summits', 'natural_label', 10, ['all', summits, ['==', ['geometry-type'], 'Point']], {
      'text-size': zoomSize(10, 11, 16, 14),
      'text-anchor': 'top',
      'text-offset': [0, 0.9],
      'text-optional': true,
    }),
    label('label-neighbourhoods', 'place_label', 12, ['all', ['==', ['get', 'class'], 'settlement_subdivision'], settlementRank], {
      'text-size': zoomSize(12, 12, 16, 15),
      'text-letter-spacing': 0.08,
      'text-max-width': 7,
      'text-padding': 8,
    }, { maxzoom: 17 }),
    label('label-cities', 'place_label', 3, ['all', ['==', ['get', 'class'], 'settlement'], settlementRank, notLandmark], {
      'text-size': [
        'interpolate',
        ['linear'],
        ['zoom'],
        4,
        ['match', ['get', 'type'], 'city', 14 * G, 11 * G],
        10,
        ['match', ['get', 'type'], 'city', 20 * G, 'town', 16 * G, 14 * G],
        14,
        ['match', ['get', 'type'], 'city', 24 * G, 'town', 18 * G, 15 * G],
      ],
      'text-max-width': 8,
      'text-padding': 6,
    }, { maxzoom: 15 }),
    label('label-states', 'place_label', 4, ['==', ['get', 'class'], 'state'], {
      'text-size': zoomSize(4, 12, 8, 15),
      'text-letter-spacing': 0.15,
      'text-transform': 'uppercase',
    }, { maxzoom: 8 }),
    label('label-countries', 'place_label', 1, ['==', ['get', 'class'], 'country'], {
      'text-size': zoomSize(1, 12, 3, 16, 6, 20),
      'text-max-width': 7,
    }, { maxzoom: 7 }),
  ];
}

// ---- The doodle layers ----

/** Vector tile sources the doodles read from. */
export const DOODLE_SOURCES = {
  streets: 'mapbox://mapbox.mapbox-streets-v8',
  terrain: 'mapbox://mapbox.mapbox-terrain-v2',
} as const;

/**
 * Drawn over the flattened basemap, in this order: the water, its waves, roads, nature, then the names (the last
 * ones are placed first where names would overlap: countries and cities, then neighbourhoods, places and streets).
 */
export const DOODLE_LAYERS: Layer[] = [
  waterLayer(),
  wavesLayer(),
  ...areaLayers(),
  roadLayer(),
  ...natureLayers(),
  ...roadNameLayers(),
  ...placeLayers(),
  ...areaNameLayers(),
];
