// A tiny signal from the post view to the map: the post is about to land back in its pin, so the map can show its
// pins again underneath (the landing photo covers its own pin until the post view closes).

type Listener = () => void;
const listeners = new Set<Listener>();

export function postViewClosing() {
  listeners.forEach((l) => l());
}

export function onPostViewClosing(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
