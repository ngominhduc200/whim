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
      () => resolve((decided = perm(true, true))),
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

export async function watchPositionAsync(_options: Location.LocationOptions, callback: Location.LocationCallback): Promise<Location.LocationSubscription> {
  const report = (p: GeolocationPosition) => callback(remember(p));
  navigator.geolocation.getCurrentPosition(report, () => {}, { maximumAge: 60_000 });
  const id = navigator.geolocation.watchPosition(report, () => {}, { enableHighAccuracy: false, maximumAge: 10_000 });
  return { remove: () => navigator.geolocation.clearWatch(id) };
}

// one-off positions through the browser's own geolocation too (expo's web version can hang in Safari)
const currentPosition = (maximumAge: number) =>
  latest && Date.now() - latest.timestamp < maximumAge
    ? Promise.resolve(latest)
    : new Promise<Location.LocationObject>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition((p) => resolve(remember(p)), reject, { maximumAge, timeout: 10_000 }),
      );

// a fix from the last couple of minutes is good enough (a fresh one can take many seconds in a browser)
export async function getCurrentPositionAsync(_options?: Location.LocationOptions) {
  return currentPosition(120_000);
}

export async function getLastKnownPositionAsync(options?: Location.LocationLastKnownOptions) {
  return currentPosition(options?.maxAge ?? 60_000).catch(() => null);
}
