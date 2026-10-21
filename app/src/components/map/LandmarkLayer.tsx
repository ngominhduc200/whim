import { Images, ShapeSource, SymbolLayer, type SymbolLayerStyle } from '@rnmapbox/maps';

import { LANDMARK_IMAGES, LANDMARKS } from '@/data/landmarks';
import { LABEL_FONT } from '@/lib/mapStyle';
import PALETTE from '@/lib/palette.json';

// Each place has its own zoom range, but `zoom` can't be compared per feature in a filter,
// so places are split into one layer per (minZoom, maxZoom) range.
const RANGES = [
  ...new Map(
    LANDMARKS.features.map((f) => {
      const { minZoom, maxZoom } = f.properties as { minZoom: number; maxZoom: number };
      return [`${minZoom}-${maxZoom}`, { minZoom, maxZoom }] as const;
    }),
  ).values(),
];

const style: SymbolLayerStyle = {
  iconImage: ['get', 'icon'],
  iconAnchor: 'bottom',
  // grows from 0.45x around the region view to 1.4x up close, same curve as the web map
  iconSize: ['interpolate', ['linear'], ['zoom'], 9, 0.45, 18.5, 1.4],
  iconRotate: ['match', ['get', 'icon'], 'plane', 50, 0],
  iconAllowOverlap: true,
  // other names and places keep clear of it
  iconIgnorePlacement: false,
  // exact doodle color, unaffected by the map's day lighting
  iconEmissiveStrength: 1,
  // the name under the doodle, in Gaegu
  textField: ['get', 'name'],
  textFont: LABEL_FONT,
  textSize: ['interpolate', ['linear'], ['zoom'], 11, 12 * 1.15, 18, 16 * 1.15],
  textAnchor: 'top',
  textOffset: [0, 0.3],
  textMaxWidth: 8,
  textLineHeight: 1.05,
  textColor: PALETTE.label,
  textHaloColor: PALETTE.land,
  textHaloWidth: 1.6,
  textEmissiveStrength: 1,
  // the doodle always shows; its name only where it has room
  textOptional: true,
};

export function LandmarkLayer() {
  return (
    <>
      <Images images={LANDMARK_IMAGES} />
      <ShapeSource id="landmarks" shape={LANDMARKS}>
        {RANGES.map(({ minZoom, maxZoom }) => (
          <SymbolLayer
            key={`${minZoom}-${maxZoom}`}
            id={`landmarks-${minZoom}-${maxZoom}`}
            minZoomLevel={minZoom}
            // (24 is the most a layer can have on the web; the map itself never goes past 22)
            maxZoomLevel={Math.min(maxZoom + 1, 24)}
            filter={['all', ['==', ['get', 'minZoom'], minZoom], ['==', ['get', 'maxZoom'], maxZoom]]}
            style={style}
          />
        ))}
      </ShapeSource>
    </>
  );
}
