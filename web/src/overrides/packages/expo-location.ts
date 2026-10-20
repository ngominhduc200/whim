// expo-location on the web, with two differences:
//  - checking for location permission asks the browser for it if it hasn't been decided yet (the app only shows
//    your location cloud once permission is granted, and a browser starts with nothing granted);
//  - watching your position uses the browser's own watcher, which also reports where you are right away (expo's
//    web watcher doesn't send updates in Safari).
import * as Location from 'expo-location';

import { rememberGranted, wasGranted } from '@/web/permissions';

export * from 'expo-location';

// Permission is worked out by simply asking for a position (that's what makes the browser prompt): Safari's
// permission query keeps saying "prompt" even once allowed, and can wait forever, so it isn't used.
type Permission = Location.LocationPermissionResponse;
const perm = (granted: boolean, canAskAgain: boolean): Permission =>
  ({ status: granted ? 'granted' : canAskAgain ? 'undetermined' : 'denied', granted, canAskAgain, expires: 'never' }) as Permission;
let decided: Permission | null = null;
let asking: Promise<Permission> | null = null;

export function requestForegroundPermissionsAsync(): Promise<Permission> {
  if (decided) return Promise.resolve(decided);
  asking ??= new Promise<Permission>((resolve) => {
    if (!navigator.geolocation) return resolve(perm(false, false));
    navigator.geolocation.getCurrentPosition(
      (p) => {
        remember(p);
        keepTracking();
        rememberGranted('location');
        resolve((decided = perm(true, true)));
        // the demo's nearby moment, placed once whim knows where you are
        import('@/web/nearbyMoment').then((m) => m.ensureNearbyMoment());
      },
      (e) => {
        noteError(e);
        if (e.code === e.PERMISSION_DENIED) return resolve((decided = perm(false, false)));
        // too slow, or "position unknown" for now: location IS allowed, Safari just hasn't found you yet; keep
        // tracking, and the first position arrives when it does
        keepTracking();
        rememberGranted('location');
        resolve((decided = perm(true, true)));
      },
      { timeout: 8_000, maximumAge: Infinity },
    );
  }).finally(() => {
    asking = null;
  });
  return asking;
}

export async function getForegroundPermissionsAsync() {
  return requestForegroundPermissionsAsync();
}

const toLocation = (p: GeolocationPosition): Location.LocationObject => ({
  coords: {
    latitude: p.coords.latitude,
    longitude: p.coords.longitude,
    altitude: p.coords.altitude,
    accuracy: p.coords.accuracy,
    altitudeAccuracy: p.coords.altitudeAccuracy,
    heading: p.coords.heading,
    speed: p.coords.speed,
  },
  timestamp: p.timestamp,
});

// the latest position the browser has given (from the watcher or a one-off), so asking again is instant
let latest: Location.LocationObject | null = null;
/** What Safari said the last time it couldn't give a position (shown in the "Location Unavailable" message). */
export let lastLocationError = '';
const noteError = (e: GeolocationPositionError) => {
  const why = e.code === 1 ? 'location is blocked for this site' : e.code === 2 ? 'the browser couldn\'t work out where you are' : 'the browser took too long to find you';
  lastLocationError = `${why} (code ${e.code}${e.message ? `: ${e.message}` : ''})`;
};
// whoever is waiting for a first position (from the background tracking or a direct request, whichever comes first)
const waiting = new Set<(l: Location.LocationObject) => void>();
const remember = (p: GeolocationPosition) => {
  latest = toLocation(p);
  waiting.forEach((w) => w(latest!));
  waiting.clear();
  return latest;
};
// once location is allowed, whim keeps track of you in the background, so posting and the locate button never
// have to wait for Safari to find you from scratch
let tracking = false;
function keepTracking() {
  if (tracking || !navigator.geolocation) return;
  tracking = true;
  navigator.geolocation.watchPosition(remember, noteError, { enableHighAccuracy: false, maximumAge: 60_000 });
}

export async function watchPositionAsync(_options: Location.LocationOptions, callback: Location.LocationCallback): Promise<Location.LocationSubscription> {
  const report = (p: GeolocationPosition) => callback(remember(p));
  navigator.geolocation.getCurrentPosition(report, () => {}, { maximumAge: 60_000 });
  const id = navigator.geolocation.watchPosition(report, () => {}, { enableHighAccuracy: false, maximumAge: 60_000 });
  return { remove: () => navigator.geolocation.clearWatch(id) };
}

// one-off positions through the browser's own geolocation too (expo's web version can hang in Safari)
const currentPosition = async (_maximumAge: number): Promise<Location.LocationObject> => {
  // whim keeps tracking you in the background, so the latest position is used right away (it's kept current)
  if (latest) return latest;
  // no position yet: Safari on a Mac finds you from nearby Wi-Fi, which can take a while, so wait for the first
  // one from either the background tracking or a direct request (a "position unknown" hiccup doesn't end it)
  keepTracking();
  return new Promise<Location.LocationObject>((resolve, reject) => {
    const got = (l: Location.LocationObject) => {
      clearTimeout(done);
      resolve(l);
    };
    const fail = (e: unknown) => {
      clearTimeout(done);
      waiting.delete(got);
      reject(e);
    };
    const done = setTimeout(() => fail(new Error('No location')), 25_000);
    waiting.add(got);
    navigator.geolocation.getCurrentPosition(
      remember,
      (e) => {
        noteError(e);
        if (e.code === 1) fail(e);
      },
      { maximumAge: Infinity, timeout: 25_000 },
    );
  });
};

// a fix from the last few minutes is good enough (a fresh one can take a while in a browser)
export async function getCurrentPositionAsync(_options?: Location.LocationOptions) {
  return currentPosition(10 * 60_000);
}

export async function getLastKnownPositionAsync(options?: Location.LocationLastKnownOptions) {
  return currentPosition(options?.maxAge ?? 60_000).catch(() => null);
}

// allowed on an earlier visit: start finding you straight away, so the map, posting and the locate button are ready
if (typeof window !== 'undefined' && wasGranted('location')) requestForegroundPermissionsAsync();
