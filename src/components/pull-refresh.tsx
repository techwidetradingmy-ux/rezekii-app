"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { useT } from "@/lib/i18n/client";

const PULL = 72;

/**
 * Pull down to refresh (owner, 2 Nov 2026), in the app added to the home screen, where the browser's own pull-to-refresh
 * isn't there. From the top of the screen, pull past the circle and let go: the screen loads again with fresh data. Not while
 * a sheet is open or an inner list is scrolled.
 */
export function PullRefresh() {
  const t = useT();
  const [pull, setPull] = useState(0);
  const [going, setGoing] = useState(false);
  const from = useRef<number | null>(null);
  const dist = useRef(0);

  useEffect(() => {
    const app = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!app) return;
    const scrolled = (el: EventTarget | null) => {
      for (let n = el as HTMLElement | null; n && n !== document.body; n = n.parentElement) if (n.scrollTop > 0) return true;
      return false;
    };
    const start = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1 || document.querySelector('[aria-modal="true"]') || scrolled(e.target)) return;
      from.current = e.touches[0].clientY;
    };
    const move = (e: TouchEvent) => {
      if (from.current === null) return;
      const d = e.touches[0].clientY - from.current;
      if (d <= 0 || window.scrollY > 0) {
        from.current = null;
        dist.current = 0;
        return setPull(0);
      }
      dist.current = Math.min(PULL * 1.6, d * 0.55);
      setPull(dist.current);
    };
    const end = () => {
      if (from.current === null) return;
      from.current = null;
      if (dist.current >= PULL) {
        setGoing(true);
        setPull(PULL);
        window.location.reload();
      } else setPull(0);
      dist.current = 0;
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end);
    window.addEventListener("touchcancel", end);
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, []);

  if (!pull && !going) return null;
  return (
    <div className={`v2-pull${going ? " going" : ""}`} style={{ transform: `translateY(${pull}px)` }} role="status" aria-label={going ? t("Refreshing") : pull >= PULL ? t("Let go to refresh") : t("Pull to refresh")}>
      <span style={{ transform: going ? undefined : `rotate(${(pull / PULL) * 270}deg)`, opacity: Math.min(1, pull / PULL) }}><Icon name="refresh" size={20} width={2.4} /></span>
    </div>
  );
}
