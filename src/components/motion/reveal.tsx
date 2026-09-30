"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform, type Variants } from "motion/react";
import { Children, useRef, type ReactNode, type PointerEvent } from "react";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + lift into view once. The workhorse for section content. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "p";
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </Comp>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const staggerChild: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE } },
};

/** Staggers its direct children into view — for grids and lists. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.ul
      className={className}
      variants={staggerParent}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
    >
      {Children.map(children, (child, i) => (
        <motion.li key={i} variants={staggerChild} className="list-none">
          {child}
        </motion.li>
      ))}
    </motion.ul>
  );
}

/**
 * Headline reveal: each line slides up from behind a mask.
 * Pass lines as an array so wrapping stays intentional on every breakpoint.
 */
export function LineReveal({
  lines,
  className,
  lineClassName,
  delay = 0,
  as: Tag = "h2",
  immediate,
  id,
}: {
  id?: string;
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
  as?: "h1" | "h2" | "p";
  /** Animate on mount rather than on scroll into view (for above-the-fold) */
  immediate?: boolean;
}) {
  const trigger = immediate ? { animate: "show" } : { whileInView: "show", viewport: { once: true } };
  return (
    <Tag id={id} className={className}>
      <motion.span
        className="block"
        initial="hidden"
        {...trigger}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
      >
        {lines.map((line, i) => (
          <span key={i} className="block overflow-hidden pb-[0.08em]">
            <motion.span
              className={cn("block will-change-transform", lineClassName)}
              variants={{
                hidden: { y: "110%" },
                show: { y: "0%", transition: { duration: 1.1, ease: EASE } },
              }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}

/** Gentle vertical parallax for imagery. Disabled for reduced-motion users. */
export function Parallax({
  children,
  offset = 60,
  className,
}: {
  children: ReactNode;
  offset?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-offset, offset]);
  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      {/* Overscan by `offset` on both ends so the moving layer never reveals an edge */}
      <motion.div style={{ y, top: -offset, bottom: -offset }} className="absolute inset-x-0">
        {children}
      </motion.div>
    </div>
  );
}

/** Pulls toward the cursor a few pixels — used only on the hero's primary CTA. */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 });
  const y = useSpring(0, { stiffness: 220, damping: 18, mass: 0.4 });

  const onMove = (e: PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} style={{ x, y }} onPointerMove={onMove} onPointerLeave={reset} className="inline-block">
      {children}
    </motion.div>
  );
}
