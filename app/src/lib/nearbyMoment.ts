// The demo's "Moment nearby", for the notification to point you to: someone else's moment on a street 40–50 m from
// you. Each time notifications are switched on, the last one is taken away and a new one is put down near where
// you are now. On 19th Ave (the demo's street) it's the sunset-street moment; anywhere else, a random sample one.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Asset } from 'expo-asset';
import * as Location from 'expo-location';

import { makeKit } from '@/data/doodleKit';
import { SEED_PHOTOS } from '@/data/seedPhotos';
import { SEED_SCENES } from '@/data/seedScenes';
import { distanceM, type LngLat } from '@/lib/location';
import { getPost, loadPosts, removePost, savePost } from '@/lib/posts';

// how far it is from you: about AWAY m, anywhere from NEAR_MIN to NEAR_MAX (inside the 50 m around you where it's
// the only pin shown: see CLEAR_AROUND_M on the map)
const AWAY = 45;
const NEAR_MIN = 40;
const NEAR_MAX = 50;
const PHOTO = 19; // p20: the street at sunset with the little convertible
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const ON_19TH = /\b19(th)?\b.*\bav/i;
const ID_KEY = 'nearby-moment:id';

// the current one's id, kept in memory too so the map can tell it apart right away
let currentId: string | null = null;
const ready = AsyncStorage.getItem(ID_KEY)
  .then((id) => {
    currentId = id;
  })
  .catch(() => {});

/** The id of the moment put down by the last switch-on (null before the first). */
export function nearbyMomentId() {
  return currentId;
}

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
 * Where the moment goes: a random spot on a street 40–50 m from you, on 19th Ave if that's one of them (the street
 * the demo was made on). With no street there, a random spot 45 m away.
 */
async function spotNear(me: LngLat): Promise<{ at: LngLat; on19th: boolean }> {
  const close = (await roadSpots(me, AWAY, 8)).filter((h) => h.fromMe >= NEAR_MIN && h.fromMe <= NEAR_MAX);
  const on19th = close.filter((h) => ON_19TH.test(h.name));
  if (on19th.length) return { at: on19th[Math.floor(Math.random() * on19th.length)].at, on19th: true };
  if (close.length) return { at: close[Math.floor(Math.random() * close.length)].at, on19th: false };
  const a = Math.random() * Math.PI * 2;
  const mPerDegLng = 111_320 * Math.cos((me[1] * Math.PI) / 180);
  return { at: [me[0] + (Math.sin(a) * AWAY) / mPerDegLng, me[1] + (Math.cos(a) * AWAY) / 111_320], on19th: false };
}

let running: Promise<void> | null = null;

async function spawn() {
  await ready;
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const me: LngLat = [pos.coords.longitude, pos.coords.latitude];
  const { at, on19th } = await spotNear(me);
  // the 19th Ave demo is always the sunset street; anywhere else, any of the sample moments
  const photo = on19th ? PHOTO : Math.floor(Math.random() * SEED_PHOTOS.length);
  const captions = SEED_SCENES[photo].captions;
  const kit = makeKit(Math.random, `nearby-${Date.now().toString(36)}`);
  SEED_SCENES[photo].draw(kit);
  const asset = Asset.fromModule(SEED_PHOTOS[photo]);
  await asset.downloadAsync();
  // the last one goes as the new one arrives
  const previous = currentId;
  const post = await savePost({
    sourceUri: asset.localUri ?? asset.uri,
    strokes: kit.strokes,
    text: on19th ? captions[1] : captions[Math.floor(Math.random() * captions.length)],
    lng: at[0],
    lat: at[1],
    byOthers: true,
  });
  currentId = post.id;
  await AsyncStorage.setItem(ID_KEY, post.id);
  if (previous) await removePost(previous);
}

/** A new nearby moment, replacing the last one (when notifications are switched on). */
export function spawnNearbyMoment() {
  running ??= spawn()
    .catch(() => {
      // no location (or no connection): the next switch-on tries again
    })
    .finally(() => {
      running = null;
    });
  return running;
}

/** Puts one down if there isn't one yet (when whim opens with notifications already on). */
export async function ensureNearbyMoment() {
  await ready;
  await loadPosts();
  if (currentId && getPost(currentId)) return;
  return spawnNearbyMoment();
}
