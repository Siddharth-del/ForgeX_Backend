import type { Transition, Variants } from "framer-motion";

/** One easing curve for the whole site: a long, soft deceleration. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const luxe: Transition = { duration: 0.9, ease: EASE };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: luxe },
};

export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});
