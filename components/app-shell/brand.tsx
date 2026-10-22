import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

// Nodes arranged on a sphere silhouette — a world drawn as a network, with a
// warm sun at its core. Colours come from the theme tokens so the mark follows
// light and dark like everything else.
const RING = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI * 2) / 8 - Math.PI / 2;
  return { x: 18 + 12.5 * Math.cos(a), y: 18 + 12.5 * Math.sin(a) };
});

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
      <defs>
        <radialGradient id="brand-core">
          <stop offset="0%" style={{ stopColor: "var(--sun-2)" }} />
          <stop offset="65%" style={{ stopColor: "var(--brand)" }} />
          <stop
            offset="100%"
            style={{ stopColor: "var(--brand)", stopOpacity: 0.25 }}
          />
        </radialGradient>
      </defs>

      {/* Filaments from the core to each node */}
      <g className="stroke-brand" strokeOpacity="0.4" strokeWidth="0.9">
        {RING.map((p, i) => (
          <line key={i} x1="18" y1="18" x2={p.x} y2={p.y} />
        ))}
      </g>

      {/* Orbit */}
      <circle
        cx="18"
        cy="18"
        r="12.5"
        className="stroke-brand"
        strokeOpacity="0.35"
        strokeWidth="0.9"
        fill="none"
      />
      <ellipse
        cx="18"
        cy="18"
        rx="5.5"
        ry="12.5"
        className="stroke-sage"
        strokeOpacity="0.45"
        strokeWidth="0.9"
        fill="none"
      />

      {/* Nodes */}
      {RING.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={i % 3 === 0 ? 2 : 1.4}
          className={i % 3 === 0 ? "fill-sage" : "fill-brand"}
        />
      ))}

      {/* Core */}
      <circle cx="18" cy="18" r="5" fill="url(#brand-core)" />
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("group flex items-center gap-2.5", className)}
      aria-label={BRAND.name}
    >
      <BrandMark className="size-7 transition-transform duration-700 ease-out group-hover:rotate-180" />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        {BRAND.name}
      </span>
    </Link>
  );
}
