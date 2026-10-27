"use client";

import { useEffect, useRef } from "react";

/**
 * Fades and lifts a landing section in as it scrolls into view. Only sections that start below the fold are hidden first,
 * so nothing is invisible without JavaScript or for content already on screen. A section counts as seen once its top is
 * above the bottom of the screen, so jumping to #faq also shows everything above it.
 */
export function Reveal({ id, className = "", children, label }: { id?: string; className?: string; children: React.ReactNode; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const seen = () => el.getBoundingClientRect().top < window.innerHeight * 0.88;
    if (!seen()) el.classList.add("cr1-pre");
    const check = () => {
      if (!seen()) return;
      el.classList.add("cr1-shown");
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);
  return (
    <section ref={ref} id={id} className={`cr1-reveal ${className}`} aria-label={label}>
      {children}
    </section>
  );
}
