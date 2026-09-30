"use client";

import { useEffect, useState } from "react";

/**
 * On phones and tablets a page's main call to action is often below the fold or scrolled past.
 * Returns true when that CTA is out of view (so a compact bar pinned to the bottom should show),
 * and false again over the footer so the bar never covers the page's last lines.
 */
/** Pass the CTA element (from a callback ref), so late-rendered CTAs are observed too. */
export function useStickyBar(el: HTMLElement | null) {
  const [ctaVisible, setCtaVisible] = useState(true);
  const [footerVisible, setFooterVisible] = useState(false);
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!el) return;
    const a = new IntersectionObserver(([e]) => setCtaVisible(e.isIntersecting), { rootMargin: "0px 0px -40px 0px" });
    a.observe(el);
    const b = footer ? new IntersectionObserver(([e]) => setFooterVisible(e.isIntersecting)) : null;
    if (footer) b!.observe(footer);
    return () => {
      a.disconnect();
      b?.disconnect();
    };
  }, [el]);
  return !ctaVisible && !footerVisible;
}

