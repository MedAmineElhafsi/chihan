import { AuroraField } from "./visuals/aurora-field";

/**
 * The atmosphere the whole app sits in.
 *
 * This was a field of dots joined by lines — a literal network diagram, which
 * described the idea rather than creating a feeling, and drew the eye to the
 * background instead of the content. It is weather now: slow bodies of light
 * at different depths, in three hues that appear nowhere else in the
 * interface.
 *
 * Everything here is decoration and must stay behind: no layout, no
 * interaction, and nothing that animates outside the compositor.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="bg-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <AuroraField />

      {/* Grain, barely there. Without it large soft gradients band visibly on
          8-bit displays; the noise breaks the steps up. */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* The edges fall away so the light reads as coming from within the page
          rather than stopping at its border. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_72%,var(--depth-0)_100%)]" />
    </div>
  );
}
