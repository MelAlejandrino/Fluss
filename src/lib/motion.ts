import type { Variants, Transition } from "motion/react";

// CircOut — snappy, mechanical (DESIGN_PATTERN §9.1).
export const EASE: Transition["ease"] = [0.4, 0, 0.2, 1];

// Opacity-only — a vertical slide briefly overflows the scroll container and
// flashes the scrollbar on every page change, so we fade instead.
export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.25, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.15, ease: EASE } },
};

// List stagger — parent orchestrates, children rise in.
export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};
