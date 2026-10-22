/**
 * The atmosphere the whole app sits in.
 *
 * This was an aurora: five blurred bodies of cyan, indigo and violet drifting
 * behind everything. It was weather, and weather competes with the content.
 * It is a still wash now — in the light theme a sunrise along the top of the
 * page, in the dark theme the last of the sun along the bottom, as if the
 * horizon sat just below the tab bar. Nothing moves, so nothing pulls the eye
 * and nothing costs a frame.
 *
 * Everything here is decoration and must stay behind: no layout and no
 * interaction. The colours are `--sun-1/2/3` and appear only here and in
 * decorative gradients — never on text.
 */
export function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className="bg-background pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <div className="sun-wash absolute inset-0" />

      {/* Grain, barely there. Without it large soft gradients band visibly on
          8-bit displays; the noise breaks the steps up. */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22140%22 height=%22140%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/></svg>')]" />
    </div>
  );
}
