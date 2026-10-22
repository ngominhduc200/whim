import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { SEED_POSTS_BY_ID } from '@/data/seedPosts';

import type { Stroke } from './strokes';

/** A post: photo + doodle strokes + optional text, pinned at a location. */
export type Post = {
  id: string;
  /** File name inside the photos folder (the app's document path changes between installs, so it's stored relative). */
  photo: string;
  /** Sample posts use a photo bundled with the app instead of a file. */
  asset?: number;
  strokes: Stroke[];
  text: string;
  lng: number;
  lat: number;
  createdAt: number;
  /** Stored on this phone but someone else's (a test post): titled "Someone's moment", and kept by clearPosts. */
  byOthers?: boolean;
};

const KEY = 'posts:v4';
// posts saved under older keys are cleared (with their photo files) the first time the app loads
const OLD_KEYS = ['posts:v1', 'posts:v2', 'posts:v3'];
const photosDir = () => new Directory(Paths.document, 'photos');

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function photoUri(post: Pick<Post, 'photo'>) {
  return post.photo ? new File(photosDir(), post.photo).uri : '';
}

/** What to show as the post's photo: its bundled asset (sample posts) or its file. */
export function photoSource(post: Pick<Post, 'photo' | 'asset'>): number | { uri: string } {
  return post.asset ?? { uri: photoUri(post) };
}

// in-memory copy so screens can look posts up synchronously (the overlay opens by id)
let cache: Post[] | null = null;

async function clearOldPosts() {
  const old = await AsyncStorage.multiGet(OLD_KEYS);
  if (!old.some(([, v]) => v != null)) return;
  await AsyncStorage.multiRemove(OLD_KEYS);
  try {
    const dir = photosDir();
    if (dir.exists) dir.delete();
  } catch {
    // leftover files are harmless
  }
}

export async function loadPosts(): Promise<Post[]> {
  if (cache) return cache;
  await clearOldPosts().catch(() => {});
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? (JSON.parse(raw) as Post[]) : [];
  return cache;
}

/** Whether you made this post (the sample posts are everyone else's). */
export function isOwnPost(post: Pick<Post, 'id' | 'byOthers'>) {
  return !SEED_POSTS_BY_ID.has(post.id) && !post.byOthers;
}

/** Changes a saved post's fields (not its photo). */
export async function updatePost(id: string, changes: Partial<Omit<Post, 'id' | 'photo'>>) {
  const posts = (await loadPosts()).map((p) => (p.id === id ? { ...p, ...changes } : p));
  await AsyncStorage.setItem(KEY, JSON.stringify(posts));
  cache = posts;
  emit(null);
}

/** Deletes all your posts (and their photo files). The sample posts, and others' posts, stay. */
export async function clearPosts() {
  const all = await loadPosts();
  const kept = all.filter((p) => p.byOthers);
  for (const p of all) {
    if (p.byOthers || !p.photo) continue;
    try {
      const file = new File(photosDir(), p.photo);
      if (file.exists) file.delete();
    } catch {
      // a leftover file is harmless
    }
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  cache = kept;
  emit(null);
}

/** Deletes one stored post (and its photo file). */
export async function removePost(id: string) {
  const all = await loadPosts();
  const post = all.find((p) => p.id === id);
  if (!post) return;
  if (post.photo) {
    try {
      const file = new File(photosDir(), post.photo);
      if (file.exists) file.delete();
    } catch {
      // a leftover file is harmless
    }
  }
  const kept = all.filter((p) => p.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(kept));
  cache = kept;
  emit(null);
}

export function getPost(id: string): Post | undefined {
  return cache?.find((p) => p.id === id) ?? SEED_POSTS_BY_ID.get(id);
}

/** Copies the photo into the document directory and stores the post metadata. */
export async function savePost(draft: Omit<Post, 'id' | 'photo' | 'createdAt'> & { sourceUri: string }): Promise<Post> {
  const { sourceUri, ...rest } = draft;
  const id = newId();
  const dir = photosDir();
  dir.create({ idempotent: true, intermediates: true });
  const ext = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const photo = `${id}.${ext}`;
  await new File(sourceUri).copy(new File(dir, photo));

  const post: Post = { ...rest, id, photo, createdAt: Date.now() };
  const posts = [...(await loadPosts()), post];
  await AsyncStorage.setItem(KEY, JSON.stringify(posts));
  cache = posts;
  emit(post);
  return post;
}

// tiny change feed so the map can show (and fly to) a post as soon as it's saved
/** `added` is the new post, or null when posts were removed. */
type Listener = (added: Post | null) => void;
const listeners = new Set<Listener>();
const emit = (added: Post | null) => listeners.forEach((l) => l(added));
export function subscribePosts(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
