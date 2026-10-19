// The demo's "Moment nearby": like the test post on the phone app, a moment by someone else on 19th Ave about
// 50 m from you (the sunset-street photo, with its doodles and story), for the notification to point you to.
// It's made once per browser, as soon as whim knows where you are. Away from any 19th Ave, it goes on the nearest
// road about 50 m out instead.
import * as Location from 'expo-location';
import { Asset } from 'expo-asset';

import { makeKit } from '@/data/doodleKit';
import { SEED_PHOTOS } from '@/data/seedPhotos';
import { SEED_SCENES } from '@/data/seedScenes';
import { distanceM, type LngLat } from '@/lib/location';
import { loadPosts, savePost } from '@/lib/posts';

const DONE = 'demo:nearby-moment';
const PHOTO = 19; // p20: the street at sunset with the little convertible
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const ON_19TH = /\b19(th)?\b.*\bav/i;
const AWAY = 50;

type Hit = { name: string; at: LngLat };

async function roadsNear([lng, lat]: LngLat, radius: number): Promise<Hit[]> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=${radius}&limit=50&layers=road&access_token=${TOKEN}`;
  const json = await (await fetch(url)).json();
  return (json.features ?? []).map((f: { properties?: { name?: string }; geometry: { coordinates: LngLat } }) => ({
    name: f.properties?.name ?? '',
    at: f.geometry.coordinates,
  }));
}

/** A spot on a road (19th Ave if there is one) as close to AWAY m from you as it gets, never further. */
async function spotNear(me: LngLat): Promise<LngLat> {
  const mPerDegLng = 111_320 * Math.cos((me[1] * Math.PI) / 180);
  const ring = Array.from({ length: 24 }, (_, i): LngLat => {
    const a = (i / 24) * Math.PI * 2;
    return [me[0] + (Math.sin(a) * AWAY) / mPerDegLng, me[1] + (Math.cos(a) * AWAY) / 111_320];
  });
  const hits = (await Promise.all(ring.map((p) => roadsNear(p, 15).catch(() => [] as Hit[]))))
    .flat()
    .map((h) => ({ ...h, fromMe: distanceM(me, h.at) }))
    .filter((h) => h.fromMe >= 20 && h.fromMe <= AWAY);
  const pool = hits.some((h) => ON_19TH.test(h.name)) ? hits.filter((h) => ON_19TH.test(h.name)) : hits;
  if (!pool.length) return ring[0];
  return pool.reduce((a, b) => (Math.abs(a.fromMe - AWAY) <= Math.abs(b.fromMe - AWAY) ? a : b)).at;
}

let running = false;
export async function ensureNearbyMoment() {
  try {
    if (running || localStorage.getItem(DONE)) return;
    running = true;
    const pos = await Location.getCurrentPositionAsync();
    const me: LngLat = [pos.coords.longitude, pos.coords.latitude];
    if ((await loadPosts()).some((p) => p.byOthers)) return void localStorage.setItem(DONE, '1');
    const spot = await spotNear(me);
    const kit = makeKit(Math.random, `nearby-${Date.now().toString(36)}`);
    SEED_SCENES[PHOTO].draw(kit);
    await savePost({
      sourceUri: Asset.fromModule(SEED_PHOTOS[PHOTO]).uri,
      strokes: kit.strokes,
      text: SEED_SCENES[PHOTO].captions[1],
      lng: spot[0],
      lat: spot[1],
      byOthers: true,
    });
    localStorage.setItem(DONE, '1');
  } catch {
    // no location yet: tried again next time whim opens
  } finally {
    running = false;
  }
}
