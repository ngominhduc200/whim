// Web version of app/src/lib/notify.ts. Browsers can't put a notification on the lock screen, so the web shows
// whim's own banner, sliding down from the top of the app like an iPhone banner (see components/NotificationBanner).
// With the settings toggle on: the first one after a few seconds, then one every minute. Tapping it does what
// tapping the phone's notification does.

export const NEARBY_TEXT = 'Someone left a Moment nearby.';
const ON_KEY = 'notify:nearby-repeat';
const FIRST_S = 5;
const REPEAT_S = 60;

type Listener = () => void;
const bannerListeners = new Set<Listener>();
const tapListeners = new Set<Listener>();
let timers: ReturnType<typeof setTimeout>[] = [];

const show = () => bannerListeners.forEach((l) => l());
const stop = () => {
  timers.forEach((t) => clearTimeout(t));
  timers = [];
};
const start = () => {
  stop();
  timers.push(setTimeout(show, FIRST_S * 1000));
  timers.push(setInterval(show, REPEAT_S * 1000) as unknown as ReturnType<typeof setTimeout>);
};
const remembered = () => {
  try {
    return localStorage.getItem(ON_KEY) === '1';
  } catch {
    return false;
  }
};

/** The banner listens here for when to slide in. */
export function onBanner(listener: Listener) {
  bannerListeners.add(listener);
  return () => {
    bannerListeners.delete(listener);
  };
}

/** The banner was tapped. */
export function bannerTapped() {
  tapListeners.forEach((l) => l());
}

export async function askNotificationPermissionOnce() {}

export async function sendNearbyMoment(delaySeconds = FIRST_S) {
  timers.push(setTimeout(show, delaySeconds * 1000));
}

export async function isNearbyRepeatOn() {
  return remembered();
}

/** Picks the toggle back up when whim opens (it's remembered in the browser). */
export async function updateNearbyRepeat() {
  if (!remembered()) return;
  start();
  import('@/web/nearbyMoment').then((m) => m.ensureNearbyMoment());
}

export async function setNearbyRepeat(on: boolean) {
  // a moment within 20 m of you for the notification to point to
  if (on) import('@/web/nearbyMoment').then((m) => m.ensureNearbyMoment());
  try {
    localStorage.setItem(ON_KEY, on ? '1' : '0');
  } catch {}
  if (on) start();
  else stop();
  return on;
}

export function onNotificationTap(onTap: () => void) {
  tapListeners.add(onTap);
  return () => {
    tapListeners.delete(onTap);
  };
}

export function registerNotificationMenu() {}
