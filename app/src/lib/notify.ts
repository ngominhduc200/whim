import * as DevClient from 'expo-dev-client';
import * as Notifications from 'expo-notifications';

// Local notifications only (no push server), for previewing how the "a moment nearby" alert looks on the lock
// screen: on demand from the dev menu, or every minute from the settings toggle. iOS shows the app's name
// ("whim") above the text.

const NEARBY_TEXT = 'Someone left a Moment nearby.';
/** Time to lock the phone after tapping the menu item. */
const DELAY_S = 5;

// shown even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** Asks once, while the app is open (iOS only shows the prompt then), so a later notification can show at all. */
export async function askNotificationPermissionOnce() {
  const current = await Notifications.getPermissionsAsync();
  if (current.canAskAgain && !current.granted) await Notifications.requestPermissionsAsync();
}

/** Asks for permission the first time, then sends the "nearby" notification after a few seconds. */
export async function sendNearbyMoment(delaySeconds = DELAY_S) {
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  await Notifications.scheduleNotificationAsync({
    content: { body: NEARBY_TEXT, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  });
}

// The settings toggle: while it's on, iOS repeats the "nearby" notification every minute by itself (even with
// the app closed). What's scheduled is the source of truth for whether it's on.
const REPEAT_ID = 'nearby-repeat';
// iOS's shortest allowed repeat
const REPEAT_S = 60;
// the toggle's earlier every-10-minutes schedule, swapped for the current one at launch
const OLD_REPEAT_IDS = ['nearby-every-10-min'];

export async function isNearbyRepeatOn() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some((n) => n.identifier === REPEAT_ID);
}

async function scheduleRepeat() {
  await Notifications.scheduleNotificationAsync({
    identifier: REPEAT_ID,
    content: { body: NEARBY_TEXT, sound: 'default' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: REPEAT_S, repeats: true },
  });
}

/** If the toggle was turned on under an older schedule, keeps it on with the current one. Call at launch. */
export async function updateNearbyRepeat() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const old = scheduled.filter((n) => OLD_REPEAT_IDS.includes(n.identifier));
  if (!old.length) return;
  await Promise.all(old.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  await scheduleRepeat();
}

/** Turns the every-minute notification on (asking permission if needed) or off. Returns whether it's on. */
export async function setNearbyRepeat(on: boolean) {
  if (!on) {
    await Notifications.cancelScheduledNotificationAsync(REPEAT_ID);
    return false;
  }
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return false;
  // one right away (a few seconds, time to lock the phone), so you can see it's on, then every minute
  await sendNearbyMoment();
  await scheduleRepeat();
  return true;
}

/**
 * Calls `onTap` when a notification is tapped: right away if the app is running, or once at launch if the tap is
 * what opened it. (Every notification the app sends is the "Moment nearby" one.)
 */
export function onNotificationTap(onTap: () => void) {
  const handled = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    Notifications.clearLastNotificationResponseAsync();
    onTap();
  };
  Notifications.getLastNotificationResponseAsync().then(handled);
  const subscription = Notifications.addNotificationResponseReceivedListener(handled);
  return () => subscription.remove();
}

/** Adds "Send 'Moment nearby' notification" to the dev menu (shake / ⌘D). */
export function registerNotificationMenu() {
  DevClient.registerDevMenuItems([
    { name: `Send "Moment nearby" notification (in ${DELAY_S}s)`, callback: () => void sendNearbyMoment(), shouldCollapse: true },
  ]);
}
