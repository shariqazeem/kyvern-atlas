/**
 * ════════════════════════════════════════════════════════════════════
 * Shared motion primitives.
 *
 * Our easing and timing should be consistent across every surface.
 * Previously each component re-declared `const EASE = [...]` at the
 * top. This module is the single source of truth for motion style —
 * change here, change everywhere.
 *
 * Philosophy:
 *   · One ease curve for 95% of things (EASE_PREMIUM).
 *   · A slightly springier one for entrance moments only (EASE_SPRING).
 *   · Durations named by intent, not by number:
 *       DURATION.quick  — 160ms · button press, chip toggle
 *       DURATION.normal — 260ms · page transitions, crossfades
 *       DURATION.relaxed — 550ms · layout shifts, element entrances
 *       DURATION.cinematic — 900ms · hero reveals, deploy moments
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Our default cubic-bezier. Slight ease-in, meaningful ease-out.
 * Feels intentional without being bouncy.
 *
 * Used in: page fades, layout shifts, counter entrances, everything
 * that doesn't explicitly need a different feel.
 */
export const EASE_PREMIUM = [0.25, 0.1, 0.25, 1] as const;

/**
 * A softer spring for hero entrances and headline reveals. Slower
 * start, longer tail. Use sparingly — too much of this feels
 * theatrical.
 */
export const EASE_SPRING = [0.16, 1, 0.3, 1] as const;

/**
 * Named durations so callers can express intent, not guess ms values.
 * If you find yourself wanting a different duration, prefer adjusting
 * these values (once, everywhere) over passing a one-off number.
 */
export const DURATION = {
  quick: 0.16,
  normal: 0.26,
  relaxed: 0.55,
  cinematic: 0.9,
} as const;

/**
 * Shortcut for the common case: `{ duration: 0.55, ease: EASE_PREMIUM }`.
 * Pass into Framer's `transition` prop.
 */
export const TRANSITION = {
  quick: { duration: DURATION.quick, ease: EASE_PREMIUM },
  normal: { duration: DURATION.normal, ease: EASE_PREMIUM },
  relaxed: { duration: DURATION.relaxed, ease: EASE_PREMIUM },
  cinematic: { duration: DURATION.cinematic, ease: EASE_SPRING },
} as const;

// Legacy alias — some older files reference the array literal.
// Keep this export so we don't have to touch all call sites in one PR.
export const EASE = EASE_PREMIUM;
