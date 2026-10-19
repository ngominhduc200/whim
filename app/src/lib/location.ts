import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export type LngLat = [number, number];

function showDeniedAlert() {
  Alert.alert('Location Is Off', 'Allow SVSD to use your location in Settings to find yourself on the map.', [
    { text: 'Not Now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

/** Asks for permission if needed. Shows a native alert and returns false when it's denied. */
export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (current.canAskAgain) {
    const asked = await Location.requestForegroundPermissionsAsync();
    if (asked.granted) return true;
  }
  showDeniedAlert();
  return false;
}

/** A random spot within `radius` meters of [lng, lat], spread evenly over the circle. */
export function nearby([lng, lat]: LngLat, radius: number): LngLat {
  const d = radius * Math.sqrt(Math.random());
  const a = Math.random() * Math.PI * 2;
  const dLat = (d * Math.cos(a)) / 111_320;
  const dLng = (d * Math.sin(a)) / (111_320 * Math.cos((lat * Math.PI) / 180));
  return [lng + dLng, lat + dLat];
}

/** Current position as [lng, lat], or null if permission was denied or no fix is available. */
export async function getCurrentLngLat(): Promise<LngLat | null> {
  if (!(await ensureLocationPermission())) return null;
  try {
    const recent = await Location.getLastKnownPositionAsync({ maxAge: 60_000 });
    const pos = recent ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return [pos.coords.longitude, pos.coords.latitude];
  } catch {
    Alert.alert('Location Unavailable', "SVSD couldn't find your current location. Try again in a moment.");
    return null;
  }
}

const EARTH_M = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

/** Distance between two points, in meters. */
export function distanceM([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.sqrt(a));
}

/** Compass bearing from one point to another, in degrees (0 = north, 90 = east). */
export function bearingDeg([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
