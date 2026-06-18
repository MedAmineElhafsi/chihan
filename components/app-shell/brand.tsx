import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

const RAYS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i * Math.PI) / 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x1: 18 + 13.5 * cos,
    y1: 18 + 13.5 * sin,
    x2: 18 + 16.8 * cos,
    y2: 18 + 16.8 * sin,
  };
});

/** A golden sun-over-globe — Kurdish sun motif meets the cosmic globe. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      role="img"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <radialGradient id="cihan-sun" cx="50%" cy="42%" r="62%">
          <stop offset="0%" stopColor="var(--gold-bright)" />
          <stop offset="100%" stopColor="var(--gold)" />
        </radialGradient>
      </defs>
      <g stroke="var(--gold)" strokeWidth="1.4" strokeLinecap="round">
        {RAYS.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} />
        ))}
      </g>
      <circle cx="18" cy="18" r="11" fill="url(#cihan-sun)" />
      <g
        stroke="var(--primary-foreground)"
        strokeOpacity="0.55"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      >
        <ellipse cx="18" cy="18" rx="4.6" ry="11" />
        <line x1="7.2" y1="18" x2="28.8" y2="18" />
        <path d="M9 12.5 Q18 15.5 27 12.5" />
        <path d="M9 23.5 Q18 20.5 27 23.5" />
      </g>
    </svg>
  );
}

export function BrandWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group flex items-center gap-2.5 transition-opacity hover:opacity-90",
        className
      )}
    >
      <BrandMark className="size-8 drop-shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_45%,transparent)] transition-transform duration-500 group-hover:rotate-[18deg]" />
      <span className="font-display text-xl font-semibold tracking-tight">
        {BRAND.name}
      </span>
    </Link>
  );
}
