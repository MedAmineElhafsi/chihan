/**
 * The Grêdan mark: the Kurdish flag — red, white and green in horizontal
 * bands with a golden sun of 21 rays (Newroz, the 21st of March) — drawn as
 * a round badge for the interface and a square for app icons.
 *
 * Plain geometry, no React, so the component (components/app-shell/brand.tsx)
 * and the icon generator (scripts/make-icons.ts) draw the same thing.
 */

/** Flag colours, a touch warmer than the flag's pure primaries so they sit
 *  with the Newroz and Dusk palettes. */
export const FLAG = {
  red: "#d1342f",
  white: "#f7f1e6",
  green: "#2e8a4c",
  sun: "#f2b42c",
} as const;

export const SUN_RAYS = 21;

/**
 * The sun as one star polygon: 21 points, the first straight up.
 * `inner` is the radius of the notches between rays.
 */
export function sunPath(cx: number, cy: number, outer: number, inner: number) {
  const pts: string[] = [];
  for (let i = 0; i < SUN_RAYS * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / SUN_RAYS;
    const r = i % 2 === 0 ? outer : inner;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(3)},${(cy + r * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join("L")}Z`;
}

/**
 * The top and bottom bands of a round badge as circular segments, so the
 * badge needs no clipPath (and no ids, which would collide when the mark is
 * on a page twice). The white band is the full circle underneath.
 */
export function roundBands(cx: number, cy: number, r: number) {
  const third = (2 * r) / 3;
  const topY = cy - r + third;
  const bottomY = cy + r - third;
  const dx = Math.sqrt(r * r - (cy - topY) ** 2);
  const f = (n: number) => n.toFixed(3);
  return {
    red: `M${f(cx - dx)},${f(topY)}A${r},${r} 0 0 1 ${f(cx + dx)},${f(topY)}Z`,
    green: `M${f(cx + dx)},${f(bottomY)}A${r},${r} 0 0 1 ${f(cx - dx)},${f(bottomY)}Z`,
  };
}

/**
 * A standalone SVG document of the mark.
 * - "round": the badge, on transparent (favicon).
 * - "square": full-bleed bands in a rounded square (app icon).
 * - "maskable": full-bleed square, sun inside the 80% safe zone; the
 *   platform cuts its own shape.
 */
export function markSvg(shape: "round" | "square" | "maskable", size = 512) {
  const c = size / 2;
  if (shape === "round") {
    const r = size / 2 - size * 0.02;
    const b = roundBands(c, c, r);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<circle cx="${c}" cy="${c}" r="${r}" fill="${FLAG.white}"/>
<path d="${b.red}" fill="${FLAG.red}"/><path d="${b.green}" fill="${FLAG.green}"/>
<path d="${sunPath(c, c, r * 0.5, r * 0.32)}" fill="${FLAG.sun}"/>
<circle cx="${c}" cy="${c}" r="${r - size * 0.01}" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="${size * 0.02}"/>
</svg>`;
  }
  const third = size / 3;
  const radius = shape === "square" ? size * 0.22 : 0;
  const sun = shape === "square" ? size * 0.3 : size * 0.24;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">
<defs><clipPath id="r"><rect width="${size}" height="${size}" rx="${radius}"/></clipPath></defs>
<g clip-path="url(#r)">
<rect width="${size}" height="${third}" fill="${FLAG.red}"/>
<rect y="${third}" width="${size}" height="${third + 1}" fill="${FLAG.white}"/>
<rect y="${third * 2}" width="${size}" height="${third + 1}" fill="${FLAG.green}"/>
</g>
<path d="${sunPath(c, c, sun, sun * 0.64)}" fill="${FLAG.sun}"/>
</svg>`;
}
