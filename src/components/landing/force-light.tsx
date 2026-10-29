"use client";

import { useEffect } from "react";

/**
 * The landing pages are always light (owner, 30 Oct 2026), whatever the phone's dark mode. The root script does it before the
 * first paint; this keeps it right when someone moves between the app and a landing page, and gives the app her own choice back.
 */
export function ForceLight() {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.theme = "light";
    return () => {
      let t: string | null = null;
      try { t = localStorage.getItem("rz2_theme"); } catch {}
      if (t === "Light" || t === "Dark") el.dataset.theme = t.toLowerCase();
      else delete el.dataset.theme;
    };
  }, []);
  return null;
}
