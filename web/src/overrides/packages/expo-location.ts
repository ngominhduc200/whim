// expo-location on the web, with two differences:
//  - checking for location permission asks the browser for it if it hasn't been decided yet (the app only shows
//    your location cloud once permission is granted, and a browser starts with nothing granted);
//  - watching your position uses the browser's own watcher, which also reports where you are right away (expo's
//    web watcher doesn't send updates in Safari).
import * as Location from 'expo-location';

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
        resolve((decided = perm(true, true)));
      },
      (e) => resolve(e.code === e.PERMISSION_DENIED ? (decided = perm(false, false)) : perm(false, true)),
      { timeout: 20_000, maximumAge: 60_000 },
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
const remember = (p: GeolocationPosition) => (latest = toLocation(p));
// once location is allowed, whim keeps track of you in the background, so posting and the locate button never
// have to wait for Safari to find you from scratch
let tracking = false;
function keepTracking() {
  if (tracking || !navigator.geolocation) return;
  tracking = true;
  navigator.geolocation.watchPosition(remember, () => {}, { enableHighAccuracy: false, maximumAge: 60_000 });
}

export async function watchPositionAsync(_options: Location.LocationOptions, callback: Location.LocationCallback): Promise<Location.LocationSubscription> {
  const report = (p: GeolocationPosition) => callback(remember(p));
  navigator.geolocation.getCurrentPosition(report, () => {}, { maximumAge: 60_000 });
  const id = navigator.geolocation.watchPosition(report, () => {}, { enableHighAccuracy: false, maximumAge: 60_000 });
  return { remove: () => navigator.geolocation.clearWatch(id) };
}

// one-off positions through the browser's own geolocation too (expo's web version can hang in Safari)
// One fix from the browser. On a Mac, Safari finds you from nearby Wi-Fi, which can take a while and sometimes
// briefly reports "position unknown" before succeeding, so it's given time and a second try.
const askBrowser = (timeout: number) =>
  new Promise<Location.LocationObject>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition((p) => resolve(remember(p)), reject, { maximumAge: Infinity, timeout }),
  );

const currentPosition = async (maximumAge: number): Promise<Location.LocationObject> => {
  // the background watch (or an earlier fix) usually already knows where you are
  if (latest && Date.now() - latest.timestamp < maximumAge) return latest;
  keepTracking();
  try {
    return await askBrowser(6_000);
  } catch (e) {
    if ((e as GeolocationPositionError).code === 1) throw e; // permission denied: no point retrying
    // the last place you were seen, however old, beats waiting
    if (latest) return latest;
    return askBrowser(8_000);
  }
};

// a fix from the last few minutes is good enough (a fresh one can take a while in a browser)
export async function getCurrentPositionAsync(_options?: Location.LocationOptions) {
  return currentPosition(10 * 60_000);
}

export async function getLastKnownPositionAsync(options?: Location.LocationLastKnownOptions) {
  return currentPosition(options?.maxAge ?? 60_000).catch(() => null);
}
