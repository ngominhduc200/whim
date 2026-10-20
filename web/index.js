// Skia (the drawing library) runs on a WebAssembly engine in the browser, which has to be downloaded before
// anything draws, so the app only starts once it's loaded.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// The page itself never scrolls (whim lays out its own screens): otherwise a phone browser scrolls it when the
// keyboard opens, pulling hidden panels into view.
const lock = document.createElement('style');
lock.textContent = 'html, body { height: 100%; overflow: hidden; overscroll-behavior: none; } body { position: fixed; inset: 0; }';
document.head.appendChild(lock);

// Inside the desktop page's phone frame, location goes through the page around it (same site): Safari is
// stricter about location in a framed page, even when the site is allowed, but not for the page itself.
if (window.self !== window.top) {
  try {
    const outer = window.parent.navigator.geolocation;
    if (outer) Object.defineProperty(navigator, 'geolocation', { configurable: true, get: () => outer });
  } catch {
    // not reachable: keep the frame's own
  }
}

// On a phone, iOS shifts the whole page up when the keyboard opens; that shift is undone here, so the screen
// stays put and only the text sheet rides up on the keyboard (see the web TextComposer).
if (window.self === window.top && window.visualViewport) {
  const vv = window.visualViewport;
  const follow = () => {
    const root = document.getElementById('root');
    if (root) root.style.transform = vv.offsetTop > 0 ? `translateY(${vv.offsetTop}px)` : '';
  };
  vv.addEventListener('scroll', follow);
  vv.addEventListener('resize', follow);
}

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  require('./src/web/alerts');
  require('expo-router/entry');
});
