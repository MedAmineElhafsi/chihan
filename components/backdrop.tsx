import { NetworkField } from "./visuals/network-field";

/**
 * Deep-water backdrop: layered depth gradients, a live node network, and grain.
 * The visual thesis — people as points of light joined by filaments.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Depth wash */}
      <div className="animate-drift absolute -left-[20%] -top-[25%] size-[70vw] rounded-full bg-[radial-gradient(circle,rgba(80,232,244,0.16),transparent_65%)] blur-[100px]" />
      <div className="animate-drift absolute -right-[15%] top-[15%] size-[60vw] rounded-full bg-[radial-gradient(circle,rgba(80,232,244,0.10),transparent_65%)] blur-[100px] [animation-delay:-12s]" />
      <div className="animate-drift absolute bottom-[-30%] left-[15%] size-[65vw] rounded-full bg-[radial-gradient(circle,rgba(0,67,79,0.55),transparent_70%)] blur-[100px] [animation-delay:-22s]" />

      {/* Living network */}
      <NetworkField />

      {/* Grain */}
      <div className="absolute inset-0 opacity-[0.05] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />

      {/* Vignette — pushes focus to the centre */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,var(--depth-0)_100%)]" />
    </div>
  );
}
