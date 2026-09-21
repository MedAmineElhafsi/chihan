import { useTranslations } from "next-intl";

/**
 * What stands in for the globe while it arrives.
 *
 * Three.js, react-globe.gl and the country atlas come to about 2.8 MB, and
 * the fallback used to be `null` — so on a phone the first screen of the app
 * was nothing at all for several seconds. A spinner would only have said
 * "wait"; this says what is coming, in the shape and colour it will arrive in,
 * so the page is recognisably Cîhan from the first paint.
 *
 * The breathing is the loading signal itself, not decoration: it is the only
 * evidence the page is still working. It stops under prefers-reduced-motion,
 * where the silhouette alone carries the meaning.
 */
export function GlobePlaceholder() {
  const t = useTranslations("Loading");

  return (
    <div
      role="status"
      aria-busy="true"
      className="absolute inset-0 flex items-center justify-center"
    >
      <span className="sr-only">{t("globe")}</span>

      <span
        aria-hidden="true"
        className="globe-pending relative block aspect-square w-[min(70vmin,42rem)] rounded-full"
      >
        {/* The body of the sphere: lit from the upper left, the same direction
            the real globe is lit from, so nothing jumps when it swaps. */}
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_28%,rgba(80,232,244,0.22),rgba(76,111,232,0.10)_45%,transparent_70%)]" />

        {/* The rim. A sphere reads as a sphere because its edge catches light. */}
        <span className="ring-cyan/20 absolute inset-0 rounded-full ring-1" />
      </span>
    </div>
  );
}
