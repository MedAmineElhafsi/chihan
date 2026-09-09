/**
 * Spring configurations, taken from Apple's shipped interaction values rather
 * than invented (WWDC 2018, *Designing Fluid Interfaces*).
 *
 * Apple describes a spring with two designer-facing numbers instead of the
 * physics triplet:
 *
 *   damping ratio — 1.0 settles with no overshoot; below 1.0 bounces.
 *   response      — how quickly the value reaches its target, in seconds.
 *                   Not a duration: a spring's settle time emerges from the
 *                   parameters, it is not prescribed.
 *
 * Motion spells the same pair as `bounce` + `duration`, so these map directly.
 *
 * The rule for choosing: bounce only where the gesture itself carried
 * momentum. Overshoot on a menu that merely faded in feels wrong; overshoot
 * on a card you flicked feels right.
 */

/** Critically damped. The default for anything that did not come from a flick. */
export const springSettle = {
  type: "spring",
  bounce: 0,
  duration: 0.4,
} as const;

/** Drawer / sheet — damping 0.8, response 0.3. */
export const springSheet = {
  type: "spring",
  bounce: 0.2,
  duration: 0.3,
} as const;

/** Momentum: something the user threw. */
export const springFlick = {
  type: "spring",
  bounce: 0.2,
  duration: 0.4,
} as const;

/**
 * Where a flick would come to rest, using Apple's projection function.
 *
 * The physics-textbook v²/(2·decel) is *not* what Apple ships — this is the
 * exponential-decay form from the Designing Fluid Interfaces sample code, and
 * it is what makes a flick feel like a throw rather than a snap.
 *
 * @param velocity px/s at the moment of release
 * @param decelerationRate 0.998 for normal scroll feel, 0.99 for snappier
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary. A hard stop reads as frozen; giving
 * way less and less reads as "responsive, but there is nothing more here".
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55
): number {
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}
