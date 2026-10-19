import * as Location from 'expo-location';

// A short, high-level description of where a post was made, like "on Kingsway in Burnaby" or "in Mount
// Pleasant": a street and city, or just a neighbourhood or city. Looked up from the post's pin location and
// remembered, so each place is only looked up once.
const cache = new Map<string, Promise<string | null>>();

function describe(a: Location.LocationGeocodedAddress): string | null {
  const area = a.district ?? a.city ?? a.subregion ?? a.region;
  if (a.street && a.city) return `on ${a.street} in ${a.city}`;
  if (a.street) return `on ${a.street}`;
  if (area) return `in ${area}`;
  return null;
}

export function placeName(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
      .then((results) => (results[0] ? describe(results[0]) : null))
      .catch(() => null);
    cache.set(key, hit);
  }
  return hit;
}
