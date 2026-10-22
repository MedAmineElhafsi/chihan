import { cn } from "@/lib/utils";

/**
 * The Earth, turning slowly, drawn without WebGL.
 *
 * The same warm NASA pictures as the globe (`public/globe`), day in the light
 * theme and city lights in the dark one (`--earth-image` in globals.css). The
 * picture is a strip twice the sphere's width per copy, two copies long,
 * sliding sideways inside a circle — `transform` only, so it turns on the
 * compositor. A shading layer on top rounds it into a sphere and a rim of
 * brand light stands in for the atmosphere.
 *
 * Decoration: it carries no information and is hidden from assistive tech.
 */
export function EarthOrb({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("earth-orb", className)}>
      <div className="earth-orb-surface" />
      <div className="earth-orb-shade" />
    </div>
  );
}
