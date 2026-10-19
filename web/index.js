// Skia (the drawing library) runs on a WebAssembly engine in the browser, which has to be downloaded before
// anything draws, so the app only starts once it's loaded.
import '@expo/metro-runtime';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(() => {
  require('./src/web/alerts');
  require('expo-router/entry');
});
