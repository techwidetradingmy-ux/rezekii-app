"use client";

import { useEffect, useState } from "react";

/**
 * Back returns to the same spot (owner, 29 Oct 2026). Pages remember their scroll and open sections for this tab; after Back
 * (the browser's, the phone's, or a page's back arrow) they come back exactly as she left them. Other visits start fresh.
 */
let backTo: string | null = null;
if (typeof window !== "undefined") window.addEventListener("popstate", () => { backTo = window.location.pathname; });

/** True while the page on screen was reached with Back. */
export const cameBack = () => typeof window !== "undefined" && backTo === window.location.pathname;
export const clearBack = () => { backTo = null; };

const key = (name: string) => `rz2_keep:${window.location.pathname}:${name}`;

/** useState that comes back as it was after Back: an open section, a tab, a filter. */
export function useKept<T>(name: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    if (!cameBack()) return initial;
    try {
      const s = sessionStorage.getItem(key(name));
      return s ? (JSON.parse(s) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(key(name), JSON.stringify(value)); } catch {}
  }, [name, value]);
  return [value, setValue] as const;
}

/** Remembers the scroll of each page and puts it back after Back, once the page is tall enough again. Used once, in Shell. */
export function useScrollMemory(path: string) {
  useEffect(() => {
    const k = `rz2_y:${path}`;
    let raf = 0;
    if (cameBack()) {
      let y = 0;
      try { y = Number(sessionStorage.getItem(k) ?? 0); } catch {}
      let tries = 0;
      const put = () => {
        window.scrollTo(0, y);
        if (Math.abs(window.scrollY - y) > 2 && tries++ < 40) raf = requestAnimationFrame(put);
      };
      raf = requestAnimationFrame(put);
    }
    clearBack();
    let saving = 0;
    const save = () => {
      cancelAnimationFrame(saving);
      saving = requestAnimationFrame(() => {
        if (window.location.pathname !== path) return;
        try { sessionStorage.setItem(k, String(Math.round(window.scrollY))); } catch {}
      });
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(saving);
      window.removeEventListener("scroll", save);
    };
  }, [path]);
}
