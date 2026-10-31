"use client";

import { useEffect, useState } from "react";
import type { RangeKey } from "./mock-creator2";

/**
 * The date range she picked, shared by Analytics and Performance (owner, 1 Nov 2026): change it on one and the other opens on
 * the same days. Kept for this browser tab.
 */
export type SharedRange = { preset: RangeKey; custom: [string, string] | null };
const KEY = "rz2_range";
const EVENT = "rz-range";
const DEFAULT: SharedRange = { preset: "30 days", custom: null };

const read = (): SharedRange => {
  try {
    const s = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as SharedRange | null;
    return s && typeof s.preset === "string" ? { preset: s.preset, custom: Array.isArray(s.custom) && s.custom.length === 2 ? s.custom : null } : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export function useSharedRange(): [SharedRange, (r: SharedRange) => void] {
  const [range, setRange] = useState<SharedRange>(DEFAULT);
  useEffect(() => {
    setRange(read());
    const sync = () => setRange(read());
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const save = (r: SharedRange) => {
    setRange(r);
    try { sessionStorage.setItem(KEY, JSON.stringify(r)); } catch {}
    window.dispatchEvent(new Event(EVENT));
  };
  return [range, save];
}
