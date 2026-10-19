// whim on the web reuses the phone app's code (../app/src) as is, without touching it:
//  - `@/…` imports resolve to a web version in src/overrides when there is one, otherwise to the app's file
//    (`@/assets/…` to the app's assets);
//  - every package import, including those made from the app's files, resolves from this project's node_modules,
//    so there's one React (and the web builds of everything).
const fs = require('fs');
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const WEB = __dirname;
const APP = path.resolve(WEB, '../app');
const OVERRIDES = path.join(WEB, 'src/overrides');
const APP_SRC = path.join(APP, 'src') + path.sep;
// packages swapped for a web version of our own (the override itself still gets the real one)
const PACKAGE_OVERRIDES = {
  '@rnmapbox/maps': path.join(OVERRIDES, 'rnmapbox.tsx'),
  'expo-location': path.join(OVERRIDES, 'packages/expo-location.ts'),
  'expo-symbols': path.join(OVERRIDES, 'packages/expo-symbols.tsx'),
};

const config = getDefaultConfig(WEB);
config.watchFolders = [APP];

const fromWeb = path.join(WEB, 'index.js');
config.resolver.resolveRequest = (context, name, platform) => {
  if (name.startsWith('@/')) {
    const rest = name.slice(2);
    // `@/web/…`: web-only code in this project (src/web)
    const candidates = rest.startsWith('assets/')
      ? [path.join(APP, rest)]
      : rest.startsWith('web/')
        ? [path.join(WEB, 'src', rest)]
        : [path.join(OVERRIDES, rest), path.join(APP, 'src', rest)];
    for (const candidate of candidates) {
      try {
        return context.resolveRequest(context, candidate, platform);
      } catch {}
    }
  }
  const override = PACKAGE_OVERRIDES[name];
  if (override && context.originModulePath !== override) return context.resolveRequest(context, override, platform);
  // packages imported from the app's files come from here, not ../app/node_modules
  if (context.originModulePath.startsWith(APP + path.sep) && !name.startsWith('.') && !path.isAbsolute(name)) {
    return context.resolveRequest({ ...context, originModulePath: fromWeb }, name, platform);
  }
  const resolved = context.resolveRequest(context, name, platform);
  // the app's files also import each other by relative path (`./posts`): those get the web version too, so the
  // whole app shares one copy of each module
  if (resolved.type === 'sourceFile' && resolved.filePath.startsWith(APP_SRC)) {
    const rel = path.relative(APP_SRC, resolved.filePath).replace(/\.(tsx?|jsx?)$/, '');
    for (const ext of ['.ts', '.tsx']) {
      const candidate = path.join(OVERRIDES, rel + ext);
      if (candidate !== context.originModulePath && fs.existsSync(candidate)) return { type: 'sourceFile', filePath: candidate };
    }
  }
  return resolved;
};

module.exports = config;
