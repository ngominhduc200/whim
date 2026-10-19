import { useMemo } from 'react';
import Supercluster from 'supercluster';

import type { Post } from './posts';

/**
 * Cluster radius in screen points. supercluster measures in 512px tiles, the same scale as Mapbox zoom levels,
 * so this is real on-screen distance.
 */
export const CLUSTER_RADIUS = 80;
/** Past this zoom everything is its own pin (only posts at the exact same spot could still be stacked). */
export const CLUSTER_MAX_ZOOM = 20;
/** On-screen box of a pin or stack, anchored at its bottom-center (photo card + border + pointer, plus a gap). */
export const PIN_BOX = { width: 66, height: 92 };

export type MapItem =
  | { kind: 'post'; key: string; post: Post; ids: string[]; coordinate: [number, number] }
  | {
      kind: 'cluster';
      key: string;
      /** Every post in the stack (the first two are its preview). */
      ids: string[];
      coordinate: [number, number];
      count: number;
      front: Post;
      back: Post;
      /** Flying here separates the stack into pins (or smaller stacks). */
      zoomTo: number;
    };

type Props = { ids: string[] };
export type Bounds = { ne: number[]; sw: number[] };

// Web Mercator in screen points at zoom z (512pt world at zoom 0, like Mapbox)
const project = (lng: number, lat: number, z: number) => {
  const size = 512 * 2 ** z;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size };
};
const unproject = (x: number, y: number, z: number): [number, number] => {
  const size = 512 * 2 ** z;
  const lng = (x / size) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / size))) * 180) / Math.PI;
  return [lng, lat];
};

type Node = { x: number; y: number; count: number; ids: string[]; zoomTo: number };

export function buildClusters(posts: Post[]) {
  const byId = new Map(posts.map((p) => [p.id, p]));
  const index = new Supercluster<Props, Props>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
    // every cluster knows all its posts: the first two are its stacked preview, and the rest let the map tell
    // which stack a pin split out of
    map: (props) => ({ ids: props.ids.slice() }),
    reduce: (acc, props) => {
      acc.ids = acc.ids.concat(props.ids);
    },
  });
  index.load(
    posts.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { ids: [p.id] } })),
  );

  /**
   * Pins and stacks inside the bounds (padded so items just off screen are ready while panning).
   * Everything is computed at the whole zoom level below the current one: between whole levels the map only
   * scales up, so pins only move apart. Nothing can start overlapping or flicker mid-zoom.
   */
  const query = (bounds: Bounds, zoom: number): MapItem[] => {
    const z = Math.max(0, Math.min(CLUSTER_MAX_ZOOM + 1, Math.floor(zoom)));
    let bbox: [number, number, number, number];
    if (zoom < 3) {
      bbox = [-180, -85, 180, 85]; // on the globe the "visible bounds" aren't a useful box
    } else {
      const [east, north] = bounds.ne;
      const [west, south] = bounds.sw;
      const padX = Math.abs(east - west) * 0.25;
      const padY = Math.abs(north - south) * 0.25;
      bbox = [west - padX, Math.max(-85, south - padY), east + padX, Math.min(85, north + padY)];
    }

    const nodes: Node[] = index.getClusters(bbox, z).map((f) => {
      const props = f.properties as Props & { cluster?: boolean; cluster_id?: number; point_count?: number };
      const [lng, lat] = f.geometry.coordinates;
      const { x, y } = project(lng, lat, z);
      const count = props.cluster ? props.point_count! : 1;
      const zoomTo = props.cluster ? index.getClusterExpansionZoom(props.cluster_id!) : z;
      return { x, y, count, ids: props.ids, zoomTo };
    });

    // supercluster is greedy and moves cluster centers, so neighbours can still end up overlapping on screen.
    // Merge any two boxes that overlap until none do.
    const overlaps = (a: Node, b: Node) => Math.abs(a.x - b.x) < PIN_BOX.width && Math.abs(a.y - b.y) < PIN_BOX.height;
    for (let merged = true; merged;) {
      merged = false;
      for (let i = 0; i < nodes.length && !merged; i++) {
        for (let j = i + 1; j < nodes.length && !merged; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (!overlaps(a, b)) continue;
          // zoom at which these two sit far enough apart: on-screen distances double with every zoom level
          const spread = Math.max(Math.abs(a.x - b.x) / PIN_BOX.width, Math.abs(a.y - b.y) / PIN_BOX.height);
          const apart = spread > 0 ? z + Math.ceil(Math.log2(1 / spread) + 1e-9) : CLUSTER_MAX_ZOOM + 1;
          const count = a.count + b.count;
          nodes[i] = {
            x: (a.x * a.count + b.x * b.count) / count,
            y: (a.y * a.count + b.y * b.count) / count,
            count,
            ids: a.ids.concat(b.ids),
            zoomTo: Math.min(CLUSTER_MAX_ZOOM + 1, Math.max(a.zoomTo, b.zoomTo, apart)),
          };
          nodes.splice(j, 1);
          merged = true;
        }
      }
    }

    return nodes.flatMap((n): MapItem[] => {
      if (n.count === 1) {
        const post = byId.get(n.ids[0]);
        return post ? [{ kind: 'post', key: post.id, post, ids: n.ids, coordinate: [post.lng, post.lat] }] : [];
      }
      const [front, back] = n.ids.map((id) => byId.get(id));
      if (!front || !back) return [];
      return [
        {
          kind: 'cluster',
          key: `c-${n.ids.slice(0, 2).join('-')}-${n.count}`,
          ids: n.ids,
          coordinate: unproject(n.x, n.y, z),
          count: n.count,
          front,
          back,
          zoomTo: n.zoomTo,
        },
      ];
    });
  };

  /**
   * Lowest zoom (from its estimate up) at which a stack's posts no longer all sit in one pin, checked the way the
   * map will show it there: a screen-sized view centered on the stack (`screen` in points). Asking whether all its
   * posts are still together (not whether a stack with the same key exists) and over the whole view (neighbours
   * just off a small patch can merge back in) means one tap is always enough to see it split.
   */
  const splitZoom = (cluster: Extract<MapItem, { kind: 'cluster' }>, screen: { width: number; height: number }) => {
    const [lng, lat] = cluster.coordinate;
    for (let z = Math.ceil(cluster.zoomTo); z <= CLUSTER_MAX_ZOOM; z++) {
      // half the screen in degrees at this zoom (Web Mercator, 512pt tiles); latitude shrinks with cos(lat)
      const lngPerPt = 360 / (512 * 2 ** z);
      const latPerPt = lngPerPt * Math.cos((lat * Math.PI) / 180);
      const halfW = (screen.width / 2) * lngPerPt;
      const halfH = (screen.height / 2) * latPerPt;
      const view = query({ ne: [lng + halfW, lat + halfH], sw: [lng - halfW, lat - halfH] }, z + 0.5);
      const together = view.some((it) => cluster.ids.every((id) => it.ids.includes(id)));
      if (!together) return z;
    }
    return CLUSTER_MAX_ZOOM + 1;
  };

  /**
   * Lowest zoom, from `from` up, at which this post shows as its own pin (not inside a stack), checked the way
   * the map will show it: a screen-sized view centered on it. Posts at the very same spot never separate; then
   * it's the deepest zoom.
   */
  const soloZoom = (postId: string, screen: { width: number; height: number }, from: number) => {
    const post = byId.get(postId);
    if (!post) return from;
    for (let z = from; z <= CLUSTER_MAX_ZOOM; z++) {
      const lngPerPt = 360 / (512 * 2 ** z);
      const latPerPt = lngPerPt * Math.cos((post.lat * Math.PI) / 180);
      const halfW = (screen.width / 2) * lngPerPt;
      const halfH = (screen.height / 2) * latPerPt;
      const view = query({ ne: [post.lng + halfW, post.lat + halfH], sw: [post.lng - halfW, post.lat - halfH] }, z + 0.5);
      if (view.some((it) => it.kind === 'post' && it.key === postId)) return z;
    }
    return CLUSTER_MAX_ZOOM;
  };

  return { query, splitZoom, soloZoom };
}

/**
 * Where `from` appears on screen relative to `to`, in points, at this zoom and map rotation (pitch is ignored,
 * which is close enough for a short animation).
 */
export function screenOffset(from: [number, number], to: [number, number], zoom: number, heading: number) {
  const a = project(from[0], from[1], zoom);
  const b = project(to[0], to[1], zoom);
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const r = (heading * Math.PI) / 180;
  return { x: dx * Math.cos(r) + dy * Math.sin(r), y: -dx * Math.sin(r) + dy * Math.cos(r) };
}

export function useClusters(posts: Post[]) {
  return useMemo(() => buildClusters(posts), [posts]);
}
