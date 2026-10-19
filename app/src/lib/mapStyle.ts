import type { StandardStyleConfig } from '@rnmapbox/maps';

import { CANVAS_THEME_LUT } from './canvasTheme';
import PALETTE from './palette.json';

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
  const wood = ['match', ['get', 'class'], ['wood', 'scrub'], true, false];
  const parks = ['match', ['get', 'class'], ['park', 'grass', 'cemetery'], true, false];
  const summits = ['all', ['==', ['get', 'class'], 'landform'], ['match', ['get', 'maki'], ['mountain', 'volcano'], true, false], ['==', ['geometry-type'], 'Point']];
  return [
    doodle('doodle-forest-far', 'terrain', 'landcover', ['==', ['get', 'class'], 'wood'], 'pine', 7, { maxzoom: 10 }),
    doodle('doodle-forest-far-2', 'terrain', 'landcover', ['==', ['get', 'class'], 'wood'], 'tree', 7, { maxzoom: 10, offset: [70, 45] }),
    doodle('doodle-forest', 'streets', 'landuse', wood, 'pine', 10),
    doodle('doodle-forest-2', 'streets', 'landuse', wood, 'tree', 10, { offset: [55, -40] }),
    doodle('doodle-national-park', 'streets', 'landuse_overlay', ['==', ['get', 'class'], 'national_park'], 'pine', 8, { offset: [-60, 30] }),
    doodle('doodle-park', 'streets', 'landuse', parks, FLOWER_ICON, 12),
    doodle('doodle-park-2', 'streets', 'landuse', parks, 'tree', 12, { offset: [-45, 25] }),
    doodle('doodle-peaks', 'streets', 'natural_label', summits, 'mountain', 7, {
      size: ['interpolate', ['linear'], ['zoom'], 7, 0.3, 12, 0.5, 16, 0.75],
    }),
  ];
}

// ---- The doodle layers ----

/** Vector tile sources the doodles read from. */
export const DOODLE_SOURCES = {
  streets: 'mapbox://mapbox.mapbox-streets-v8',
  terrain: 'mapbox://mapbox.mapbox-terrain-v2',
} as const;

/** Drawn over the flattened basemap, in this order: the water, its waves, roads, then nature. */
export const DOODLE_LAYERS: Layer[] = [waterLayer(), wavesLayer(), roadLayer(), ...natureLayers()];
