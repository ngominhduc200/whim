// Remembers, on this device, which permissions you've allowed whim (camera, location), so a later visit can ask
// the browser for them right away by itself. (Whether the browser shows its own prompt again is the browser's
// call: Chrome remembers "Allow"; Safari does when the site is set to Allow in its Website settings.)
type Kind = 'camera' | 'location';
const key = (kind: Kind) => `perm:${kind}`;

export function rememberGranted(kind: Kind) {
  try {
    localStorage.setItem(key(kind), 'granted');
  } catch {}
}

export function wasGranted(kind: Kind) {
  try {
    return localStorage.getItem(key(kind)) === 'granted';
  } catch {
    return false;
  }
}
