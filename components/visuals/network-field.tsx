// Deterministic node network — glowing points joined by filaments.
// Rendered as static SVG (no client JS, no hydration drift); the motion comes
// from CSS. This is the app's core visual metaphor: a diaspora as a constellation.

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Node = { x: number; y: number; r: number; bright: boolean; delay: number };

const rand = mulberry32(0x50e8f4);
const NODES: Node[] = Array.from({ length: 46 }, () => ({
  x: +(rand() * 100).toFixed(2),
  y: +(rand() * 100).toFixed(2),
  r: +(rand() * 0.5 + 0.18).toFixed(2),
  bright: rand() > 0.72,
  delay: +(rand() * 5).toFixed(2),
}));

// Join nodes that are close enough — produces an organic filament web.
const LINKS: Array<{ a: Node; b: Node; o: number }> = [];
for (let i = 0; i < NODES.length; i++) {
  for (let j = i + 1; j < NODES.length; j++) {
    const a = NODES[i];
    const b = NODES[j];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (d < 17) {
      LINKS.push({ a, b, o: +(0.32 * (1 - d / 17)).toFixed(3) });
    }
  }
}

export function NetworkField({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "absolute inset-0 size-full"}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nf-halo">
          <stop offset="0%" stopColor="#50e8f4" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#50e8f4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g stroke="#50e8f4" strokeWidth="0.08">
        {LINKS.map((l, i) => (
          <line
            key={i}
            x1={l.a.x}
            y1={l.a.y}
            x2={l.b.x}
            y2={l.b.y}
            strokeOpacity={l.o}
          />
        ))}
      </g>

      {NODES.map((n, i) => (
        <g key={i} style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
          {n.bright && (
            <circle cx={n.x} cy={n.y} r={n.r * 6} fill="url(#nf-halo)" />
          )}
          <circle
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={n.bright ? "#c7f8fe" : "#50e8f4"}
            className={n.bright ? "animate-pulse-node" : undefined}
            style={
              n.bright
                ? {
                    animationDelay: `${n.delay}s`,
                    transformOrigin: `${n.x}px ${n.y}px`,
                  }
                : { opacity: 0.45 }
            }
          />
        </g>
      ))}
    </svg>
  );
}
