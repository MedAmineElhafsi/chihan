import { Link } from "@/i18n/navigation";
import { FLAG, roundBands, sunPath } from "@/lib/brand-mark";
import { BRAND } from "@/lib/constants";
import { cn } from "@/lib/utils";

// The Kurdish flag as a round badge: red, white and green bands with the
// 21-ray sun (geometry in lib/brand-mark.ts, shared with the app icons).
// The flag's colours are its own and do not follow the theme; a faint ring
// keeps the white band from dissolving into a light page.
const BANDS = roundBands(18, 18, 17);
const SUN = sunPath(18, 18, 8.6, 5.5);

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" aria-hidden="true" className={className}>
      <circle cx="18" cy="18" r="17" fill={FLAG.white} />
      <path d={BANDS.red} fill={FLAG.red} />
      <path d={BANDS.green} fill={FLAG.green} />
      {/* Only the sun turns on hover: turning the badge would turn the flag
          upside down. */}
      <path
        d={SUN}
        fill={FLAG.sun}
        className="origin-center transition-transform duration-700 ease-out [transform-box:fill-box] group-hover:rotate-[51.43deg] motion-reduce:transition-none"
      />
      <circle
        cx="18"
        cy="18"
        r="16.6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.14"
        strokeWidth="0.8"
      />
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
      <BrandMark className="size-7 text-ink" />
      <span className="font-display text-lg font-semibold tracking-tight text-ink">
        {BRAND.name}
      </span>
    </Link>
  );
}
