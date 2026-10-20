// Skia (the drawing library) runs on a WebAssembly engine in the browser, which has to be downloaded before
// anything draws, so the app only starts once it's loaded.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

// The page itself never scrolls (whim lays out its own screens): otherwise a phone browser scrolls it when the
// keyboard opens, pulling hidden panels into view.
const lock = document.createElement('style');
lock.textContent = 'html, body { height: 100%; overflow: hidden; overscroll-behavior: none; } body { position: fixed; inset: 0; }';
document.head.appendChild(lock);

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  require('./src/web/alerts');
  require('expo-router/entry');
});
