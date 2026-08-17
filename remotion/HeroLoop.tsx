import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const CHARCOAL = "#001619";
const CYAN = "#50e8f4";
const AIR = "#c7f8fe";

const N = 130;

/** Fibonacci sphere — evenly distributed points, deterministic. */
const BASE = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = (i * Math.PI * (3 - Math.sqrt(5))) % (Math.PI * 2);
  return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r, seed: (i * 37) % 100 };
});

export function HeroLoop() {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  // Exactly one revolution across the composition → seamless loop.
  const t = frame / durationInFrames;
  const spin = t * Math.PI * 2;
  const tilt = -0.42;

  const cx = width / 2;
  const cy = height / 2;
  const R = Math.min(width, height) * 0.33;

  const pts = BASE.map((p) => {
    // rotate Y
    const x1 = p.x * Math.cos(spin) - p.z * Math.sin(spin);
    const z1 = p.x * Math.sin(spin) + p.z * Math.cos(spin);
    // tilt X
    const y2 = p.y * Math.cos(tilt) - z1 * Math.sin(tilt);
    const z2 = p.y * Math.sin(tilt) + z1 * Math.cos(tilt);
    const depth = (z2 + 1) / 2; // 0 back … 1 front
    return {
      sx: cx + x1 * R,
      sy: cy + y2 * R,
      depth,
      seed: p.seed,
    };
  });

  const links: Array<{ a: (typeof pts)[0]; b: (typeof pts)[0]; o: number }> = [];
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d = Math.hypot(pts[i].sx - pts[j].sx, pts[i].sy - pts[j].sy);
      if (d < R * 0.33) {
        const depth = (pts[i].depth + pts[j].depth) / 2;
        links.push({ a: pts[i], b: pts[j], o: (1 - d / (R * 0.33)) * depth * 0.5 });
      }
    }
  }

  // Gentle breathing glow, loop-safe (sin over a whole period).
  const breathe = 0.75 + 0.25 * Math.sin(t * Math.PI * 2);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: CHARCOAL,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Depth wash */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, rgba(80,232,244,${
            0.16 * breathe
          }) 0%, transparent 62%)`,
        }}
      />

      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="halo">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.75" />
            <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Filaments */}
        <g stroke={CYAN} strokeWidth={1.1}>
          {links.map((l, i) => (
            <line
              key={i}
              x1={l.a.sx}
              y1={l.a.sy}
              x2={l.b.sx}
              y2={l.b.sy}
              strokeOpacity={l.o}
            />
          ))}
        </g>

        {/* Nodes */}
        {pts.map((p, i) => {
          const pulse =
            0.55 +
            0.45 *
              Math.sin(t * Math.PI * 2 * 2 + (p.seed / 100) * Math.PI * 2);
          const bright = p.seed % 5 === 0;
          const r = (bright ? 4.5 : 2.6) * (0.45 + p.depth * 0.9);
          return (
            <g key={i}>
              {bright && (
                <circle
                  cx={p.sx}
                  cy={p.sy}
                  r={r * 5}
                  fill="url(#halo)"
                  opacity={p.depth * pulse * 0.85}
                />
              )}
              <circle
                cx={p.sx}
                cy={p.sy}
                r={r}
                fill={bright ? AIR : CYAN}
                opacity={0.25 + p.depth * 0.75 * (bright ? pulse : 1)}
              />
            </g>
          );
        })}
      </svg>

      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 55%, ${CHARCOAL} 100%)`,
        }}
      />

      {/* Wordmark — fades in, holds, fades out within the loop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: interpolate(
            frame,
            [0, 20, durationInFrames - 20, durationInFrames],
            [0, 1, 1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          ),
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 96,
            letterSpacing: "-0.04em",
            color: AIR,
            textShadow: `0 0 60px rgba(80,232,244,${0.7 * breathe})`,
          }}
        >
          Cîhan
        </span>
      </div>
    </div>
  );
}
