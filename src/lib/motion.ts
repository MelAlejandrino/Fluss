import type { Variants, Transition } from "motion/react";

/**
 * Motion tokens. Mirrors the easing/duration scale in index.css so a CSS
 * transition and a `motion` animation on the same surface agree.
 *
 * Rules this encodes:
 * - Exponential ease-out only. No bounce — overshoot in a tool reads as lag.
 * - 120–260ms. Users are mid-task; nobody wants to watch the UI arrive.
 * - Motion reports state (something appeared, moved, finished). Never decoration.
 *
 * Reduced motion is handled globally by <MotionConfig reducedMotion="user">
 * in main.tsx plus the media query in index.css — nothing here needs a guard.
 */

/** cubic-bezier(0.16, 1, 0.3, 1) — the house curve. */
export const EASE: Transition["ease"] = [0.16, 1, 0.3, 1];

/** Slightly gentler; for things that travel further than a few pixels. */
export const EASE_SOFT: Transition["ease"] = [0.25, 1, 0.5, 1];

export const DURATION = {
  fast: 0.12,
  base: 0.18,
  slow: 0.26,
} as const;

/** Shared layout-animation transition for sliding indicators (nav pill, tabs). */
export const INDICATOR: Transition = {
  type: "spring",
  stiffness: 520,
  damping: 42,
  mass: 0.9,
};

/** Page swap. Opacity only: a slide inside the scroll sheet flashes the gutter. */
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE } },
};

/** A single element arriving — preview cards, error blocks, revealed options. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

/**
 * List entrance. Staggering a list is legitimate — the offset tracks reading
 * order — but it stays short enough that the last row is in place before the
 * eye reaches it.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
};

/** Elevated surfaces: dialogs and toasts. Scale is subtle — 0.97, not 0.8. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: DURATION.slow, ease: EASE } },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DURATION.fast, ease: EASE } },
};

export const scrim: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE } },
};
