// Web version of app/src/lib/place.ts: the same short description of where a post was made ("on Kingsway in
// Burnaby", "in Mount Pleasant"), looked up with Mapbox's geocoding (browsers have no built-in reverse geocoder).
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const cache = new Map<string, Promise<string | null>>();

type Feature = { properties?: { feature_type?: string; name?: string; context?: Record<string, { name?: string }> } };

function describe(features: Feature[]): string | null {
  const ctx = features[0]?.properties?.context ?? {};
  const street = features.find((f) => f.properties?.feature_type === 'street')?.properties?.name ?? ctx.street?.name;
  const city = ctx.place?.name;
  const area = ctx.neighborhood?.name ?? ctx.locality?.name ?? city ?? ctx.region?.name;
  if (street && city) return `on ${street} in ${city}`;
  if (street) return `on ${street}`;
  if (area) return `in ${area}`;
  return null;
}

export function placeName(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let hit = cache.get(key);
  if (!hit) {
    const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&types=street,neighborhood,locality,place&access_token=${TOKEN}`;
    hit = fetch(url)
      .then((r) => r.json())
      .then((json) => describe(json.features ?? []))
      .catch(() => null);
    cache.set(key, hit);
  }
  return hit;
}
