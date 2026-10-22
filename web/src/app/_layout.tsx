// whim on the web. On a wide screen: a landing page with the app running inside a phone-shaped frame over a street
// photo, with "whim" to its left and "reimagine · your world" to its right (they drop away as the window narrows).
// Inside that frame, and on a phone's own browser, it's simply the app.
import { useEffect, useState } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Analytics } from '@vercel/analytics/react';

import AppLayout from '@/app/_layout';
import { INK } from '@/lib/colors';
import { NotificationBanner } from '@/web/NotificationBanner';

// an iPhone 15's screen, in points
const SCREEN_W = 393;
const SCREEN_H = 852;
// around it, just a see-through ink outline (no phone bezel), 5pt at any window size
const BORDER = 5;
const RADIUS = 52;
// iPhone safe areas (the status bar with the Dynamic Island, and the home indicator)
const PHONE_INSETS = { top: 54, bottom: 34, left: 0, right: 0 };
// below this width there's no room for the frame (a phone's browser, or a narrow window): just the app, full bleed
const PHONE_BROWSER = 700;
// below this width the words drop away, leaving the phone
const SIDES_FROM = 1000;
const BG = '#FDF2E1';
// bump when public/web-background.jpg is replaced, so browsers load the new photo instead of a cached one
const BG_VERSION = 2;
// the screen's outline: black at 35%, so the photo shows through it
const OUTLINE = 'rgba(0, 0, 0, 0.35)';
// the words beside the phone: Fragment Mono (Google Fonts), white over the photo; 18px in a window WORDS_FULL_AT wide
// or wider, shrinking with the window below that (about 11px by the time they drop away, at SIDES_FROM)
const WORDS_FONT = '"Fragment Mono", ui-monospace, monospace';
const WORDS_SIZE = 18;
const WORDS_FULL_AT = 1600;

// Fragment Mono, from Google Fonts (the landing page only; the app inside the frame uses Gaegu)
function useWordsFont() {
  useEffect(() => {
    if (document.getElementById('fragment-mono')) return;
    const add = (attrs: Record<string, string>) => {
      const link = document.createElement('link');
      for (const [k, v] of Object.entries(attrs)) link.setAttribute(k, v);
      document.head.appendChild(link);
    };
    add({ rel: 'preconnect', href: 'https://fonts.googleapis.com' });
    add({ rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' });
    add({ id: 'fragment-mono', rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Fragment+Mono:ital@0;1&display=swap' });
  }, []);
}

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
  // Vercel Analytics counts visits on the page itself only, not again for the app inside the phone frame
  if (width < PHONE_BROWSER) {
    return (
      <>
        <AppLayout />
        <NotificationBanner />
        <Analytics />
      </>
    );
  }
  return (
    <>
      <Landing />
      <Analytics />
    </>
  );
}

function Landing() {
  const { width, height } = useWindowDimensions();
  useWordsFont();
  // the screen shrinks to fit a short window; the outline around it stays 4pt
  const scale = Math.min(1, (height - 48 - 2 * BORDER) / SCREEN_H);
  const sides = width >= SIDES_FROM;
  const words = { ...wordsStyle, fontSize: Math.round(WORDS_SIZE * Math.min(1, width / WORDS_FULL_AT) * 10) / 10 };
  const appUrl = `${window.location.pathname}?app=1`;
  return (
    <View style={styles.page}>
      {/* the street photo behind it all (public/web-background.jpg, a web-sized copy of web-background.png) */}
      <Image source={{ uri: `/web-background.jpg?v=${BG_VERSION}` }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      {/* left: "whim", centered between the window's edge and the phone */}
      {sides && (
        <View style={styles.side}>
          <span style={words}>whim</span>
        </View>
      )}
      <View style={[styles.frame, { width: SCREEN_W * scale + 2 * BORDER, height: SCREEN_H * scale + 2 * BORDER, borderRadius: RADIUS * scale + BORDER }]}>
        <View style={[styles.screen, { transform: [{ scale }] }]}>
          <iframe src={appUrl} title="whim" allow="camera; geolocation" style={iframeStyle} />
          <StatusBar />
        </View>
      </View>
      {/* right: "reimagine" and "your world", with the same space between the phone, each, and the window's edge */}
      {sides && (
        <View style={[styles.side, styles.rightSide]}>
          <span style={words}>reimagine</span>
          <span style={words}>your world</span>
        </View>
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
        <svg width="65" height="13" viewBox="0 0 65 13" aria-hidden>
          {/* signal */}
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={i * 5} y={9 - i * 3} width="3.4" height={4 + i * 3} rx="1" fill={INK} />
          ))}
          {/* wifi */}
          {/* wifi and battery shifted so the three sit an even 6pt apart */}
          <path transform="translate(-5.7 0)" d="M31 4.2a9 9 0 0 1 12 0M33.2 6.6a5.8 5.8 0 0 1 7.6 0M35.4 9a2.6 2.6 0 0 1 3.2 0" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          {/* battery */}
          <rect x="44.7" y="1.5" width="17" height="10" rx="3" stroke={INK} strokeOpacity="0.4" fill="none" />
          <rect x="46.4" y="3.2" width="12" height="6.6" rx="1.6" fill={INK} />
          <rect x="62.7" y="4.6" width="1.6" height="3.8" rx="0.8" fill={INK} fillOpacity="0.45" />
        </svg>
      </View>
    </View>
  );
}

const iframeStyle = { border: 0, width: SCREEN_W, height: SCREEN_H, display: 'block' as const };
const wordsStyle = { fontFamily: WORDS_FONT, color: '#fff', whiteSpace: 'nowrap' as const };
const timeStyle = { fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif', fontWeight: 600, fontSize: 16, color: INK };

const styles = StyleSheet.create({
  page: { flex: 1, minHeight: '100%', backgroundColor: BG, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  side: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  rightSide: { flexDirection: 'row', justifyContent: 'space-evenly' },
  // (nothing filled behind the see-through outline, so it stays see-through)
  frame: { borderWidth: BORDER, borderColor: OUTLINE, overflow: 'hidden' },
  screen: { width: SCREEN_W, height: SCREEN_H, transformOrigin: 'top left', borderRadius: RADIUS, overflow: 'hidden' },
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
