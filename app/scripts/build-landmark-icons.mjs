// Rasterizes the doodle SVG icons to @3x PNGs that Mapbox can draw as symbol images.
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ICONS } from './landmark-icons.mjs';
import PALETTE from '../src/lib/palette.json' with { type: 'json' };

const SCALE = 3;
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'landmarks');
mkdirSync(outDir, { recursive: true });

// Hand-drawn look: a little turbulence displaces every edge, so straight sides and sharp corners waver like
// a pen line (the same "wobble" filter the old web map used). The canvas is padded so nothing gets clipped.
const PAD = 3;
const handDrawn = (svg, seed = 4) => {
  const [, w, h] = svg.match(/width="([\d.]+)" height="([\d.]+)"/).map(Number);
  const [vx, vy, vw, vh] = svg
    .match(/viewBox="([^"]+)"/)[1]
    .split(/\s+/)
    .map(Number);
  const k = w / vw;
  return svg
    .replace(/width="[\d.]+" height="[\d.]+"/, `width="${(vw + 2 * PAD) * k}" height="${(vh + 2 * PAD) * (h / vh)}"`)
    .replace(/viewBox="[^"]+"/, `viewBox="${vx - PAD} ${vy - PAD} ${vw + 2 * PAD} ${vh + 2 * PAD}"`)
    .replace(
      /(<svg[^>]*>)/,
      `$1<defs><filter id="hand" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="${seed}" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs><g filter="url(#hand)">`,
    )
    .replace(/<\/svg>\s*$/, '</g></svg>');
};

let iconSeed = 1;
for (const [name, svg] of Object.entries(ICONS)) {
  // root `style` holds the fill/stroke the icon inherits; CSS transforms (the plane's rotation) are applied by Mapbox instead.
  // Tinted to the map palette: black ink -> palette ink, white insides -> the land color. Icons with no
  // explicit fill default to ink via the root fill attribute.
  const src = svg
    .replace(/transform:rotate\([^)]*\)/, '')
    .replaceAll('#000', PALETTE.ink)
    .replaceAll('#fff', PALETTE.land)
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" fill="${PALETTE.ink}" `);
  const png = new Resvg(handDrawn(src, iconSeed++), { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng();
  writeFileSync(join(outDir, `${name}.png`), png);
}
console.log(`wrote ${Object.keys(ICONS).length} icons to ${outDir}`);

// Hand-drawn line textures for the roads: one smooth stroke that
// wiggles side to side, like a "wiggle/roughen" effect with frequency 300%, wiggle 4%, smoothen 100%.
// Mapbox can't bend the real line geometry, so the wiggle lives in the texture: Mapbox stretches the tile's
// height to the line's width and repeats it along the line. The stroke itself fills STROKE_BAND of the height.
const STROKE_BAND = 0.4; // keep in sync with STROKE_BAND in src/lib/mapStyle.ts
const WIGGLE = 0.04; // peak-to-peak sideways travel, as a fraction of the stroke width
const FREQUENCY = 3; // waves per tile (the tile is 8 line-widths long): long, gentle undulations, not ripples
function wiggleStroke(name, color, opacity) {
  const W = 512;
  const H = 64;
  const half = (H * STROKE_BAND) / 2;
  const amp = (H * STROKE_BAND * WIGGLE) / 2;
  // smooth: a main sine plus a gentle harmonic so it isn't perfectly regular (whole cycles, so tiles join seamlessly)
  const center = (x) =>
    H / 2 + amp * (0.85 * Math.sin((2 * Math.PI * FREQUENCY * x) / W) + 0.15 * Math.sin((2 * Math.PI * 2 * FREQUENCY * x) / W + 1.3));
  const top = [];
  const bottom = [];
  for (let x = 0; x <= W; x += 2) {
    top.push(`${x},${(center(x) - half).toFixed(2)}`);
    bottom.push(`${x},${(center(x) + half).toFixed(2)}`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <path d="M${top.join(' L')} L${bottom.reverse().join(' L')} Z" style="fill:${color};fill-opacity:${opacity}"/>
  </svg>`;
  writeFileSync(join(outDir, `${name}.png`), new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 } }).render().asPng());
}
wiggleStroke('road-main', PALETTE.road, 1);
wiggleStroke('road-minor', PALETTE.road, 1);
console.log('wrote road-main.png, road-minor.png');

// Nature doodles. Each is placed on its own on the map (not as a repeating pattern), so it stays upright
// when the map rotates.
const flower = (x, y, r) => {
  const petals = Array.from({ length: 5 }, (_, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return `<circle cx="${(x + Math.cos(a) * r * 1.25).toFixed(1)}" cy="${(y + Math.sin(a) * r * 1.25).toFixed(1)}" r="${r}"/>`;
  }).join('');
  return `<path d="M${x} ${y + r * 1.5} q-1.5 ${r * 2} 0.5 ${r * 4}" style="fill:none;stroke:${PALETTE.ink};stroke-width:1.4;stroke-linecap:round"/>
    <g style="fill:${PALETTE.land};stroke:${PALETTE.ink};stroke-width:1.3">${petals}<circle cx="${x}" cy="${y}" r="${r * 0.8}" style="fill:${PALETTE.ink}"/></g>`;
};
// a single flower doodle, for parks (trees use the landmark set's `pine` and `tree`)
const flowerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="26" viewBox="0 0 20 26">${flower(10, 8, 3.2)}</svg>`;
writeFileSync(join(outDir, 'flower.png'), new Resvg(handDrawn(flowerSvg, 9), { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng());
console.log('wrote flower.png');

// The user's location marker (scripts/user-location.svg, a doodled orange cloud), as designed.
// The map pins the image's center on your location, so the marker goes on a transparent square canvas twice
// its size with its bottom-center (the feet) at the middle: it stands on the spot instead of covering it.
const standingOnCenter = (svg) => {
  const [, w, h] = svg.match(/width="([\d.]+)" height="([\d.]+)"/).map(Number);
  const side = 2 * Math.max(w, h);
  return svg.replace(
    /width="[\d.]+" height="[\d.]+" viewBox="[^"]+"/,
    `width="${side}" height="${side}" viewBox="${w / 2 - side / 2} ${h - side / 2} ${side} ${side}"`,
  );
};
// lines at the UI's 2pt (the SVG is drawn 1:1 in points), except the eyes, which are finer at 1pt
const EYE_PATHS = ['M19.9331', 'M25.8716', 'M19.6155', 'M25.4084'];
const withStroke = (svg, width, fine = [], fineWidth = 1) =>
  svg
    .replaceAll(/ stroke-width="[^"]*"/g, '')
    .replaceAll(/<path d="([^"]*)"/g, (_, d) => `<path stroke-width="${fine.some((f) => d.startsWith(f)) ? fineWidth : width}" d="${d}"`);
const userSvg = withStroke(
  standingOnCenter(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'user-location.svg'), 'utf8')),
  2,
  EYE_PATHS,
);
writeFileSync(join(outDir, 'user-location.png'), new Resvg(userSvg, { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng());
console.log('wrote user-location.png');

// The map's compass (scripts/compass.svg, a hand-drawn red needle pointing north), replacing Mapbox's default.
// Mapbox sizes the compass (and its tap area) to its image, so it's drawn on a square 44×44 canvas (a
// standard tap target) with the 11×22 needle at 1.5× (16.5×33), centered so it spins in place.
const COMPASS_BOX = 44;
const COMPASS_SCALE = 1.5;
const compassView = COMPASS_BOX / COMPASS_SCALE;
const compassSvg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'compass.svg'), 'utf8')
  .replace(
    'width="11" height="22" viewBox="0 0 11 22"',
    `width="${COMPASS_BOX}" height="${COMPASS_BOX}" viewBox="${5.5 - compassView / 2} ${11 - compassView / 2} ${compassView} ${compassView}"`,
  )
  // lines at the UI's 2pt, in the drawing's own units (it's shown at COMPASS_SCALE)
  .replaceAll('<path ', `<path stroke-width="${2 / COMPASS_SCALE}" `);
writeFileSync(join(outDir, 'compass.png'), new Resvg(compassSvg, { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng());
console.log('wrote compass.png');

// Repeating tile for open water: a few small hand-drawn waves, unevenly placed and sized, so the pattern
// doesn't read as a grid. Mapbox repeats it over every water area (fill-pattern).
const wave = (x, y, w, tilt) => `<path transform="translate(${x} ${y}) rotate(${tilt}) scale(${w / 34})" d="M2 8q5-8 10 0t10 0t10 0"/>`;
const WAVES = `<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140"
  style="fill:none;stroke:${PALETTE.wave};stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round">
  ${wave(10, 16, 22, -3)}${wave(82, 36, 18, 4)}${wave(34, 76, 26, 2)}${wave(98, 104, 20, -5)}
</svg>`;
writeFileSync(join(outDir, 'water-waves.png'), new Resvg(WAVES, { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng());
console.log('wrote water-waves.png');

// A flat color theme for the Standard basemap: a 32×32×32 color lookup table (laid out as a 1024×32 image)
// that maps every color to the canvas color. Standard then draws everything (land, water, parks, buildings,
// roads, mountain shading) in that one color, so it's hidden; the app draws its own doodles on top.
// Standard's lighting shifts the result a little, so the theme aims slightly lighter than the land color; on
// screen it comes out as the land color (measured: #FDF6ED -> #FAEDDC, #FEFBF6 -> #FCF7ED, white -> #FEFEFE).
const LUT_COLOR = '#FFFDFA';
const lutSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="32"><rect width="1024" height="32" fill="${LUT_COLOR}"/></svg>`;
const lut = new Resvg(lutSvg).render().asPng().toString('base64');
writeFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'lib', 'canvasTheme.ts'),
  `// Generated by scripts/build-landmark-icons.mjs: a color theme that turns everything Standard draws into the\n// canvas color (${PALETTE.land}).\nexport const CANVAS_THEME_LUT = '${lut}';\n`,
);
console.log('wrote src/lib/canvasTheme.ts');

// "You" speech bubble over the location marker (text is drawn by the app): a hand-drawn orange bubble filled with
// dense scribble hatching, like a marker coloring it in, with a tail pointing down at the cloud.
{
  const W = 76;
  const H = 42;
  const blue = '#FF6A18';
  // wobbly rounded body + tail
  const body =
    'M8 5 C20 2.6 46 3.4 66 4.6 C72 5.2 73.5 10 73 17 C72.6 24 71 28.6 64 29.6 C56 30.6 47 30.2 43 30.4 ' +
    'L37.5 39.5 L35 30.6 C26 30.8 16 30.8 9 29.4 C3.4 28.4 2.6 22 3 16 C3.4 9.6 4.4 5.8 8 5 Z';
  // hatching: a zigzag swept diagonally across the whole bubble, slightly irregular
  let hatch = '';
  let x = -H;
  let up = true;
  let k = 0;
  while (x < W + H) {
    const step = 2.1 + 0.5 * Math.sin(k * 1.7);
    const nx = x + step;
    hatch += up ? `M${x.toFixed(1)} ${H} L${(x + H * 0.9).toFixed(1)} 0 ` : `M${(x + H * 0.9).toFixed(1)} 0 L${nx.toFixed(1)} ${H} `;
    x = nx;
    up = !up;
    k++;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs><clipPath id="b"><path d="${body}"/></clipPath></defs>
    <path d="${body}" fill="${blue}" fill-opacity="0.82"/>
    <g clip-path="url(#b)"><path d="${hatch}" style="fill:none;stroke:${blue};stroke-width:1.5;stroke-linecap:round"/></g>
    <path d="${body}" style="fill:none;stroke:${blue};stroke-width:2;stroke-linejoin:round"/>
  </svg>`;
  writeFileSync(join(outDir, 'you-bubble.png'), new Resvg(svg, { fitTo: { mode: 'zoom', value: SCALE } }).render().asPng());
  console.log('wrote you-bubble.png');
}

// The brush color swatch (scripts/swatch.svg): a circle roughened by a noise filter. Skia's SVG renderer doesn't
// do that filter reliably, so it's rendered here once, in white, and the app tints it with each brush color.
// The filter pushes the blob off its canvas's center, so the image is cropped to a square centered on the blob
// itself: in the app it then lines up exactly with the selection ring around it.
const swatchSvg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'swatch.svg'), 'utf8');
// (resvg mis-clips the filter if the viewBox itself is moved, so the rendered image is what gets cropped.)
const centeredOnDrawing = (svg) => {
  const probe = new Resvg(svg, { fitTo: { mode: 'zoom', value: SCALE } }).render();
  const { width: w, height: h, pixels } = probe;
  let [x0, y0, x1, y1] = [w, h, 0, 0];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (pixels[(y * w + x) * 4 + 3] > 8) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x + 1), Math.max(y1, y + 1)];
  const side = Math.max(x1 - x0, y1 - y0) + 2 * SCALE;
  const [ox, oy] = [(x0 + x1) / 2 - side / 2, (y0 + y1) / 2 - side / 2];
  const png = probe.asPng().toString('base64');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}" viewBox="0 0 ${side} ${side}"><image href="data:image/png;base64,${png}" x="${-ox}" y="${-oy}" width="${w}" height="${h}"/></svg>`;
};
writeFileSync(join(outDir, 'swatch.png'), new Resvg(centeredOnDrawing(swatchSvg)).render().asPng());
console.log('wrote swatch.png');

