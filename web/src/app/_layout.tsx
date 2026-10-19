// whim on the web. On a wide screen: a landing page with the app running inside a phone-shaped frame (the app icon on
// the left and the name on the right, which drop away as the window narrows). Inside that frame, and on a phone's
// own browser, it's simply the app.
import { useEffect, useState } from 'react';
import { Image, Text as RNText, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import AppLayout from '@/app/_layout';
import { FONTS, useAppFonts } from '@/components/Text';
import { INK } from '@/lib/colors';
import { NotificationBanner } from '@/web/NotificationBanner';

// an iPhone 15's screen, in points
const SCREEN_W = 393;
const SCREEN_H = 852;
// around it, just an ink outline (no phone bezel), the same 4pt as the app icon's at any window size
const BORDER = 4;
const RADIUS = 52;
// iPhone safe areas (the status bar with the Dynamic Island, and the home indicator)
const PHONE_INSETS = { top: 54, bottom: 34, left: 0, right: 0 };
// below this width there's no room for the frame (a phone's browser, or a narrow window): just the app, full bleed
const PHONE_BROWSER = 700;
// below this width the icon and name drop away, leaving the phone
const SIDES_FROM = 1000;
const BG = '#FDF2E1';
// the warm brown of the app icon's and the screen's outlines, and the name
const OUTLINE = '#72625A';

const embedded = typeof window !== 'undefined' && (window.self !== window.top || new URLSearchParams(window.location.search).has('app'));

export default function WebRoot() {
  const { width } = useWindowDimensions();
  if (embedded) {
    // inside the frame: the app, laid out around the frame's status bar and home indicator
    return (
      <SafeAreaInsetsContext.Provider value={PHONE_INSETS}>
        <AppLayout />
        <NotificationBanner />
      </SafeAreaInsetsContext.Provider>
    );
  }
  if (width < PHONE_BROWSER) {
    return (
      <>
        <AppLayout />
        <NotificationBanner />
      </>
    );
  }
  return <Landing />;
}

function Landing() {
  const { width, height } = useWindowDimensions();
  const fonts = useAppFonts();
  // the screen shrinks to fit a short window; the outline around it stays 4pt
  const scale = Math.min(1, (height - 48 - 2 * BORDER) / SCREEN_H);
  const sides = width >= SIDES_FROM;
  // the icon and the name grow and shrink with the window (full size from ~1500pt wide)
  const side = Math.min(1, Math.max(0.6, width / 1500));
  const iconSize = Math.round(180 * side);
  // (Gaegu draws small for its size; the app's Text scales it up by 1.15, so the same here)
  const wordSize = Math.round(76 * 1.15 * side);
  const appUrl = `${window.location.pathname}?app=1`;
  return (
    <View style={styles.page}>
      {/* the painted lake behind it all (public/web-background.jpg, a web-sized copy of web-background.png) */}
      <Image source={{ uri: '/web-background.jpg' }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      {sides && (
        <View style={styles.side}>
          <Image source={require('@/assets/images/app-icon.png')} style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: Math.round(40 * side) }]} accessibilityLabel="whim" />
        </View>
      )}
      <View style={[styles.frame, { width: SCREEN_W * scale + 2 * BORDER, height: SCREEN_H * scale + 2 * BORDER, borderRadius: RADIUS * scale + BORDER }]}>
        <View style={[styles.screen, { transform: [{ scale }] }]}>
          <iframe src={appUrl} title="whim" allow="camera; geolocation" style={iframeStyle} />
          <StatusBar />
        </View>
      </View>
      {sides && (
        <View style={styles.side}>{fonts ? <RNText style={[styles.wordmark, { fontSize: wordSize }]}>whim</RNText> : null}</View>
      )}
    </View>
  );
}

/** The phone's status bar over the app: the time, the Dynamic Island, signal, wifi and battery. */
function StatusBar() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);
  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
  return (
    <View style={styles.statusBar} pointerEvents="none">
      <View style={styles.statusSide}>
        <span style={timeStyle}>{time}</span>
      </View>
      <View style={styles.island} />
      <View style={styles.statusSide}>
        <svg width="68" height="13" viewBox="0 0 68 13" aria-hidden>
          {/* signal */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 5} y={9 - i * 3} width="3.4" height={4 + i * 3} rx="1" fill={INK} />
          ))}
          {/* wifi */}
          <path d="M31 4.2a9 9 0 0 1 12 0M33.2 6.6a5.8 5.8 0 0 1 7.6 0M35.4 9a2.6 2.6 0 0 1 3.2 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* battery */}
          <rect x="47.5" y="1.5" width="17" height="10" rx="3" stroke={INK} strokeOpacity="0.4" fill="none" />
          <rect x="49.2" y="3.2" width="12" height="6.6" rx="1.6" fill={INK} />
          <rect x="65.5" y="4.6" width="1.6" height="3.8" rx="0.8" fill={INK} fillOpacity="0.45" />
        </svg>
      </View>
    </View>
  );
}

const iframeStyle = { border: 0, width: SCREEN_W, height: SCREEN_H, display: 'block' as const };
const timeStyle = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontWeight: 600, fontSize: 16, color: INK };

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: BG, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { borderWidth: BORDER, borderColor: OUTLINE },
  wordmark: { color: OUTLINE, fontFamily: FONTS.regular },
  // the outline's color behind the app too, so no light sliver shows where the screen meets the outline
  frame: { borderWidth: BORDER, borderColor: OUTLINE, overflow: 'hidden', backgroundColor: OUTLINE },
  screen: { width: SCREEN_W, height: SCREEN_H, transformOrigin: 'top left', borderRadius: RADIUS, overflow: 'hidden', backgroundColor: OUTLINE },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: PHONE_INSETS.top,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusSide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 4 },
  island: { width: 124, height: 36, borderRadius: 18, backgroundColor: INK, marginTop: 4 },
});
