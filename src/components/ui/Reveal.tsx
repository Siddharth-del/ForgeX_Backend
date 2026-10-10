import { motion, type HTMLMotionProps } from "framer-motion";
import { EASE } from "@/lib/motion";

interface Props extends HTMLMotionProps<"div"> {
  delay?: number;
  y?: number;
}

/** Fades and lifts its children into place the first time they scroll into view. */
export function Reveal({ delay = 0, y = 28, children, ...rest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12, margin: "0px 0px -6% 0px" }}
      transition={{ duration: 1, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Splits a heading into lines that rise from behind a mask, one after another. */
export function MaskLines({ lines, className, delay = 0, as: Tag = "span" }: { lines: string[]; className?: string; delay?: number; as?: "span" }) {
  return (
    <>
      {lines.map((line, i) => (
        <Tag key={line + i} className="block overflow-hidden pb-[0.06em]">
          <motion.span
            className={className ?? "block"}
            initial={{ y: "110%" }}
            animate={{ y: "0%" }}
            transition={{ duration: 1.2, ease: EASE, delay: delay + i * 0.12 }}
          >
            {line}
          </motion.span>{" "}
        </Tag>
      ))}
    </>
  );
}
