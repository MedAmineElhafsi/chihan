import { NetworkField } from "./visuals/network-field";

/**
 * Deep-water backdrop: a lit depth wash, a live node network, and a whisper of
 * grain. Kept deliberately light-handed — the UI should read as illuminated
 * water, not a black hole.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Depth wash — lifts the page off the deepest layer */}
      <div className="animate-drift absolute -left-[15%] -top-[20%] size-[65vw] rounded-full bg-[radial-gradient(circle,rgba(80,232,244,0.14),transparent_68%)] blur-[110px]" />
      <div className="animate-drift absolute -right-[10%] top-[25%] size-[55vw] rounded-full bg-[radial-gradient(circle,rgba(80,232,244,0.10),transparent_68%)] blur-[110px] [animation-delay:-14s]" />

      {/* Living network */}
      <NetworkField />

      {/* Grain — barely there */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* Soft edge fade only — no heavy centre vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_65%,rgba(0,22,25,0.55)_100%)]" />
    </div>
  );
}
