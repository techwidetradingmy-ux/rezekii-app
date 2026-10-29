"use client";

import { useEffect, useState, type RefObject } from "react";

/** True while the element is on screen, so animations, timers and videos only run when someone can see them. */
export function useOnScreen(ref: RefObject<Element | null>, threshold = 0.12) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}

/** A media query, false until the page has loaded (the server can't know the screen). */
export function useMedia(query: string) {
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setHit(m.matches);
    sync();
    m.addEventListener("change", sync);
    return () => m.removeEventListener("change", sync);
  }, [query]);
  return hit;
}

export const useReducedMotion = () => useMedia("(prefers-reduced-motion: reduce)");

/**
 * Marks each child matching `selector` with data-on while it is on screen. The CSS only animates [data-on] widgets, so a tile
 * plays when it scrolls in and rests when it leaves (no React re-render per tile).
 */
export function useLiveChildren(ref: RefObject<Element | null>, selector: string, threshold = 0.2) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver((list) => {
      for (const e of list) e.target.toggleAttribute("data-on", e.isIntersecting);
    }, { threshold });
    root.querySelectorAll(selector).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ref, selector, threshold]);
}
