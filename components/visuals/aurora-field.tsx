/**
 * The atmosphere behind everything.
 *
 * Five soft light bodies drifting at different depths. Depth is read from
 * parallax and scale, not from a perspective transform: a near layer is
 * larger, less blurred and moves further; a far layer is small, heavily
 * blurred and barely moves. That is the same cue the eye uses looking at real
 * weather, and it costs nothing — every layer animates only `transform` and
 * `opacity`, so the whole field lives on the compositor.
 *
 * The three hues live here and nowhere else. Cyan stays the interface's only
 * accent; indigo and violet exist to give the atmosphere somewhere to travel,
 * which a single hue cannot do.
 */
export function AuroraField() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden [contain:strict]"
    >
      {/* Far — barely moves, most diffuse. Reads as distance. */}
      <span className="aurora-blob aurora-far bg-[radial-gradient(circle_at_50%_50%,var(--aurora-2),transparent_62%)] left-[-18%] top-[-24%] size-[78vmax] [animation-duration:52s]" />

      {/* Mid — the body of the light, in the brand hue. */}
      <span className="aurora-blob aurora-mid bg-[radial-gradient(circle_at_50%_50%,var(--aurora-1),transparent_60%)] right-[-14%] top-[6%] size-[62vmax] [animation-duration:38s] [animation-delay:-9s]" />

      <span className="aurora-blob aurora-mid bg-[radial-gradient(circle_at_50%_50%,var(--aurora-3),transparent_58%)] bottom-[-22%] left-[14%] size-[58vmax] [animation-duration:44s] [animation-delay:-21s]" />

      {/* Near — smallest travel, sharpest, brightest. Reads as close. */}
      <span className="aurora-blob aurora-near bg-[radial-gradient(circle_at_50%_50%,var(--aurora-1),transparent_55%)] bottom-[8%] right-[18%] size-[34vmax] [animation-duration:30s] [animation-delay:-5s]" />

      <span className="aurora-blob aurora-near bg-[radial-gradient(circle_at_50%_50%,var(--aurora-2),transparent_55%)] left-[-6%] top-[38%] size-[28vmax] [animation-duration:34s] [animation-delay:-16s]" />
    </div>
  );
}
