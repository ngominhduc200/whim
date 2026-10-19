import { FillLayer, LineLayer, SymbolLayer, VectorSource } from '@rnmapbox/maps';

import { DOODLE_LAYERS, DOODLE_SOURCES, type Layer } from '@/lib/mapStyle';

// The map's doodles (lib/mapStyle.ts) are written as plain Mapbox style layers; the map components take the
// same properties in camelCase, so they're converted here once.
const camel = (key: string) => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const toStyle = (layer: Layer) =>
  Object.fromEntries(Object.entries({ ...layer.layout, ...layer.paint }).map(([k, v]) => [camel(k), v]));

/** The hand-drawn doodles drawn over the flattened basemap: waves, roads, trees, flowers, mountains. */
export function CanvasLayers() {
  return (
    <>
      {(Object.keys(DOODLE_SOURCES) as (keyof typeof DOODLE_SOURCES)[]).map((source) => (
        <VectorSource key={source} id={`doodle-${source}`} url={DOODLE_SOURCES[source]}>
          {DOODLE_LAYERS.filter((l) => l.source === source).map((layer) => {
            const props = {
              id: layer.id,
              sourceLayerID: layer['source-layer'],
              filter: layer.filter as never,
              minZoomLevel: layer.minzoom,
              maxZoomLevel: layer.maxzoom,
              style: toStyle(layer) as never,
            };
            if (layer.type === 'line') return <LineLayer key={layer.id} {...props} />;
            if (layer.type === 'fill') return <FillLayer key={layer.id} {...props} />;
            return <SymbolLayer key={layer.id} {...props} />;
          })}
        </VectorSource>
      ))}
    </>
  );
}
