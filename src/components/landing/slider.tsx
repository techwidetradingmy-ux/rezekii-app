"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import { useOnScreen, useReducedMotion } from "./hooks";

/**
 * Swipeable row that moves on by itself while on screen (owner, 29 Oct 2026: sliders instead of long pages). A touch, hover or
 * keyboard focus pauses it; it carries on a few seconds after. Dots jump to a slide. When everything already fits (wide
 * screens), there are no dots and nothing moves.
 */
export function AutoSlider({ children, label, every = 6000, className = "", onIndex }: {
  children: React.ReactNode;
  label: string;
  every?: number;
  className?: string;
  onIndex?: (i: number) => void;
}) {
  const items = Children.toArray(children);
  const wrap = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const on = useOnScreen(wrap, 0.35);
  const still = useReducedMotion();
  const [stops, setStops] = useState<number[]>([0]);
  const [idx, setIdx] = useState(0);
  const [hold, setHold] = useState(false);
  const release = useRef(0);
  const stopsRef = useRef(stops);
  useEffect(() => { stopsRef.current = stops; }, [stops]);

  // Where each slide starts; the last few share the end when more than one fits on screen.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const kids = [...el.children] as HTMLElement[];
      const max = el.scrollWidth - el.clientWidth;
      const base = kids[0]?.offsetLeft ?? 0;
      const s: number[] = [];
      for (const k of kids) {
        const x = Math.min(Math.max(0, k.offsetLeft - base), max);
        if (!s.length || x - s[s.length - 1] > 4) s.push(x);
      }
      setStops(max > 4 ? s : [0]);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length]);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const sync = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = el.scrollLeft;
        const s = stopsRef.current;
        let best = 0;
        s.forEach((p, i) => { if (Math.abs(p - x) < Math.abs(s[best] - x)) best = i; });
        setIdx(best);
      });
    };
    el.addEventListener("scroll", sync, { passive: true });
    return () => { el.removeEventListener("scroll", sync); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => onIndex?.(idx), [idx, onIndex]);

  const go = useCallback((i: number) => {
    track.current?.scrollTo({ left: stopsRef.current[i] ?? 0, behavior: still ? "auto" : "smooth" });
  }, [still]);

  useEffect(() => {
    if (!on || still || hold || stops.length < 2) return;
    const t = window.setTimeout(() => go((idx + 1) % stops.length), every);
    return () => window.clearTimeout(t);
  }, [on, still, hold, idx, stops.length, every, go]);

  const pause = () => { window.clearTimeout(release.current); setHold(true); };
  const resume = (ms = 5000) => { window.clearTimeout(release.current); release.current = window.setTimeout(() => setHold(false), ms); };
  useEffect(() => () => window.clearTimeout(release.current), []);

  return (
    <div
      ref={wrap}
      className={`lp-slider ${className}`}
      onPointerDown={pause}
      onPointerUp={() => resume()}
      onPointerCancel={() => resume()}
      onMouseEnter={pause}
      onMouseLeave={() => resume(1500)}
      onFocus={pause}
      onBlur={() => resume()}
    >
      <div ref={track} className="lp-track" role="region" aria-roledescription="carousel" aria-label={label} tabIndex={0}>
        {items.map((c, i) => (
          <div key={i} className="lp-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${items.length}`}>
            {c}
          </div>
        ))}
      </div>
      {stops.length > 1 && (
        <div className="lp-dots">
          {stops.map((_, i) => (
            <button key={i} type="button" aria-label={`Go to slide ${i + 1}`} aria-current={i === idx || undefined} className={i === idx ? "on" : ""} onClick={() => go(i)}>
              <i className={i === idx && on && !hold && !still ? "run" : ""} style={{ animationDuration: `${every}ms` }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
