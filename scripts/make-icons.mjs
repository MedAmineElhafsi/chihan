/**
 * Draws every app icon from the brand mark's geometry (lib/brand-mark.ts):
 * favicon, Next's icon/apple-icon, the PWA icons and the source SVG.
 *
 *   node scripts/make-icons.mjs
 *
 * Node runs the TypeScript module directly (type stripping, Node 23.6+).
 */
import fs from "node:fs";
import sharp from "sharp";

import { markSvg } from "../lib/brand-mark.ts";

const png = (svg, size) =>
  sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

const out = {
  "public/icons/icon.svg": markSvg("square"),
  "public/icons/icon-192.png": [markSvg("square"), 192],
  "public/icons/icon-512.png": [markSvg("square"), 512],
  "public/icons/icon-maskable-512.png": [markSvg("maskable"), 512],
  // iOS rounds the corners itself, so its icons are full-bleed.
  "public/icons/apple-touch-icon.png": [markSvg("maskable"), 180],
  "app/apple-icon.png": [markSvg("maskable"), 180],
  "app/icon.png": [markSvg("round", 64), 32],
};

for (const [file, spec] of Object.entries(out)) {
  if (typeof spec === "string") fs.writeFileSync(file, spec + "\n");
  else fs.writeFileSync(file, await png(...spec));
  console.log("wrote", file);
}

// favicon.ico: an ICO directory holding 16, 32 and 48 px PNGs, which every
// browser accepts.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(markSvg("round", 64), s)));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(images[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += images[i].length;
});
fs.writeFileSync("app/favicon.ico", Buffer.concat([header, ...images]));
console.log("wrote app/favicon.ico");
