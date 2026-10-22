// Sample posts for testing the replay and clustering. Generated from a fixed seed, so they're the same on
// every launch, and never saved: they live only in memory, separate from the posts you create.
import type { Post } from '@/lib/posts';
import type { Stroke } from '@/lib/strokes';

import { makeKit } from './doodleKit';
import { SEED_PHOTOS } from './seedPhotos';
import { EMPIRE_SCENE, SEED_SCENES, type Scene } from './seedScenes';

// mulberry32: small deterministic PRNG
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20261017);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
const gauss = () => Math.sqrt(-2 * Math.log(rand() || 1e-9)) * Math.cos(2 * Math.PI * rand());

// [lat, lng, posts, spread in degrees]
const AREAS: [number, number, number, number][] = [
  // Metro Vancouver, heavily
  [49.2827, -123.1207, 38, 0.012], // downtown
  [49.2634, -123.1385, 14, 0.02], // Fairview / Kits
  [49.2606, -123.246, 8, 0.012], // UBC
  [49.3165, -123.0688, 10, 0.02], // North Van
  [49.2488, -122.9805, 10, 0.025], // Burnaby
  [49.1666, -123.1336, 10, 0.025], // Richmond
  [49.1913, -122.849, 8, 0.03], // Surrey
  [49.2838, -122.7932, 6, 0.02], // Coquitlam
  [49.2057, -122.911, 5, 0.012], // New West
  // big cities
  [47.6062, -122.3321, 8, 0.03], // Seattle
  [37.7749, -122.4194, 9, 0.03], // San Francisco
  [34.0522, -118.2437, 9, 0.05], // Los Angeles
  [40.7128, -74.006, 11, 0.03], // New York
  [43.6532, -79.3832, 8, 0.03], // Toronto
  [45.5019, -73.5674, 5, 0.025], // Montreal
  [19.4326, -99.1332, 6, 0.04], // Mexico City
  [-23.5505, -46.6333, 6, 0.04], // São Paulo
  [51.5074, -0.1278, 10, 0.03], // London
  [48.8566, 2.3522, 9, 0.025], // Paris
  [52.52, 13.405, 6, 0.03], // Berlin
  [41.3874, 2.1686, 5, 0.02], // Barcelona
  [35.6762, 139.6503, 10, 0.04], // Tokyo
  [37.5665, 126.978, 8, 0.03], // Seoul
  [21.0285, 105.8542, 7, 0.025], // Hanoi
  [10.8231, 106.6297, 7, 0.03], // Ho Chi Minh City
  [13.7563, 100.5018, 5, 0.03], // Bangkok
  [1.3521, 103.8198, 5, 0.03], // Singapore
  [-33.8688, 151.2093, 7, 0.03], // Sydney
];

// one post each, scattered elsewhere
const SCATTERED: [number, number][] = [
  [61.2181, -149.9003],
  [64.1466, -21.9426],
  [60.1699, 24.9384],
  [55.7558, 37.6173],
  [41.0082, 28.9784],
  [30.0444, 31.2357],
  [-1.2921, 36.8219],
  [6.5244, 3.3792],
  [-33.9249, 18.4241],
  [25.2048, 55.2708],
  [28.6139, 77.209],
  [19.076, 72.8777],
  [27.7172, 85.324],
  [39.9042, 116.4074],
  [22.3193, 114.1694],
  [14.5995, 120.9842],
  [-6.2088, 106.8456],
  [-36.8485, 174.7633],
  [-41.2865, 174.7762],
  [-37.8136, 144.9631],
  [-31.9505, 115.8605],
  [-34.6037, -58.3816],
  [-12.0464, -77.0428],
  [4.711, -74.0721],
  [-22.9068, -43.1729],
  [23.1136, -82.3666],
  [29.7604, -95.3698],
  [39.7392, -104.9903],
  [51.0447, -114.0719],
  [53.5461, -113.4938],
  [48.4284, -123.3656],
  [49.8951, -97.1384],
  [46.8139, -71.208],
  [38.7223, -9.1393],
  [59.3293, 18.0686],
  [50.0755, 14.4378],
  [64.8378, -147.7164],
  [-17.7134, 178.065],
  [21.3069, -157.8583],
  [-54.8019, -68.303],
];

// The drawing canvas reaches DOODLE_MARGIN (48pt) past the 272×363pt photo on every side, i.e. this far in
// photo-relative units.
const MX = 48 / 272;
const MY = 48 / 363;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The photo's scene (data/seedScenes.ts), drawn with this post's own slight hand wobble. */
function sceneStrokes(postId: string, photo: number | Scene): Stroke[] {
  const kit = makeKit(rand, postId);
  (typeof photo === 'number' ? SEED_SCENES[photo] : photo).draw(kit);
  // every point stays inside the drawing canvas
  return kit.strokes.map((st) => ({
    ...st,
    points: st.points.map((q) => ({ x: clamp(q.x, -MX + 0.005, 1 + MX - 0.005), y: clamp(q.y, -MY + 0.005, 1 + MY - 0.005) })),
  }));
}

function makePost(i: number, lat: number, lng: number): Post {
  const id = `seed-${i}`;
  const photo = Math.floor(rand() * SEED_PHOTOS.length);
  return {
    id,
    photo: '',
    asset: SEED_PHOTOS[photo],
    strokes: sceneStrokes(id, photo),
    text: pick(SEED_SCENES[photo].captions),
    lat,
    lng,
    createdAt: 0,
  };
}

function generate(): Post[] {
  const posts: Post[] = [];
  for (const [lat, lng, count, spread] of AREAS) {
    for (let k = 0; k < count; k++) {
      // longitude spread is widened so areas look round on the map, not squashed
      posts.push(makePost(posts.length, lat + gauss() * spread, lng + (gauss() * spread) / Math.cos((lat * Math.PI) / 180)));
    }
  }
  for (const [lat, lng] of SCATTERED) {
    posts.push(makePost(posts.length, lat + gauss() * 0.02, lng + gauss() * 0.02));
  }
  return posts;
}

// Moments with a photo and doodles of their own, in a set spot (made after the generated ones, so those keep theirs)
const PLACED: { id: string; lat: number; lng: number; photo: number; scene: Scene }[] = [
  // Manhattan: the Empire State at golden hour, from a street a block southwest of it
  { id: 'seed-nyc-empire', lat: 40.7467, lng: -73.988, photo: require('@/assets/seed-photos/nyc-empire.jpg'), scene: EMPIRE_SCENE },
];

export const SEED_POSTS: Post[] = [
  ...generate(),
  ...PLACED.map(({ id, lat, lng, photo, scene }) => ({
    id,
    photo: '',
    asset: photo,
    strokes: sceneStrokes(id, scene),
    text: scene.captions[0],
    lat,
    lng,
    createdAt: 0,
  })),
];
export const SEED_POSTS_BY_ID = new Map(SEED_POSTS.map((p) => [p.id, p]));
