// Doodle icons for the kinds of places on the map (coffee shops, restaurants, groceries…), drawn like the landmark
// doodles. Run `node scripts/build-landmark-icons.mjs` after editing to regenerate assets/stores/*.png.
import { OUT } from './landmark-icons.mjs';

export const STORE_ICONS = {
  coffee: `<svg width="30" height="30" viewBox="0 0 30 30" ${OUT}><path d="M4 12h17v7a7 7 0 0 1-7 7h-3a7 7 0 0 1-7-7z"/><path d="M21 14h2.5a3 3 0 0 1 0 6H21" fill="none"/><path d="M9.5 9q-2-3 0-6M15 9q-2-3 0-6" fill="none"/></svg>`,
  restaurant: `<svg width="36" height="30" viewBox="0 0 36 30" ${OUT}><circle cx="18" cy="16" r="9.5"/><circle cx="18" cy="16" r="5.5" fill="none"/><path d="M4 3v6.5q0 2.5 2 2.5V28M2 3v5.5M6 3v5.5" fill="none"/><path d="M32 28V3q-3.5 3-3.5 10H32z"/></svg>`,
  fastfood: `<svg width="32" height="28" viewBox="0 0 32 28" ${OUT}><path d="M4 12C4 2 28 2 28 12z"/><path d="M3 15.5h26" fill="none"/><path d="M4 19h24v1.5a4.5 4.5 0 0 1-4.5 4.5h-15A4.5 4.5 0 0 1 4 20.5z"/><path d="M11 7.5h.4M16 5.6h.4M21 7.5h.4" fill="none"/></svg>`,
  bar: `<svg width="24" height="32" viewBox="0 0 24 32" ${OUT}><path d="M3 3h18q0 12-9 13.5Q3 15 3 3z"/><path d="M4.5 8h15" fill="none"/><path d="M12 16.5V29M6 29.5h12" fill="none"/></svg>`,
  bakery: `<svg width="34" height="24" viewBox="0 0 34 24" ${OUT}><path d="M3 21v-8C3 3 31 3 31 13v8z"/><path d="M11.5 8.5l-2.5 7M17.5 7.5l-2.5 7M23.5 8.5l-2.5 7" fill="none"/></svg>`,
  icecream: `<svg width="22" height="34" viewBox="0 0 22 34" ${OUT}><path d="M3.5 14L11 32l7.5-18z"/><path d="M2.5 14.5a8.5 8.5 0 0 1 17 0z"/><path d="M7 19l7 0M8.5 24h5" fill="none"/></svg>`,
  grocery: `<svg width="34" height="28" viewBox="0 0 34 28" ${OUT}><path d="M9.5 11l5-8M24.5 11l-5-8" fill="none"/><path d="M2 11h30l-4 14.5H6z"/><path d="M12 15v6.5M17 15v6.5M22 15v6.5" fill="none"/></svg>`,
  shop: `<svg width="28" height="32" viewBox="0 0 28 32" ${OUT}><path d="M4 10.5h20l2 19.5H2z"/><path d="M9 14V7.5a5 5 0 0 1 10 0V14" fill="none"/></svg>`,
  health: `<svg width="30" height="30" viewBox="0 0 30 30" ${OUT}><rect x="2" y="2" width="26" height="26" rx="7"/><path d="M11.5 7h7v4.5H23v7h-4.5V23h-7v-4.5H7v-7h4.5z" style="fill:#000"/></svg>`,
  school: `<svg width="34" height="26" viewBox="0 0 34 26" ${OUT}><path d="M17 6Q10 1 2 3v19q8-2 15 3 7-5 15-3V3q-8-2-15 3z"/><path d="M17 6v18.5M6 8q4.5-1 8 1M6 13q4.5-1 8 1M20 9q3.5-2 8-1M20 14q3.5-2 8-1" fill="none"/></svg>`,
  bank: `<svg width="30" height="30" viewBox="0 0 30 30" ${OUT}><circle cx="15" cy="15" r="12.5"/><path d="M19 10.5q-1.4-2-4-2-3.6 0-3.6 3c0 4 7.6 2 7.6 6 0 2-2 3.2-4.1 3.2-2.5 0-3.6-1-4.4-2.4M15 6v18" fill="none"/></svg>`,
  lodging: `<svg width="36" height="26" viewBox="0 0 36 26" ${OUT}><path d="M3 3v21M33 14v10M3 19h30" fill="none"/><path d="M14 19v-7h19v7z"/><circle cx="8.5" cy="13.5" r="3.2"/></svg>`,
  museum: `<svg width="32" height="28" viewBox="0 0 32 28" ${OUT}><rect x="2" y="2" width="28" height="24" rx="1.5"/><path d="M6 22l7-9.5 5 6 3.5-3.5 5 7z" style="fill:#000"/><circle cx="22.5" cy="8.5" r="2.5" style="fill:#000"/></svg>`,
  cinema: `<svg width="32" height="30" viewBox="0 0 32 30" ${OUT}><rect x="3" y="12" width="26" height="16" rx="1.5"/><path d="M2.5 11.5L26.5 3.5l1.6 4.6-24 8z"/><path d="M10 9l2.2 4.2M17.5 6.5l2.2 4.2" fill="none"/></svg>`,
  worship: `<svg width="28" height="34" viewBox="0 0 28 34" ${OUT}><path d="M4 32V16.5L14 8.5l10 8V32z"/><path d="M14 8.5V1.5M11 4.5h6M11 32v-6.5a3 3 0 0 1 6 0V32" fill="none"/></svg>`,
  gym: `<svg width="36" height="20" viewBox="0 0 36 20" ${OUT}><path d="M10 10h16M2 6.5v7M34 6.5v7" fill="none"/><rect x="5" y="2.5" width="5" height="15" rx="1.6"/><rect x="26" y="2.5" width="5" height="15" rx="1.6"/></svg>`,
  fuel: `<svg width="28" height="32" viewBox="0 0 28 32" ${OUT}><path d="M3 30V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v25z"/><rect x="6" y="7" width="8" height="6" style="fill:#000"/><path d="M17 12h2.5a2 2 0 0 1 2 2v8.5a2 2 0 0 0 4 0V11l-4-5M1 30h18" fill="none"/></svg>`,
  star: `<svg width="30" height="30" viewBox="0 0 30 30" ${OUT}><path d="M15 2l3.8 8 8.7 1-6.4 6 1.7 8.6L15 21.4l-7.8 4.2 1.7-8.6-6.4-6 8.7-1z"/></svg>`,
  post: `<svg width="32" height="24" viewBox="0 0 32 24" ${OUT}><rect x="2" y="2" width="28" height="20" rx="2"/><path d="M3 4l13 10L29 4" fill="none"/></svg>`,
  books: `<svg width="30" height="30" viewBox="0 0 30 30" ${OUT}><path d="M3 28V5h6v23zM10 28V3h6v25z"/><path d="M17.5 6.5l5.6-1.6 5.4 21.6-5.6 1.6z"/><path d="M1.5 28h27" fill="none"/></svg>`,
  place: `<svg width="18" height="18" viewBox="0 0 18 18" ${OUT}><circle cx="9" cy="9" r="6"/><circle cx="9" cy="9" r="1.6" style="fill:#000"/></svg>`,
};
