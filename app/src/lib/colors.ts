import PALETTE from './palette.json';

/** Screen background: the same color as the map's water. */
export const PAPER = PALETTE.water;
/** The map's land color: the drawing area around a photo while doodling. */
export const LAND = PALETTE.land;

/** The app's "black": text, icons and dark buttons. */
export const INK = '#333333';

/** A lighter shade of INK, for secondary text like hints. */
export const INK_LIGHT = '#6B6B6B';

/** The water color at 70%, for surfaces the map shows through (the post overlay, over a light blur). */
export const PAPER_SEE_THROUGH = 'rgba(244, 235, 223, 0.7)';

/** Swipe-up panels (Brush, Text) and the floating undo/redo pill. */
export const SHEET = '#F7F2EE';
/** Fills inside a panel (the selected tab, the text field), a shade darker than SHEET so they still read. */
export const SHEET_FILL = '#EDE5DD';

/** The app's accent color (your location, the "You" bubble, active states, Post). */
/** The area you can draw in, around the photo, while drawing. */
export const DRAW_CANVAS = '#F8F1EE';
export const ACCENT = '#FF6A18';
/** The accent, muted, for a disabled accent button (a pale orange). */
export const ACCENT_MUTED = '#FFC9A8';
