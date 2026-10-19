// The demo's "Moment nearby", for the notification to point you to: a moment by someone else, made once per
// browser as soon as whim knows where you are. Near the street the demo was made on, it's the same sunset-street
// moment on 19th Ave as on the phone; for everyone else, a random sample moment on a street within 20 m of them.
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

type Hit = { name: string; at: LngLat };

async function roadsNear([lng, lat]: LngLat, radius: number): Promise<Hit[]> {
  const url = `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/tilequery/${lng},${lat}.json?radius=${radius}&limit=50&layers=road&access_token=${TOKEN}`;
  const json = await (await fetch(url)).json();
  return (json.features ?? []).map((f: { properties?: { name?: string }; geometry: { coordinates: LngLat } }) => ({
    name: f.properties?.name ?? '',
    at: f.geometry.coordinates,
  }));
}

/** Points on roads in a ring `radius` m around you, with how far each is from you. */
async function roadSpots(me: LngLat, radius: number, search: number) {
  const mPerDegLng = 111_320 * Math.cos((me[1] * Math.PI) / 180);
  const ring = Array.from({ length: 16 }, (_, i): LngLat => {
    const a = (i / 16) * Math.PI * 2;
    return [me[0] + (Math.sin(a) * radius) / mPerDegLng, me[1] + (Math.cos(a) * radius) / 111_320];
  });
  return (await Promise.all(ring.map((p) => roadsNear(p, search).catch(() => [] as Hit[]))))
    .flat()
    .map((h) => ({ ...h, fromMe: distanceM(me, h.at) }));
}

/**
 * Where the moment goes: on 19th Ave about 50 m away if there is one (the street the demo was made on), otherwise
 * a random spot on a street near you, 8–20 m away (a real "nearby" moment is within 20 m; 8 keeps it clear of
 * your location cloud). With no street that close, a random spot 8–20 m away.
 */
async function spotNear(me: LngLat): Promise<{ at: LngLat; on19th: boolean }> {
  const far = (await roadSpots(me, 50, 15)).filter((h) => ON_19TH.test(h.name) && h.fromMe >= 20 && h.fromMe <= 50);
  if (far.length) return { at: far.reduce((a, b) => (Math.abs(a.fromMe - 50) <= Math.abs(b.fromMe - 50) ? a : b)).at, on19th: true };
  const close = (await roadSpots(me, 14, 8)).filter((h) => h.fromMe >= 8 && h.fromMe <= 20);
  if (close.length) return { at: close[Math.floor(Math.random() * close.length)].at, on19th: false };
  const d = 8 + Math.random() * 12;
  const a = Math.random() * Math.PI * 2;
  const mPerDegLng = 111_320 * Math.cos((me[1] * Math.PI) / 180);
  return { at: [me[0] + (Math.sin(a) * d) / mPerDegLng, me[1] + (Math.cos(a) * d) / 111_320], on19th: false };
}

let running = false;
export async function ensureNearbyMoment() {
  try {
    if (running || localStorage.getItem(DONE)) return;
    running = true;
    const pos = await Location.getCurrentPositionAsync();
    const me: LngLat = [pos.coords.longitude, pos.coords.latitude];
    if ((await loadPosts()).some((p) => p.byOthers)) return void localStorage.setItem(DONE, '1');
    const { at, on19th } = await spotNear(me);
    // the 19th Ave demo is always the sunset street; anywhere else, any of the sample moments
    const photo = on19th ? PHOTO : Math.floor(Math.random() * SEED_PHOTOS.length);
    const captions = SEED_SCENES[photo].captions;
    const kit = makeKit(Math.random, `nearby-${Date.now().toString(36)}`);
    SEED_SCENES[photo].draw(kit);
    await savePost({
      sourceUri: Asset.fromModule(SEED_PHOTOS[photo]).uri,
      strokes: kit.strokes,
      text: on19th ? captions[1] : captions[Math.floor(Math.random() * captions.length)],
      lng: at[0],
      lat: at[1],
      byOthers: true,
    });
    localStorage.setItem(DONE, '1');
  } catch {
    // no location yet: tried again next time whim opens
  } finally {
    running = false;
  }
}
