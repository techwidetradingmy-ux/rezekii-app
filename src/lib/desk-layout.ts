"use client";

import { useEffect, useState } from "react";

/**
 * Desktop layout mock-ups (owner, 31 Oct 2026: "desktop has a lot of space, it should be built differently"), to pick one:
 * now = today's layout; a = wider canvas; b = dashboard with a right-hand panel; c = list and detail side by side.
 * Kept on this device and set on <html data-desk> so each option's styles apply everywhere.
 */
export type Desk = "now" | "a" | "b" | "c";
const KEY = "rz-desk";
const EVENT = "rz-desk";

export function readDesk(): Desk {
  try {
    const v = localStorage.getItem(KEY);
    return v === "a" || v === "b" || v === "c" ? v : "now";
  } catch {
    return "now";
  }
}

export function setDesk(d: Desk) {
  try {
    localStorage.setItem(KEY, d);
  } catch {}
  document.documentElement.dataset.desk = d;
  window.dispatchEvent(new Event(EVENT));
}

/** The layout picked on this device; follows the switch in the preview's top strip. */
export function useDesk(): Desk {
  const [d, setD] = useState<Desk>("now");
  useEffect(() => {
    const read = () => {
      const v = readDesk();
      setD(v);
      document.documentElement.dataset.desk = v;
    };
    read();
    window.addEventListener(EVENT, read);
    return () => window.removeEventListener(EVENT, read);
  }, []);
  return d;
}
