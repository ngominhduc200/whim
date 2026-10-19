// Web version of app/src/lib/imageCache.ts, identical but for where a bundled image's address comes from.
import { Skia, type SkImage } from '@shopify/react-native-skia';
import { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';

// Decoded post photos, kept in memory so a pin or a post that shows up again (going back and forth between the
// map and a post re-creates the pins) has its photo right away instead of flashing while it loads. Photos are
// shrunk to at most MAX_SIDE when decoded: nothing shows them bigger, and a full camera photo is ~48MB decoded.

const MAX_SIDE = 1200;
/** The oldest photos are dropped past this many. */
const LIMIT = 80;

export type PhotoSource = number | { uri: string };

const cache = new Map<string, SkImage>();
const pending = new Map<string, Promise<SkImage | null>>();

const keyOf = (source: PhotoSource) => (typeof source === 'number' ? `asset:${source}` : source.uri);
// (the one difference on the web: a bundled image's address comes from expo-asset)
const uriOf = (source: PhotoSource) => (typeof source === 'number' ? Asset.fromModule(source).uri : source.uri);

function remember(key: string, image: SkImage) {
  cache.delete(key);
  cache.set(key, image);
  while (cache.size > LIMIT) cache.delete(cache.keys().next().value!);
}

function shrink(image: SkImage): SkImage {
  const w = image.width();
  const h = image.height();
  const k = MAX_SIDE / Math.max(w, h);
  if (k >= 1) return image;
  const [sw, sh] = [Math.round(w * k), Math.round(h * k)];
  const surface = Skia.Surface.MakeOffscreen(sw, sh);
  if (!surface) return image;
  surface.getCanvas().drawImageRect(image, Skia.XYWHRect(0, 0, w, h), Skia.XYWHRect(0, 0, sw, sh), Skia.Paint());
  surface.flush();
  // a CPU copy, so it's usable on any thread and survives the surface
  return surface.makeImageSnapshot().makeNonTextureImage() ?? image;
}

/** Starts decoding a photo (once), so it's ready by the time something shows it. */
export function preloadPhoto(source: PhotoSource): Promise<SkImage | null> {
  const key = keyOf(source);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  let job = pending.get(key);
  if (!job) {
    job = Skia.Data.fromURI(uriOf(source))
      .then((data) => {
        const decoded = Skia.Image.MakeImageFromEncoded(data);
        if (!decoded) return null;
        const image = shrink(decoded);
        remember(key, image);
        return image;
      })
      .catch(() => null)
      .finally(() => pending.delete(key));
    pending.set(key, job);
  }
  return job;
}

/** The photo, decoded: immediately if it's been shown before, otherwise once it has loaded (null until then). */
export function useCachedPhoto(source: PhotoSource): SkImage | null {
  const key = keyOf(source);
  const [loaded, setLoaded] = useState<{ key: string; image: SkImage } | null>(null);
  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    preloadPhoto(typeof source === 'number' ? source : { uri: key }).then((image) => {
      if (alive && image) setLoaded({ key, image });
    });
    return () => {
      alive = false;
    };
    // the key identifies the source
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return cache.get(key) ?? (loaded?.key === key ? loaded.image : null);
}
