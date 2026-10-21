import Mapbox, { Atmosphere, Camera, Images, LocationPuck, MapView, MarkerView, StyleImport, type MapState } from '@rnmapbox/maps';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BUTTON_SHADOW, CircleButton } from '@/components/CircleButton';
import { DoodleLoader } from '@/components/DoodleLoader';
import { PostedCelebration } from '@/components/PostedCelebration';
import { DoodleIcon, ICON_COLOR } from '@/components/icons/DoodleIcon';
import { AreaDoodles, useAreaDoodles } from '@/components/map/AreaDoodles';
import { CanvasLayers } from '@/components/map/CanvasLayers';
import { LandmarkLayer } from '@/components/map/LandmarkLayer';
import { ClusterPin } from '@/components/map/ClusterPin';
import { GatherIn, MERGE_OUT_MS, MergeOut, SplitIn } from '@/components/map/SplitIn';
import { PIN_ANCHOR, PIN_WIDTH, PostPin } from '@/components/map/PostPin';
import { onPostViewClosing } from '@/lib/postView';
import { USER_CLOUD_HEIGHT, USER_CLOUD_WIDTH, USER_MARKER_ANCHOR, UserMarker } from '@/components/map/UserMarker';
import { GuideArrow } from '@/components/map/GuideArrow';
import { onNotificationTap } from '@/lib/notify';
import { SEED_POSTS } from '@/data/seedPosts';
import { STORE_IMAGES } from '@/data/storeIcons';
import { buildClusters, CLUSTER_MAX_ZOOM, screenOffset, useClusters, type Bounds, type MapItem } from '@/lib/clusters';
import { ShutterButton } from '@/components/ShutterButton';
import { BAR_ICON, CONTROL_RIGHT, CONTROL_SIZE, EDGE, PROFILE_RIGHT, PROFILE_SIZE, PROFILE_TOP, useMapControlsLayout } from '@/lib/layout';
import { bearingDeg, distanceM, getCurrentLngLat } from '@/lib/location';
import { FLOWER_ICON, LINE_PATTERNS, MAP_STYLE_URL, PAPER, STANDARD_CONFIG, WATER, WATER_PATTERN } from '@/lib/mapStyle';
import { isOwnPost, type Post } from '@/lib/posts';
import { usePosts } from '@/lib/usePosts';

const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
// the dark around the globe
const SPACE = '#0d0d0f';
// the compass: a 44×44 tap box with a 16.5pt-wide needle at its center (scripts/build-landmark-icons.mjs)
const COMPASS_BOX = 44;
const COMPASS_NEEDLE_WIDTH = 16.5;

/**
 * A pin or stack on screen. `splitFrom`: it just split out of a bigger stack (where it springs out from).
 * `gathered`: it's a bigger stack that pieces just merged into.
 */
type ShownItem = MapItem & { splitFrom?: { x: number; y: number }; gathered?: boolean };
/** A piece that just merged into a bigger stack, sliding into it before it disappears. */
type Ghost = { key: string; item: MapItem; to: { x: number; y: number } };

const ignoreMapTap = () => {};
// tapping the nearby notification: how long the map takes to turn, and the arrow's gap from you and the pin
const GUIDE_TURN_MS = 1000;
// the arrow never gets shorter than this (when you're right at the pin)
const GUIDE_MIN_ARROW = 24;
// where you and the moment end up, as fractions of the screen's height (you well clear of the capture button)
const GUIDE_ME_AT = 0.7;
const GUIDE_IT_AT = 0.2;
// no closer than 18 taps of + from the start (1.6), the map's own limit, where streets and doodles still show, so the map is seen moving
const GUIDE_MAX_ZOOM = 19.6;
// Mapbox's camera: its vertical field of view (the same in every Mapbox map)
const MAPBOX_FOV = 0.6435011087932844;

/**
 * The camera that shows `me` at GUIDE_ME_AT and `there` at GUIDE_IT_AT of the screen's height, with `there`
 * straight up from `me` (the caller turns the map to the bearing between them). In 3D a ground point `g` points
 * ahead of the center shows `D·g·cos(tilt) / (D + g·sin(tilt))` points above it (D: the camera's distance,
 * (H/2) / tan(fov/2)), so how far the center sits along the way, and the zoom, can be solved for exactly. 3D (the
 * map's usual tilt) when that lands close enough for it; flat otherwise.
 */
/**
 * The map center that puts `me` at GUIDE_ME_AT of the screen's height, at this zoom, tilt and heading (the
 * direction the map faces): the point that far ahead of you on the ground, along the heading.
 */
function anchoredCenter(me: [number, number], heading: number, zoom: number, pitchDeg: number, H: number): [number, number] {
  const below = H * (GUIDE_ME_AT - 0.5);
  const D = H / 2 / Math.tan(MAPBOX_FOV / 2);
  const p = (pitchDeg * Math.PI) / 180;
  const backPts = (below * D) / (D * Math.cos(p) + below * Math.sin(p));
  const ptsPerMeter = (512 * 2 ** zoom) / (40_075_016.686 * Math.cos((me[1] * Math.PI) / 180));
  const m = backPts / ptsPerMeter;
  const h = (heading * Math.PI) / 180;
  return [me[0] + (m * Math.sin(h)) / (111_320 * Math.cos((me[1] * Math.PI) / 180)), me[1] + (m * Math.cos(h)) / 111_320];
}

function guideCamera(me: [number, number], there: [number, number], H: number) {
  const below = H * (GUIDE_ME_AT - 0.5); // you, below the middle
  const above = H * (0.5 - GUIDE_IT_AT); // it, above the middle
  const D = H / 2 / Math.tan(MAPBOX_FOV / 2);
  const meters = Math.max(10, distanceM(me, there));
  const solve = (pitchDeg: number) => {
    const p = (pitchDeg * Math.PI) / 180;
    // ground distances (in points) from the center back to you and ahead to it
    const back = (below * D) / (D * Math.cos(p) + below * Math.sin(p));
    const ahead = (above * D) / (D * Math.cos(p) - above * Math.sin(p));
    const ptsPerMeter = (back + ahead) / meters;
    // points per meter at zoom z: 512·2^z / (40,075km·cos(lat))
    const zoom = Math.log2((ptsPerMeter * 40_075_016.686 * Math.cos((me[1] * Math.PI) / 180)) / 512);
    const t = back / (back + ahead);
    return { zoom, t };
  };
  let pitch = TILT_PITCH;
  let { zoom, t } = solve(pitch);
  if (zoom < TILT_ZOOM) {
    pitch = 0;
    ({ zoom, t } = solve(0));
  }
  zoom = Math.min(GUIDE_MAX_ZOOM, Math.max(LOCATE_ZOOM, zoom));
  const center: [number, number] = [me[0] + (there[0] - me[0]) * t, me[1] + (there[1] - me[1]) * t];
  return { center, zoom, pitch };
}
const GUIDE_GAP = 24;
// how often the forests' and parks' doodles catch up while the map keeps moving
const AREAS_THROTTLE_MS = 1200;
// Your cloud between positions: it keeps going at your speed and direction (from your last two positions), for up
// to GLIDE_AHEAD_MAX_MS past the latest one, and eases onto each new one over about GLIDE_EASE_S. A jump further
// than GLIDE_JUMP_M (a fresh fix far away) isn't glided.
const GLIDE_AHEAD_MAX_MS = 2500;
const GLIDE_EASE_S = 0.3;
const GLIDE_JUMP_M = 200;
// Focus on the phone: the map's own "follow me" camera (it smooths your position and moves the map natively, every
// frame, so it keeps pace with you even driving). The browser map has no such mode, so the web follows you itself.
const NATIVE_FOLLOW = Platform.OS !== 'web';
// Mapbox's location dot drives that camera; it's drawn with a blank image (your cloud is drawn by the app)
const BLANK_PUCK = 'puck-blank';
// GPS wander while you stand still: a new position closer than its margin of error (at least / at most this many
// metres) is ignored, unless the phone says you're moving at walking speed (m/s)
const STILL_MIN_M = 5;
const STILL_MAX_M = 20;
const WALKING_MPS = 0.5;
// closer to the pin than this, the following map keeps facing the way it was
const STEADY_HEADING_M = 12;

/** Your cloud, at wherever its glide has got to (it re-renders on its own, every frame it moves). */
function GlidingUserMarker({ subscribe }: { subscribe: (fn: (at: [number, number]) => void) => () => void }) {
  const [at, setAt] = useState<[number, number] | null>(null);
  useEffect(() => subscribe(setAt), [subscribe]);
  // the same element every frame, so the cloud itself isn't redrawn, only moved
  const cloud = useMemo(() => <UserMarker />, []);
  if (!at) return null;
  return (
    // "selected" keeps your location drawn above the post pins
    <MarkerView coordinate={at} anchor={USER_MARKER_ANCHOR} allowOverlap allowOverlapWithPuck isSelected>
      {cloud}
    </MarkerView>
  );
}
const PIN_HEIGHT = (PIN_WIDTH * 4) / 3;

const MAP_IMAGES = {
  // the canvas doodles' textures (scripts/build-landmark-icons.mjs)
  [LINE_PATTERNS.roadMain]: { image: require('@/assets/landmarks/road-main.png'), scale: 2 },
  [LINE_PATTERNS.roadMinor]: { image: require('@/assets/landmarks/road-minor.png'), scale: 2 },
  [WATER_PATTERN]: { image: require('@/assets/landmarks/water-waves.png'), scale: 3 },
  [FLOWER_ICON]: { image: require('@/assets/landmarks/flower.png'), scale: 3 },
  // the compass: a hand-drawn red needle instead of Mapbox's default
  compass: { image: require('@/assets/landmarks/compass.png'), scale: 3 },
  [BLANK_PUCK]: { image: require('@/assets/landmarks/blank.png'), scale: 1 },
  // the doodles for kinds of places (cafés, shops…)
  ...STORE_IMAGES,
};
Mapbox.setAccessToken(TOKEN);

const START = { centerCoordinate: [-123.11, 49.28], zoomLevel: 1.6 };
const LOCATE_ZOOM = 15;
// Focus: how close tap 1 (and tap 3, back from 3D) shows you, flat
const FOCUS_ZOOM = 16;
// how far out and in the map goes, by pinch or by the − / + buttons (out: the whole globe with space around it;
// in: 18 taps of + from the start view at 1.6, three taps into 3D)
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 19.6;
// The map starts at zoom 1.6 and each + adds 1: taps 1–15 (up to 16.6) are always flat and can't be tilted;
// from tap 16 (17.6) in, the map tilts to 3D on its own.
const TILT_ZOOM = 17.5;
const TILT_PITCH = 60;
// how close focus tap 2 zooms in (past the tilt zoom, so it's 3D)
const CLOSE_ZOOM = 18;
// below this zoom the dark space around the globe is on screen, so the status bar goes light
const SPACE_ZOOM = 4;
// while the map moves, visible pins/clusters are recomputed at most this often (and once more when it settles)
const CLUSTER_THROTTLE_MS = 120;

// Focus cycles: tap 1 finds you, tap 2 zooms in close (3D), tap 3 back. Moving the map resets it.
// The focus icon turns orange while the map is following you (flat or tilted).
type FocusMode = 'free' | 'located' | 'tilted';
const FOCUS_ACTIVE = '#FF6A18';

export function MapScreen() {
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);
  const mapRef = useRef<MapView>(null);
  // the little trees and flowers filling forests and parks (components/map/AreaDoodles)
  const { shape: areaShape, refresh: refreshAreaDoodles } = useAreaDoodles(mapRef);
  const lastAreasRef = useRef(0);
  const refreshAreas = useCallback(
    (view: { zoom: number; bounds: { ne: number[]; sw: number[] } }) => {
      lastAreasRef.current = Date.now();
      refreshAreaDoodles(view);
    },
    [refreshAreaDoodles],
  );
  const cameraRef = useRef<Camera>(null);
  const [showPuck, setShowPuck] = useState(false);
  // Mapbox reads the custom compass image from the style right when the style loads, before our images are
  // registered; so it's only set once the style (and its images) are in, which makes it apply.
  const [compassReady, setCompassReady] = useState(false);

  // Your location is drawn as a pinned view (not Mapbox's puck, which turns with the map), so the doodled
  // cloud always stays upright on screen. Its image has the cloud's feet at the center.
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const userLocationRef = useRef<[number, number] | null>(null);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);
  useEffect(() => {
    if (!showPuck) return;
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;
    // every metre or so (GPS-grade), so your cloud has a steady stream of positions to glide along. Standing
    // still, GPS wanders by several metres; that's not you moving, so a new position only counts if it's further
    // than its own margin of error (or you're walking, by the phone's own speed reading), or much more precise.
    let kept: { at: [number, number]; accuracy: number; walking: boolean } | null = null;
    Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1 }, (pos) => {
      const at: [number, number] = [pos.coords.longitude, pos.coords.latitude];
      const accuracy = pos.coords.accuracy ?? STILL_MIN_M;
      const walking = (pos.coords.speed ?? 0) >= WALKING_MPS;
      // (the first position after you stop always counts, so a cloud still gliding on at your old speed comes back)
      if (kept && !walking && !kept.walking && accuracy > kept.accuracy / 2) {
        const margin = Math.min(STILL_MAX_M, Math.max(STILL_MIN_M, accuracy));
        if (distanceM(kept.at, at) < margin) return;
      }
      kept = { at, accuracy, walking };
      setUserLocation(at);
    }).then((s) => {
      if (cancelled) s.remove();
      else subscription = s;
    });
    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [showPuck]);
  // Tapping the "Moment nearby" notification: the map turns so the nearest moment that isn't yours is straight up
  // the screen from you (you in the lower half, it in the upper half), then a wiggly arrow draws from you to it.
  const [guide, setGuide] = useState<{ from: { x: number; y: number }; to: { x: number; y: number } } | null>(null);
  // moving the map while the arrow plays fades it out right away
  const [guideLeaving, setGuideLeaving] = useState(false);
  const guidingRef = useRef(false);
  const [guideAsked, setGuideAsked] = useState(0);
  useEffect(() => onNotificationTap(() => setGuideAsked((n) => n + 1)), []);
  // From then on, the cloud and the pin stay locked on screen: as you move, the map follows you (like navigation
  // in a maps app), turning so the pin stays straight above you, at the same tilt. That carries on after the arrow
  // has faded, until you move the map yourself or use the map's buttons.
  const guideLockRef = useRef<{ there: [number, number]; pitch: number; zoom: number; me: [number, number]; heading: number } | null>(
    null,
  );
  const endGuide = useCallback(() => setGuide(null), []);
  const stopFollowing = useCallback(() => {
    if (!guidingRef.current) return;
    guidingRef.current = false;
    guideLockRef.current = null;
    setGuideLeaving(true);
  }, []);
  const [focusMode, setFocusMode] = useState<FocusMode>('free');
  const focusModeRef = useRef<FocusMode>('free');
  // On the phone, once Focus has flown to you, the map's own follow camera takes over (see NATIVE_FOLLOW), at this
  // zoom (Focus taps and + / − change it; the tilt goes with it: 3D from TILT_ZOOM)
  const [nativeFollowing, setNativeFollowing] = useState(false);
  const nativeFollowingRef = useRef(false);
  const [followZoom, setFollowZoom] = useState(FOCUS_ZOOM);
  const followZoomRef = useRef(FOCUS_ZOOM);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setNativeFollow = useCallback((on: boolean, zoom?: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    if (zoom != null) {
      followZoomRef.current = zoom;
      setFollowZoom(zoom);
    }
    nativeFollowingRef.current = on;
    setNativeFollowing(on);
  }, []);
  // while a post is open, the map stays put (the photo lands back on its pin)
  const viewingPostRef = useRef(false);
  // the map's own moves (Focus, + / −, the auto-tilt) play out before following takes over again
  const followHeldUntil = useRef(0);
  const holdFollow = useCallback((ms: number) => {
    followHeldUntil.current = Date.now() + ms + 50;
  }, []);
  // Every frame your cloud moves, the map moves with it.
  //  - The notification guide's lock: the map moves and turns (same zoom and tilt), so your cloud stays on its spot
  //    with the pin straight above it; as you get closer the pin comes down toward you, and the arrow shortens.
  //  - Focus on (2D or 3D): you stay in the middle of the screen, the map's zoom, tilt and turn as they are.
  const followGuide = useCallback((me: [number, number]) => {
    const lock = guideLockRef.current;
    if (!lock || !guidingRef.current) {
      if (NATIVE_FOLLOW || focusModeRef.current === 'free' || viewingPostRef.current || Date.now() < followHeldUntil.current) return;
      cameraRef.current?.setCamera({ centerCoordinate: me, animationMode: 'none', animationDuration: 0 });
      return;
    }
    lock.me = me;
    // right by the pin its direction swings about with every step, so the map stops turning there
    const heading = distanceM(me, lock.there) > STEADY_HEADING_M ? bearingDeg(me, lock.there) : lock.heading;
    lock.heading = heading;
    cameraRef.current?.setCamera({
      centerCoordinate: anchoredCenter(me, heading, lock.zoom, lock.pitch, screenRef.current.height),
      zoomLevel: lock.zoom,
      heading,
      pitch: lock.pitch,
      animationMode: 'none',
      animationDuration: 0,
    });
  }, []);
  // Where your cloud is drawn: like a navigation app, it doesn't jump from position to position or wait for the next
  // one; it keeps moving at your speed and direction in between, and eases onto each new position as it comes, so
  // it keeps pace with you whether you walk or drive. It's sent straight to the cloud's marker (not through this
  // screen's state), so the map isn't redrawn every frame.
  const shownRef = useRef<[number, number] | null>(null);
  const shownListeners = useRef(new Set<(at: [number, number]) => void>());
  const subscribeShown = useCallback((fn: (at: [number, number]) => void) => {
    shownListeners.current.add(fn);
    if (shownRef.current) fn(shownRef.current);
    return () => void shownListeners.current.delete(fn);
  }, []);
  // the latest position, when it came, and your velocity (degrees per second) worked out from the one before
  const fixRef = useRef<{ at: [number, number]; t: number; v: [number, number]; ahead: number } | null>(null);
  const glideFrame = useRef(0);
  useEffect(() => {
    if (!userLocation) return;
    const now = Date.now();
    const show = (at: [number, number]) => {
      shownRef.current = at;
      shownListeners.current.forEach((fn) => fn(at));
      followGuide(at);
    };
    const prev = fixRef.current;
    const jumped = !shownRef.current || distanceM(shownRef.current, userLocation) > GLIDE_JUMP_M;
    const dt = prev ? (now - prev.t) / 1000 : 0;
    let v: [number, number] = [0, 0];
    if (prev && !jumped && dt > 0.2 && dt < 5) {
      const raw: [number, number] = [(userLocation[0] - prev.at[0]) / dt, (userLocation[1] - prev.at[1]) / dt];
      // a little smoothing, so one wobbly position doesn't swing the cloud off course
      v = [raw[0] * 0.7 + prev.v[0] * 0.3, raw[1] * 0.7 + prev.v[1] * 0.3];
    }
    // keep going for about as long as positions are taking to come, then wait for the next one
    const ahead = Math.min(GLIDE_AHEAD_MAX_MS, Math.max(1000, (dt || 1) * 1500));
    fixRef.current = { at: userLocation, t: now, v, ahead };
    if (jumped) return void show(userLocation);
    if (glideFrame.current) return; // already running: it picks up the new position
    let last = now;
    const step = () => {
      const fix = fixRef.current;
      const from = shownRef.current;
      if (!fix || !from) return void (glideFrame.current = 0);
      const t = Date.now();
      // where you'd be by now at your speed (or just the latest position, standing still)
      const k = Math.min(t - fix.t, fix.ahead) / 1000;
      const target: [number, number] = [fix.at[0] + fix.v[0] * k, fix.at[1] + fix.v[1] * k];
      // ease the cloud toward it (frame-rate independent)
      const a = 1 - Math.exp(-(t - last) / 1000 / GLIDE_EASE_S);
      last = t;
      const next: [number, number] = [from[0] + (target[0] - from[0]) * a, from[1] + (target[1] - from[1]) * a];
      show(next);
      const settled = distanceM(next, target) < 0.05 && (t - fix.t >= fix.ahead || (fix.v[0] === 0 && fix.v[1] === 0));
      glideFrame.current = settled ? 0 : requestAnimationFrame(step);
    };
    glideFrame.current = requestAnimationFrame(step);
  }, [userLocation, followGuide]);
  useEffect(() => () => cancelAnimationFrame(glideFrame.current), []);
  const pitchRef = useRef(0);
  const [inSpace, setInSpace] = useState(START.zoomLevel < SPACE_ZOOM);

  // A new post: while the edit screen still covers the map, the map jumps so the new pin is at the middle of the
  // screen; then the celebration plays over it (the post shrinks into its pin, its doodles float around). The
  // real pin stays hidden under the celebration's copy until that fades.
  const [celebrating, setCelebrating] = useState<Post | null>(null);
  // moving the map while it plays fades it out early
  const [celebrationLeaving, setCelebrationLeaving] = useState(false);
  const celebratingRef = useRef(false);
  const [hiddenPin, setHiddenPin] = useState<string | null>(null);
  // all posts on the map, for working out where a new one stands alone (the callback below runs before the
  // map's own list has the new post)
  const allPostsRef = useRef<Post[]>([]);
  // the map's latest bounds, zoom and rotation
  const viewRef = useRef<{ bounds: Bounds; zoom: number; heading: number } | null>(null);
  const onPostAdded = useCallback((post: Post) => {
    // someone else's post (a test post added on this phone) just appears; the animation is for posting your own
    if (post.byOthers) return;
    stopFollowing();
    // Centered on the new post, keeping your view: the same tilt (3D stays 3D) and rotation, and the same zoom
    // unless the post would be grouped into a stack there; then the closest zoom where it's its own pin (a quarter
    // level past that whole level, so rounding can't drop back below it). Never further out than LOCATE_ZOOM.
    const current = viewRef.current?.zoom ?? LOCATE_ZOOM;
    const from = Math.max(LOCATE_ZOOM, Math.floor(current));
    const all = [post, ...allPostsRef.current.filter((p) => p.id !== post.id)];
    const solo = buildClusters(all).soloZoom(post.id, screenRef.current, from);
    const zoom = solo === from && current >= LOCATE_ZOOM ? current : solo + 0.25;
    cameraRef.current?.setCamera({
      centerCoordinate: [post.lng, post.lat],
      zoomLevel: zoom,
      animationMode: 'moveTo',
      animationDuration: 0,
    });
    focusModeRef.current = 'free';
    setFocusMode('free');
    setHiddenPin(post.id);
    celebratingRef.current = true;
    setCelebrationLeaving(false);
    setCelebrating(post);
  }, [stopFollowing]);
  const revealPin = useCallback(() => setHiddenPin(null), []);

  const endCelebration = useCallback(() => {
    celebratingRef.current = false;
    setCelebrating(null);
  }, []);
  const posts = usePosts(onPostAdded);
  // your posts first, so a cluster's front photo is one of yours when it has any
  const allPosts = useMemo(() => [...posts, ...SEED_POSTS], [posts]);

  useEffect(() => {
    allPostsRef.current = allPosts;
  }, [allPosts]);
  const clusters = useClusters(allPosts);

  // only what's on screen is rendered as markers
  const [items, setItems] = useState<ShownItem[]>([]);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const lastQueryRef = useRef(0);
  // When a stack splits, remember where each new piece came from (on screen, relative to its own spot), so it
  // can spring out of the "mother" stack.
  const itemsRef = useRef<MapItem[]>([]);
  const updateItems = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    lastQueryRef.current = Date.now();
    const next = clusters.query(view.bounds, view.zoom);
    const prev = itemsRef.current;
    if (prev.length === next.length && prev.every((it, i) => it.key === next[i].key)) return;

    const prevKeys = new Set(prev.map((it) => it.key));
    const stackOf = new Map<string, MapItem>();
    for (const it of prev) if (it.kind === 'cluster') for (const id of it.ids) stackOf.set(id, it);
    // zooming out: pieces that merged into a bigger stack slide into it as ghosts
    const nextKeys = new Set(next.map((it) => it.key));
    const holderOf = new Map<string, MapItem>();
    for (const it of next) for (const id of it.ids) holderOf.set(id, it);
    const merged: Ghost[] = [];
    const gathering = new Set<string>();
    for (const it of prev) {
      if (nextKeys.has(it.key)) continue;
      const stack = holderOf.get(it.ids[0]);
      if (stack && stack.ids.length > it.ids.length) {
        merged.push({
          key: `ghost-${it.key}-${Date.now()}`,
          item: it,
          to: screenOffset(stack.coordinate, it.coordinate, view.zoom, view.heading),
        });
        gathering.add(stack.key);
      }
    }

    const shown: ShownItem[] = next.map((it) => {
      if (gathering.has(it.key) && !prevKeys.has(it.key)) return { ...it, gathered: true };
      const mother = prevKeys.has(it.key) ? undefined : stackOf.get(it.ids[0]);
      return mother && mother.ids.length > it.ids.length
        ? { ...it, splitFrom: screenOffset(mother.coordinate, it.coordinate, view.zoom, view.heading) }
        : it;
    });
    itemsRef.current = next;
    setItems(shown);
    if (merged.length) {
      setGhosts((g) => [...g, ...merged]);
      const keys = new Set(merged.map((m) => m.key));
      setTimeout(() => setGhosts((g) => g.filter((m) => !keys.has(m.key))), MERGE_OUT_MS);
    }
  }, [clusters]);
  useEffect(updateItems, [updateItems]);

  // While a post is open, everything the app draws over the map is hidden (buttons, pins, location dot,
  // compass): only the map itself shows through the overlay's paper. It all comes back when the map is in
  // front again.
  const [viewingPost, setViewingPost] = useState(false);
  useEffect(() => {
    viewingPostRef.current = viewingPost;
  }, [viewingPost]);
  useFocusEffect(
    useCallback(() => {
      setViewingPost(false);
    }, []),
  );
  // the post view grows the photo out of its pin, so it's told where the pin's photo is on screen (the marker's
  // anchor is the photo's bottom edge, so its center is half a photo above the point)
  const showPost = useCallback(async (id: string, coordinate: [number, number]) => {
    const point = await mapRef.current?.getPointInView(coordinate);
    setViewingPost(true);
    router.push({
      pathname: '/post/[id]',
      params: point ? { id, x: String(point[0]), y: String(point[1] - PIN_HEIGHT / 2) } : { id },
    });
  }, []);
  // the post is landing back in its pin: show the pins again underneath
  useEffect(() => onPostViewClosing(() => setViewingPost(false)), []);

  const openCluster = useCallback(
    (cluster: Extract<MapItem, { kind: 'cluster' }>) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopFollowing();
      const zoom = clusters.splitZoom(cluster, screen);
      if (zoom > CLUSTER_MAX_ZOOM) {
        // posts at the exact same spot never separate; just open the front one
        showPost(cluster.front.id, cluster.coordinate);
        return;
      }
      // half a level past where it splits leaves breathing room between the pins
      cameraRef.current?.setCamera({
        centerCoordinate: cluster.coordinate,
        zoomLevel: zoom + 0.5,
        animationMode: 'flyTo',
        animationDuration: 900,
      });
    },
    [clusters, showPost, screen, stopFollowing],
  );

  const openPost = useCallback(
    (post: Post) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      stopFollowing();
      showPost(post.id, [post.lng, post.lat]);
    },
    [showPost, stopFollowing],
  );

  const setMode = useCallback(
    (mode: FocusMode) => {
      focusModeRef.current = mode;
      setFocusMode(mode);
      if (mode === 'free') setNativeFollow(false);
    },
    [setNativeFollow],
  );

  // The native splash hides right away; the doodle loader covers the map until its style has loaded, then fades.
  const [mapReady, setMapReady] = useState(false);
  // two-finger tilting only works in the 3D range
  const [canTilt, setCanTilt] = useState(false);
  useEffect(() => {
    SplashScreen.hideAsync();
    // fallback, so the loader can't stay up forever (e.g. offline)
    const fallback = setTimeout(() => setMapReady(true), 8000);
    // show the location dot right away if permission was granted before; don't prompt until Focus is tapped
    Location.getForegroundPermissionsAsync().then((p) => setShowPuck(p.granted));
    return () => clearTimeout(fallback);
  }, []);

  const onCameraChanged = useCallback(
    (state: MapState) => {
      pitchRef.current = state.properties.pitch;
      setCanTilt(state.properties.zoom >= TILT_ZOOM);
      setInSpace(state.properties.zoom < SPACE_ZOOM);
      if (state.gestures.isGestureActive && focusModeRef.current !== 'free') setMode('free');
      if (state.gestures.isGestureActive && guidingRef.current) {
        guidingRef.current = false;
        guideLockRef.current = null;
        setGuideLeaving(true);
      }
      // while locked, the arrow's tip follows the pin (the arrow shortens as you get closer)
      const lock = guideLockRef.current;
      if (lock && guidingRef.current) {
        mapRef.current?.getPointInView(lock.there).then((b) => {
          if (!b || !guideLockRef.current) return;
          setGuide((g) => (g ? { ...g, to: { x: b[0], y: Math.min(b[1] + GUIDE_GAP, g.from.y - GUIDE_MIN_ARROW) } } : g));
        });
      }
      if (state.gestures.isGestureActive && celebratingRef.current) {
        celebratingRef.current = false;
        setCelebrationLeaving(true);
      }
      viewRef.current = {
        bounds: state.properties.bounds,
        zoom: state.properties.zoom,
        heading: state.properties.heading,
      };
      if (Date.now() - lastQueryRef.current > CLUSTER_THROTTLE_MS) updateItems();
      // the map can keep moving for a long while (following you as you walk), so the trees catch up as it goes
      if (Date.now() - lastAreasRef.current > AREAS_THROTTLE_MS) refreshAreas(state.properties);
    },
    [setMode, updateItems, refreshAreas],
  );

  const onMapIdle = useCallback(
    (state: MapState) => {
      viewRef.current = {
        bounds: state.properties.bounds,
        zoom: state.properties.zoom,
        heading: state.properties.heading,
      };
      updateItems();
      refreshAreas(state.properties);
      // once the map settles (after a pinch, a + / − tap or a fly-to), tilt or flatten for its zoom
      // (no auto-tilt while the posting animation plays: it's laid out for the flat, centered map)
      if (celebratingRef.current || guidingRef.current) return;
      const want = state.properties.zoom >= TILT_ZOOM ? TILT_PITCH : 0;
      if (Math.abs(state.properties.pitch - want) > 5) {
        holdFollow(500);
        cameraRef.current?.setCamera({ pitch: want, animationMode: 'easeTo', animationDuration: 500 });
      }
    },
    [updateItems, holdFollow, refreshAreas],
  );

  // waits for the map and your location, then lines them up and draws the arrow (see `guide` above)
  useEffect(() => {
    if (!guideAsked || !mapReady) return;
    let cancelled = false;
    (async () => {
      // the notification opens whim onto the map: whatever was on top (a post, the camera, settings) closes first
      if (router.canDismiss()) {
        router.dismissAll();
        await new Promise((r) => setTimeout(r, 450));
        if (cancelled) return;
      }
      setGuideLeaving(false);
      setShowPuck(true);
      const me = shownRef.current ?? userLocation ?? (await getCurrentLngLat());
      const others = allPostsRef.current.filter((p) => !isOwnPost(p));
      if (!me || !others.length || cancelled) return;
      const target = others.reduce((a, b) => (distanceM(me, [a.lng, a.lat]) <= distanceM(me, [b.lng, b.lat]) ? a : b));
      const there: [number, number] = [target.lng, target.lat];
      // You toward the bottom (just above the capture button), it toward the top, in one move: the turn, tilt,
      // zoom and position are all worked out up front (see guideCamera) and the map eases there in one go.
      const { height: H } = screenRef.current;
      const heading = bearingDeg(me, there);
      const view = guideCamera(me, there, H);
      guidingRef.current = true;
      setMode('free');
      cameraRef.current?.setCamera({
        // your cloud on its spot from the start (with the zoom capped, a close pin then sits lower than its spot)
        centerCoordinate: anchoredCenter(me, heading, view.zoom, view.pitch, H),
        zoomLevel: view.zoom,
        heading,
        pitch: view.pitch,
        animationMode: 'easeTo',
        animationDuration: GUIDE_TURN_MS,
      });
      await new Promise((r) => setTimeout(r, GUIDE_TURN_MS + 80));
      const [a, b] = await Promise.all([mapRef.current?.getPointInView(me), mapRef.current?.getPointInView(there)]);
      if (cancelled || !a || !b) return void (guidingRef.current = false);
      // from just above your cloud to just under the pin's photo (its bottom edge is on the post); from here on the
      // map keeps both on these spots as you move, so the arrow stays put
      guideLockRef.current = { there, pitch: view.pitch, zoom: view.zoom, me, heading };
      setGuide({ from: { x: a[0], y: a[1] - USER_CLOUD_HEIGHT - GUIDE_GAP }, to: { x: b[0], y: b[1] + GUIDE_GAP } });
    })();
    return () => {
      cancelled = true;
    };
    // runs once per tap (guideAsked), when the map is ready
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideAsked, mapReady]);


  const zoomBy = useCallback(async (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    stopFollowing();
    // following you: the follow camera zooms (and tilts, from TILT_ZOOM)
    if (nativeFollowingRef.current) {
      const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, followZoomRef.current + delta));
      setNativeFollow(true, zoom);
      setMode(zoom >= TILT_ZOOM ? 'tilted' : 'located');
      return;
    }
    const zoom = await mapRef.current?.getZoom();
    if (zoom == null) return;
    holdFollow(300);
    cameraRef.current?.zoomTo(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta)), 300);
  }, [stopFollowing, holdFollow, setNativeFollow, setMode]);

  // Focus: tap 1 centers on you (flat), tap 2 zooms in close (zoom 17, so it tilts to 3D), tap 3 goes back.
  const onFocus = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopFollowing();
    const mode = focusModeRef.current;
    // (centered on where your cloud is right now, as following keeps it)
    const center = shownRef.current ? { centerCoordinate: shownRef.current } : {};
    if (nativeFollowingRef.current && mode !== 'free') {
      // the follow camera does the zoom and tilt
      const zoom = mode === 'located' ? CLOSE_ZOOM : FOCUS_ZOOM;
      setNativeFollow(true, zoom);
      setMode(mode === 'located' ? 'tilted' : 'located');
      return;
    }
    if (mode === 'located') {
      holdFollow(900);
      cameraRef.current?.setCamera({ ...center, zoomLevel: CLOSE_ZOOM, pitch: TILT_PITCH, animationMode: 'easeTo', animationDuration: 900 });
      setMode('tilted');
      return;
    }
    if (mode === 'tilted') {
      holdFollow(900);
      cameraRef.current?.setCamera({ ...center, zoomLevel: FOCUS_ZOOM, pitch: 0, animationMode: 'easeTo', animationDuration: 900 });
      setMode('located');
      return;
    }
    // where the map last saw you (it keeps tracking you), so it responds at once; otherwise, find you
    const here = shownRef.current ?? userLocationRef.current ?? (await getCurrentLngLat());
    if (!here) return;
    setShowPuck(true);
    const zoom = (await mapRef.current?.getZoom()) ?? 0;
    const target = Math.max(zoom, FOCUS_ZOOM);
    const duration = zoom < 8 ? 2500 : 1200;
    holdFollow(duration);
    cameraRef.current?.setCamera({
      centerCoordinate: here,
      zoomLevel: target,
      pitch: target >= TILT_ZOOM ? TILT_PITCH : 0,
      animationMode: 'flyTo',
      animationDuration: duration,
    });
    setMode(target >= TILT_ZOOM ? 'tilted' : 'located');
    // once there, the map's own follow camera takes over (unless you've moved the map meanwhile)
    if (NATIVE_FOLLOW) {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => {
        if (focusModeRef.current !== 'free') setNativeFollow(true, target);
      }, duration + 50);
    }
  }, [setMode, stopFollowing, holdFollow, setNativeFollow]);

  const openProfile = useCallback(() => {
    Haptics.selectionAsync();
    router.push('/settings');
  }, []);

  const openCamera = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/camera');
  }, []);

  const controls = useMapControlsLayout();

  return (
    <View style={styles.root}>
      <StatusBar style={inSpace ? 'light' : 'dark'} />
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        styleURL={MAP_STYLE_URL}
        projection="globe"
        onCameraChanged={onCameraChanged}
        onMapIdle={onMapIdle}
        // Having an onPress makes the map leave taps on pins and stacks to them; without it the map's own tap
        // recognizer competes for them and the first tap on a post gets swallowed.
        onPress={ignoreMapTap}
        scaleBarEnabled={false}
        pitchEnabled={canTilt}
        // you can tilt the map yourself, but no further than the automatic tilt
        maxPitch={TILT_PITCH}
        compassEnabled={!viewingPost && !celebrating}
        compassImage={compassReady ? 'compass' : undefined}
        onDidFinishLoadingStyle={() => {
          setMapReady(true);
          setTimeout(() => setCompassReady(true), 300);
        }}
        compassFadeWhenNorth
        // the needle 24pt from the left edge, centered level with the pfp button (margins are from the safe area)
        compassPosition={{ top: PROFILE_TOP + PROFILE_SIZE / 2 - COMPASS_BOX / 2, left: EDGE - (COMPASS_BOX - COMPASS_NEEDLE_WIDTH) / 2 }}
        // hidden for private previews only: Mapbox's terms require the logo + attribution in a released app
        logoEnabled={false}
        attributionEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={START}
          minZoomLevel={MIN_ZOOM}
          maxZoomLevel={MAX_ZOOM}
          // (paused while a post is open, so its pin stays where the photo lands back)
          followUserLocation={nativeFollowing && !viewingPost}
          // (the library's UserTrackingMode.Follow; not imported, as the web build doesn't have it)
          followUserMode={'normal' as never}
          followZoomLevel={followZoom}
          followPitch={followZoom >= TILT_ZOOM ? TILT_PITCH : 0}
        />
        {NATIVE_FOLLOW && showPuck && (
          <LocationPuck topImage={BLANK_PUCK} bearingImage={BLANK_PUCK} shadowImage={BLANK_PUCK} puckBearingEnabled={false} pulsing={{ isEnabled: false }} />
        )}
        {showPuck && userLocation && !viewingPost && !nativeFollowing && <GlidingUserMarker subscribe={subscribeShown} />}
        {/* the basemap flattened to one canvas color (theme 'custom' isn't in the library's types yet) */}
        <StyleImport id="basemap" existing config={STANDARD_CONFIG as never} />
        {/* the globe floats in dark, starry space; zoomed in, the horizon fades into the canvas */}
        <Atmosphere
          style={{
            color: PAPER,
            highColor: '#6b6058',
            spaceColor: SPACE,
            // just a hint of glow, so the globe's edge isn't razor sharp against space
            horizonBlend: 0.012,
            starIntensity: ['interpolate', ['linear'], ['zoom'], 2, 0.25, 5, 0],
            range: [0.8, 8],
          }}
        />
        <Images images={MAP_IMAGES} />
        <CanvasLayers />
        <AreaDoodles shape={areaShape} />
        <LandmarkLayer />
        {!viewingPost &&
          items.map((item) =>
            item.kind === 'post' ? (
              item.post.id === hiddenPin ? null : (
                <MarkerView
                  key={item.key}
                  coordinate={[item.post.lng, item.post.lat]}
                  anchor={PIN_ANCHOR}
                  allowOverlap
                  allowOverlapWithPuck
                >
                  <SplitIn from={item.splitFrom}>
                    <PostPin post={item.post} onPress={openPost} />
                  </SplitIn>
                </MarkerView>
              )
            ) : (
              <MarkerView key={item.key} coordinate={item.coordinate} anchor={PIN_ANCHOR} allowOverlap allowOverlapWithPuck>
                {item.gathered ? (
                  <GatherIn>
                    <ClusterPin cluster={item} onPress={openCluster} />
                  </GatherIn>
                ) : (
                  <SplitIn from={item.splitFrom}>
                    <ClusterPin cluster={item} onPress={openCluster} />
                  </SplitIn>
                )}
              </MarkerView>
            ),
          )}
        {!viewingPost &&
          ghosts.map(({ key, item, to }) => (
            <MarkerView key={key} coordinate={item.coordinate} anchor={PIN_ANCHOR} allowOverlap allowOverlapWithPuck>
              <MergeOut to={to}>
                {item.kind === 'post' ? (
                  <PostPin post={item.post} onPress={openPost} />
                ) : (
                  <ClusterPin cluster={item} onPress={openCluster} />
                )}
              </MergeOut>
            </MarkerView>
          ))}
      </MapView>
      {/* following you (phone): the follow camera keeps you at the middle of the screen, so your cloud (the same one,
          tap it for "You") stands there while the map moves under it */}
      {nativeFollowing && !viewingPost && showPuck && (
        <View
          pointerEvents="box-none"
          style={[styles.followedCloud, { left: screen.width / 2 - USER_CLOUD_WIDTH / 2, top: screen.height / 2 - USER_CLOUD_HEIGHT }]}
        >
          <UserMarker />
        </View>
      )}

      {!mapReady && (
        <Animated.View exiting={FadeOut.duration(350)} style={[StyleSheet.absoluteFill, styles.loader]} pointerEvents="none">
          <DoodleLoader size={72} />
        </Animated.View>
      )}

      {guide && <GuideArrow from={guide.from} to={guide.to} onDone={endGuide} leaving={guideLeaving} />}

      {celebrating && (
        <PostedCelebration
          key={celebrating.id}
          post={celebrating}
          onReveal={revealPin}
          onDone={endCelebration}
          leaving={celebrationLeaving}
        />
      )}

      {!viewingPost && !celebrating && (
        // fades back in when the map is in front again
        <Animated.View entering={FadeIn.duration(300)} style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            onPress={openProfile}
            hitSlop={4}
            accessibilityRole="button"
            accessibilityLabel="Profile and settings"
            style={({ pressed }) => [
              styles.abs,
              styles.profile,
              { top: insets.top + PROFILE_TOP, right: PROFILE_RIGHT },
              pressed && styles.pressed,
            ]}
          >
            <DoodleIcon name="avatar" size={PROFILE_SIZE} />
          </Pressable>

          <CircleButton
            size={CONTROL_SIZE}
            onPress={onFocus}
            accessibilityLabel="Show my location"
            style={[styles.abs, { right: CONTROL_RIGHT, bottom: controls.focus }]}
          >
            <DoodleIcon name="focus" size={BAR_ICON} color={focusMode === 'free' ? ICON_COLOR : FOCUS_ACTIVE} />
          </CircleButton>
          <CircleButton
            size={CONTROL_SIZE}
            onPress={() => zoomBy(1)}
            accessibilityLabel="Zoom in"
            style={[styles.abs, { right: CONTROL_RIGHT, bottom: controls.zoomIn }]}
          >
            <DoodleIcon name="plus" size={20} />
          </CircleButton>
          <CircleButton
            size={CONTROL_SIZE}
            onPress={() => zoomBy(-1)}
            accessibilityLabel="Zoom out"
            style={[styles.abs, { right: CONTROL_RIGHT, bottom: controls.zoomOut }]}
          >
            <DoodleIcon name="minus" size={20} />
          </CircleButton>

          <ShutterButton variant="map" onPress={openCamera} accessibilityLabel="New post" />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  followedCloud: { position: 'absolute', width: USER_CLOUD_WIDTH, height: USER_CLOUD_HEIGHT },
  root: { flex: 1, backgroundColor: '#0d0d0f' },
  abs: { position: 'absolute' },
  // the loader sits on the map's water color, so the map appears under it seamlessly
  loader: { backgroundColor: WATER, alignItems: 'center', justifyContent: 'center' },
  profile: { borderRadius: PROFILE_SIZE / 2, boxShadow: BUTTON_SHADOW },
  pressed: { transform: [{ scale: 0.92 }] },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
  },
});
