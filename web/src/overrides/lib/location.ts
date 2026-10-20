// Web version of app/src/lib/location.ts: the same helpers, but finding you never leaves posting or the locate
// button waiting. If the browser can't give a position (location blocked, Location Services off for the
// browser, or no answer within a few seconds), it says so once and falls back to your last known spot, or, as a
// demo, to downtown Vancouver.
import { Alert } from 'react-native';

import * as Location from 'expo-location';

export { bearingDeg, distanceM, nearby, type LngLat } from '../../../../app/src/lib/location';
import type { LngLat } from '../../../../app/src/lib/location';

const DEMO_SPOT: LngLat = [-123.1207, 49.2827];
let last: LngLat | null = null;
let warned = false;

export async function ensureLocationPermission(): Promise<boolean> {
  return (await Location.getForegroundPermissionsAsync()).granted;
}

export async function getCurrentLngLat(): Promise<LngLat | null> {
  try {
    const pos = await Location.getCurrentPositionAsync();
    last = [pos.coords.longitude, pos.coords.latitude];
    return last;
  } catch {
    if (!warned) {
      warned = true;
      const why = (Location as unknown as { lastLocationError?: string }).lastLocationError;
      Alert.alert(
        'Location Unavailable',
        `whim couldn't get your location${why ? `: ${why}` : ''}. For now it's using ` +
          (last ? 'your last known spot' : 'downtown Vancouver') +
          '. Check that Wi-Fi is on and that Location Services is on for Safari (System Settings ▸ Privacy & Security).',
      );
    }
    return last ?? DEMO_SPOT;
  }
}
