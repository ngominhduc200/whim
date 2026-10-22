// Web version of app/src/lib/posts.ts (same API). Browsers have no app file storage, so a post's photo is kept in
// the browser's storage as an image (data URL), shrunk to at most 1200px so it fits.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SEED_POSTS_BY_ID } from '@/data/seedPosts';

import type { Stroke } from '@/lib/strokes';

export type Post = {
  id: string;
  /** The photo's key in the browser's storage. */
  photo: string;
  /** Sample posts use a photo bundled with the app instead. */
  asset?: number;
  strokes: Stroke[];
  text: string;
  lng: number;
  lat: number;
  createdAt: number;
  /** Someone else's (a test post): titled "Someone's moment", and kept by clearPosts. */
  byOthers?: boolean;
};

const KEY = 'posts:web:v1';
const PHOTO_KEY = (photo: string) => `photo:${photo}`;
const MAX_SIDE = 1200;

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// photos (data URLs) by key, loaded with the posts so screens can show them synchronously
const photos = new Map<string, string>();

export function photoUri(post: Pick<Post, 'photo'>) {
  return post.photo ? (photos.get(post.photo) ?? '') : '';
}

/** What to show as the post's photo: its bundled asset (sample posts) or its stored image. */
export function photoSource(post: Pick<Post, 'photo' | 'asset'>): number | { uri: string } {
  return post.asset ?? { uri: photoUri(post) };
}

let cache: Post[] | null = null;

export async function loadPosts(): Promise<Post[]> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  const posts = raw ? (JSON.parse(raw) as Post[]) : [];
  const stored = await AsyncStorage.multiGet(posts.filter((p) => p.photo).map((p) => PHOTO_KEY(p.photo)));
  for (const [key, value] of stored) if (value) photos.set(key.slice('photo:'.length), value);
  cache = posts;
  return cache;
}

export function isOwnPost(post: Pick<Post, 'id' | 'byOthers'>) {
  return !SEED_POSTS_BY_ID.has(post.id) && !post.byOthers;
}

export async function updatePost(id: string, changes: Partial<Omit<Post, 'id' | 'photo'>>) {
  const posts = (await loadPosts()).map((p) => (p.id === id ? { ...p, ...changes } : p));
  await AsyncStorage.setItem(KEY, JSON.stringify(posts));
  cache = posts;
  emit(null);
}

export async function clearPosts() {
  const all = await loadPosts();
  const kept = all.filter((p) => p.byOthers);
  const gone = all.filter((p) => !p.byOthers && p.photo);
  await AsyncStorage.multiRemove(gone.map((p) => PHOTO_KEY(p.photo)));
  gone.forEach((p) => photos.delete(p.photo));
  await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  cache = kept;
  emit(null);
}

/** Deletes one stored post (and its photo). */
export async function removePost(id: string) {
  const all = await loadPosts();
  const post = all.find((p) => p.id === id);
  if (!post) return;
  if (post.photo) {
    await AsyncStorage.removeItem(PHOTO_KEY(post.photo));
    photos.delete(post.photo);
  }
  const kept = all.filter((p) => p.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  cache = kept;
  emit(null);
}

export function getPost(id: string): Post | undefined {
  return cache?.find((p) => p.id === id) ?? SEED_POSTS_BY_ID.get(id);
}

/** The image at `uri`, redrawn at most MAX_SIDE on its longer side, as a JPEG data URL. */
async function shrunk(uri: string): Promise<string> {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.src = uri;
  await img.decode();
  const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * k);
  canvas.height = Math.round(img.naturalHeight * k);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function savePost(draft: Omit<Post, 'id' | 'photo' | 'createdAt'> & { sourceUri: string }): Promise<Post> {
  const { sourceUri, ...rest } = draft;
  const id = newId();
  const photo = id;
  const data = await shrunk(sourceUri);
  await AsyncStorage.setItem(PHOTO_KEY(photo), data);
  photos.set(photo, data);

  const post: Post = { ...rest, id, photo, createdAt: Date.now() };
  const posts = [...(await loadPosts()), post];
  await AsyncStorage.setItem(KEY, JSON.stringify(posts));
  cache = posts;
  emit(post);
  return post;
}

type Listener = (added: Post | null) => void;
const listeners = new Set<Listener>();
const emit = (added: Post | null) => listeners.forEach((l) => l(added));
export function subscribePosts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
