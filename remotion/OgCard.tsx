import { AbsoluteFill } from "remotion";

import { FLAG, roundBands, sunPath } from "../lib/brand-mark";
import { AuthLoop } from "./AuthLoop";
import { dawn } from "./theme";

/**
 * The link preview (Open Graph, 1200×630) — a still: the dawn scene from the
 * sign-in film, with the mark and the name over its sky.
 * Render: npx remotion still remotion/index.ts OgCard public/og/gredan.png
 */
const BANDS = roundBands(18, 18, 17);

export function OgCard() {
  return (
    <AbsoluteFill>
      <AuthLoop scene={dawn} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 28,
          paddingBottom: 120,
        }}
      >
        <svg viewBox="0 0 36 36" width={132} height={132}>
          <circle cx="18" cy="18" r="17" fill={FLAG.white} />
          <path d={BANDS.red} fill={FLAG.red} />
          <path d={BANDS.green} fill={FLAG.green} />
          <path d={sunPath(18, 18, 8.6, 5.5)} fill={FLAG.sun} />
          <circle
            cx="18"
            cy="18"
            r="16.6"
            fill="none"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth="0.8"
          />
        </svg>
        <div
          style={{
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: 128,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "#1a1512",
          }}
        >
          Grêdan
        </div>
        <div
          style={{
            fontFamily: "'Segoe UI', system-ui, sans-serif",
            fontSize: 36,
            fontWeight: 500,
            color: "#574b42",
          }}
        >
          The Kurdish world, connected.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
