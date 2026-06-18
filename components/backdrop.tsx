// Deterministic starfield so server output is stable (no hydration drift).
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260618);
const STARS = Array.from({ length: 90 }, (_, i) => ({
  cx: +(rand() * 100).toFixed(3),
  cy: +(rand() * 100).toFixed(3),
  r: +(rand() * 1.1 + 0.3).toFixed(2),
  twinkle: i % 7 === 0,
  delay: +(rand() * 4).toFixed(2),
}));

/**
 * Fixed, full-viewport atmosphere: aurora glows, a starfield and a grain
 * overlay. Pure CSS/SVG, no client JS. Foreshadows the globe screen.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Aurora glows */}
      <div className="animate-aurora absolute -left-[15%] -top-[20%] size-[60vw] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_30%,transparent),transparent_65%)] blur-3xl" />
      <div className="animate-aurora absolute -right-[10%] top-[25%] size-[55vw] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,#3b5bdb_26%,transparent),transparent_65%)] blur-3xl [animation-delay:-8s]" />
      <div className="animate-aurora absolute bottom-[-25%] left-[20%] size-[50vw] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--kurd-green)_16%,transparent),transparent_65%)] blur-3xl [animation-delay:-14s]" />

      {/* Starfield */}
      <svg
        className="absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.cx}
            cy={s.cy}
            r={s.r}
            fill="var(--star)"
            className={s.twinkle ? "animate-twinkle" : undefined}
            style={
              s.twinkle
                ? { animationDelay: `${s.delay}s`, transformOrigin: "center" }
                : { opacity: 0.5 }
            }
          />
        ))}
      </svg>

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.04] mix-blend-soft-light [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,color-mix(in_oklab,var(--background)_85%,transparent))]" />
    </div>
  );
}
