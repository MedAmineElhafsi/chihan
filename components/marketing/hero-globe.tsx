import { cn } from "@/lib/utils";

// Decorative globe for the landing hero — a taste of the Phase 2 Explore screen:
// a glowing earth, orbiting points (people / restaurants / doctors) and a
// centered reticle, à la Radio Garden.
const POINTS = [
  { x: 168, y: 150, c: "var(--gold)" },
  { x: 235, y: 138, c: "var(--kurd-red)" },
  { x: 150, y: 215, c: "var(--kurd-green)" },
  { x: 248, y: 228, c: "var(--gold)" },
  { x: 205, y: 178, c: "var(--gold-bright)" },
  { x: 188, y: 250, c: "var(--kurd-red)" },
];

export function HeroGlobe({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[32rem]", className)}>
      <div className="animate-float-slow absolute inset-[10%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--gold)_28%,transparent),transparent_70%)] blur-2xl" />
      <svg
        viewBox="0 0 400 400"
        className="animate-float-slow relative size-full"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="hg-globe" cx="42%" cy="36%" r="68%">
            <stop offset="0%" stopColor="#1b3e76" />
            <stop offset="62%" stopColor="#0c1f3d" />
            <stop offset="100%" stopColor="#060d1d" />
          </radialGradient>
        </defs>

        {/* Orbit rings + orbiting dots */}
        <g
          fill="none"
          stroke="color-mix(in oklab, var(--gold) 18%, transparent)"
          style={{ transformOrigin: "200px 200px" }}
          className="animate-[spin_60s_linear_infinite]"
        >
          <ellipse
            cx="200"
            cy="200"
            rx="188"
            ry="72"
            transform="rotate(-18 200 200)"
          />
          <ellipse
            cx="200"
            cy="200"
            rx="170"
            ry="150"
            transform="rotate(26 200 200)"
            strokeOpacity="0.6"
          />
          <circle cx="388" cy="200" r="3.5" fill="var(--gold)" stroke="none" transform="rotate(-18 200 200)" />
          <circle cx="30" cy="200" r="2.5" fill="var(--kurd-green)" stroke="none" transform="rotate(26 200 200)" />
        </g>

        {/* Earth */}
        <circle
          cx="200"
          cy="200"
          r="112"
          fill="url(#hg-globe)"
          stroke="color-mix(in oklab, var(--gold) 28%, transparent)"
          strokeWidth="1.5"
        />

        {/* Meridians + equator */}
        <g
          fill="none"
          stroke="color-mix(in oklab, var(--gold) 20%, transparent)"
          strokeWidth="1"
        >
          <line x1="88" y1="200" x2="312" y2="200" />
          <ellipse cx="200" cy="200" rx="44" ry="112" />
          <ellipse cx="200" cy="200" rx="86" ry="112" strokeOpacity="0.6" />
          <path d="M96 158 Q200 188 304 158" />
          <path d="M96 242 Q200 212 304 242" />
        </g>

        {/* Glowing community points */}
        {POINTS.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="9" fill={p.c} opacity="0.18" />
            <circle
              cx={p.x}
              cy={p.y}
              r="3.2"
              fill={p.c}
              className={i % 2 === 0 ? "animate-twinkle" : undefined}
              style={{ transformOrigin: `${p.x}px ${p.y}px` }}
            />
          </g>
        ))}

        {/* Center reticle */}
        <g stroke="var(--gold-bright)" strokeWidth="1.5" fill="none">
          <circle cx="200" cy="200" r="13" strokeOpacity="0.9" />
          <line x1="200" y1="181" x2="200" y2="191" />
          <line x1="200" y1="209" x2="200" y2="219" />
          <line x1="181" y1="200" x2="191" y2="200" />
          <line x1="209" y1="200" x2="219" y2="200" />
        </g>
      </svg>
    </div>
  );
}
