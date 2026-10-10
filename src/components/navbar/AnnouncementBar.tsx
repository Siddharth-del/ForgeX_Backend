import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { site } from "@/lib/site";
import { EASE } from "@/lib/motion";

export function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % site.announcements.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative z-[51] flex h-9 items-center justify-center overflow-hidden bg-espresso-deep px-4 text-ivory/85">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={i}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="truncate text-center text-[0.6rem] font-medium uppercase tracking-[0.14em] sm:text-[0.64rem] sm:tracking-[0.26em]"
        >
          {site.announcements[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
