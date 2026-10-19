// Doodle landmark icons, copied verbatim from web/index.html (ICONS).
// Run `node scripts/build-landmark-icons.mjs` after editing to regenerate assets/landmarks/*.png.
export const OUT = 'style="fill:#fff;stroke:#000;stroke-width:1.8;stroke-linejoin:round;stroke-linecap:round"';
export const ICONS = {
  pine:`<svg width="22" height="30" viewBox="0 0 22 30" ${OUT}><path d="M11 1L4 11h4l-5 8h5l-4 7h14l-4-7h5l-5-8h4z"/><path d="M11 26v4" fill="none"/></svg>`,
  tree:`<svg width="24" height="28" viewBox="0 0 24 28" ${OUT}><path d="M12 27V16" fill="none"/><path d="M6 16C1 15 1 8 6 7c0-6 9-6 11-1 5 0 6 8 1 9-3 2-8 2-12 1z"/></svg>`,
  mountain:`<svg width="56" height="34" viewBox="0 0 56 34" ${OUT}><path d="M2 32L20 4l9 14 6-8 19 22z"/><path d="M20 4l-5 9 5-3 4 4 5-4" fill="none"/></svg>`,
  wave:`<svg width="34" height="12" viewBox="0 0 34 12" style="fill:none;stroke:#000;stroke-width:1.8;stroke-linecap:round"><path d="M2 8q5-8 10 0t10 0t10 0"/></svg>`,
  ferry:`<svg width="56" height="36" viewBox="0 0 56 36" ${OUT}><path d="M2 20h52l-7 11H9z" style="fill:#000"/><path d="M10 20v-8h36v8M16 12V6h20v6M24 6V2h6v4" /><path d="M0 34q6-4 12 0t12 0 12 0 12 0" style="fill:none"/></svg>`,
  plane:`<svg width="46" height="46" viewBox="0 0 48 48" style="transform:rotate(50deg)"><path d="M24 2c2 0 3 3 3 6v12l18 11v5l-18-6v10l5 4v4l-8-2-8 2v-4l5-4V30L3 36v-5l18-11V8c0-3 1-6 3-6z"/></svg>`,
  bridge:`<svg width="68" height="36" viewBox="0 0 68 36" style="fill:none;stroke:#000;stroke-width:2.4;stroke-linecap:round"><path d="M0 28h68M18 28V4M50 28V4M0 26Q8 12 18 5Q34 30 50 5Q60 12 68 26"/></svg>`,
  sails:`<svg width="60" height="40" viewBox="0 0 60 40"><path d="M4 30L14 6v24zM17 30L27 3v27zM30 30L40 6v24zM43 30l12-16v16zM2 30h58l-5 7H7z"/></svg>`,
  ferris:`<svg width="48" height="52" viewBox="0 0 48 52" style="fill:none;stroke:#000;stroke-width:2"><circle cx="24" cy="22" r="18"/><circle cx="24" cy="22" r="3" style="fill:#000"/><path d="M24 4v36M6 22h36M11 9l26 26M37 9L11 35M14 50l10-28 10 28"/></svg>`,
  dome:`<svg width="44" height="40" viewBox="0 0 44 40"><path d="M2 40V28h40v12zM6 28c0-22 32-22 32 0z"/></svg>`,
  sphere:`<svg width="40" height="40" viewBox="0 0 40 40" ${OUT}><circle cx="20" cy="20" r="16"/><path d="M4 20h32M20 4v32M9 9l22 22M31 9L9 31" fill="none" style="stroke-width:1.2"/></svg>`,
  clock:`<svg width="30" height="52" viewBox="0 0 30 52"><path d="M9 52V14h12v38zM15 1l9 11H6z"/><circle cx="15" cy="22" r="4.5" style="fill:#fff"/></svg>`,
  totem:`<svg width="26" height="54" viewBox="0 0 26 54"><path d="M5 2h16v50H5z"/><path d="M8 10h4M14 10h4M8 26h4M14 26h4M8 42h4M14 42h4M9 17h8M9 33h8M9 48h8" style="stroke:#fff;stroke-width:2.4;fill:none"/></svg>`,
  lighthouse:`<svg width="30" height="54" viewBox="0 0 30 54"><path d="M8 52l3-34h8l3 34z"/><path d="M10 18h10l-2-8h-6z"/><path d="M15 2v6M4 8l5 3M26 8l-5 3" style="stroke:#000;stroke-width:2;fill:none"/><path d="M11 30h8M10 40h10" style="stroke:#fff;stroke-width:3;fill:none"/></svg>`,
  whale:`<svg width="60" height="34" viewBox="0 0 60 34"><path d="M2 26C10 6 38 6 48 18l10-10-1 16c-8 10-40 12-55 2z"/><circle cx="14" cy="18" r="2" style="fill:#fff"/><path d="M26 6V0M20 6l-4-4M32 6l4-4" style="stroke:#000;stroke-width:1.8;fill:none"/></svg>`,
  skyline:`<svg width="60" height="44" viewBox="0 0 60 44"><path d="M2 42V24h9V12h9v30h5V18h9V6h9v36h5V26h9v16z"/></svg>`,
  barn:`<svg width="40" height="36" viewBox="0 0 40 36" ${OUT}><path d="M3 34V14L20 3l17 11v20z"/><path d="M14 34V22h12v12M14 22l12 12M26 22L14 34" fill="none"/></svg>`,
  sailboat:`<svg width="44" height="44" viewBox="0 0 44 44" ${OUT}><path d="M22 3v28H6z"/><path d="M25 8l13 23H25z"/><path d="M4 34h36l-6 8H10z" style="fill:#000"/></svg>`,
  umbrella:`<svg width="44" height="44" viewBox="0 0 44 44" ${OUT}><path d="M4 22C6 8 38 8 40 22z"/><path d="M22 22v20M4 22q6-5 9 0 5-5 9 0 4-5 9 0 5-5 9 0" fill="none"/></svg>`,
  gondola:`<svg width="52" height="36" viewBox="0 0 52 36" ${OUT}><path d="M2 6L50 22" fill="none"/><path d="M26 14v6" fill="none"/><rect x="18" y="20" width="16" height="11" rx="2"/></svg>`,
  temple:`<svg width="48" height="40" viewBox="0 0 48 40"><path d="M2 14L24 2l22 12zM6 18h6v20H6zM16 18h6v20h-6zM26 18h6v20h-6zM36 18h6v20h-6z"/></svg>`,

  // ---- New York ----
  liberty:`<svg width="32" height="60" viewBox="0 0 32 60"><path d="M7 60V46h18v14z"/><path d="M9 46l2.5-20c.4-3 2.2-5 4.5-5s4.1 2 4.5 5L23 46z"/><circle cx="16" cy="17" r="3.6"/><path d="M12 14l-2-3M14.5 12.5l-.5-3.5M17.5 12.5l.5-3.5M20 14l2-3" style="fill:none;stroke:#000;stroke-width:1.6;stroke-linecap:round"/><path d="M19 23l3.5-13 2.2.6-3.4 13z"/><path d="M21.5 5.5h4.4l-.9 4.4h-2.6z"/><path d="M23.7 0q2.4 2.6 0 5q-2.4-2.4 0-5z"/><path d="M12 30q4 2 8 0M11.5 37q4.5 2 9 0" style="fill:none;stroke:#fff;stroke-width:1.2"/></svg>`,
  empire:`<svg width="24" height="62" viewBox="0 0 24 62"><path d="M3 62V32h3.5v-6h3v-9h5v9h3v6H21v30z"/><path d="M11 17V7h2v10z"/><path d="M11.6 7V0h.8v7z"/><path d="M8 36v23M12 36v23M16 36v23" style="stroke:#fff;stroke-width:1.2;fill:none"/></svg>`,
  chrysler:`<svg width="22" height="64" viewBox="0 0 22 64" ${OUT}><path d="M3 63V32h16v31z"/><path d="M5 32c0-8 3-15 6-19 3 4 6 11 6 19z"/><path d="M8 32c0-5 1.4-9 3-11.5 1.6 2.5 3 6.5 3 11.5" fill="none"/><path d="M11 13V1" fill="none"/><path d="M7 38h8M7 44h8M7 50h8M7 56h8" fill="none" style="stroke-width:1.2"/></svg>`,
  oneWTC:`<svg width="22" height="64" viewBox="0 0 22 64"><path d="M3 64V22l4.5-7h7l4.5 7v42z"/><path d="M10.4 15V0h1.2v15z"/><path d="M7.5 15L11 64M14.5 15L11 64" style="stroke:#fff;stroke-width:1;fill:none"/></svg>`,
  flatiron:`<svg width="36" height="40" viewBox="0 0 36 40" ${OUT}><path d="M2 38V10L32 3v35z"/><path d="M2 14L32 7" fill="none"/><path d="M8 18v17M14 16v19M20 15v20M26 13v22" fill="none" style="stroke-width:1.2"/></svg>`,
  brooklynBridge:`<svg width="74" height="40" viewBox="0 0 74 40" style="fill:none;stroke:#000;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M0 31h74"/><path d="M16 38V4h11v34M48 38V4h11v34"/><path d="M18.5 31V17q3-5 6 0v14M50.5 31V17q3-5 6 0v14"/><path d="M0 23Q9 11 16 5M27 5Q37.5 24 48 5M59 5Q66 12 74 23"/><path d="M6 31v-7M37.5 31V19M68 31v-7" style="stroke-width:1.2"/></svg>`
};
