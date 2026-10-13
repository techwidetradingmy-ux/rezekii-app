"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark" | "device";
const themeListeners = new Set<() => void>();
const readTheme = (): Theme => {
  try {
    const t = window.localStorage.getItem("rz_theme");
    return t === "light" || t === "dark" ? t : "device";
  } catch {
    return "device";
  }
};
const subscribeTheme = (fn: () => void) => {
  themeListeners.add(fn);
  return () => {
    themeListeners.delete(fn);
  };
};
/** Saved on this device only, and applied before paint by the script in the root layout. */
export function saveTheme(t: Theme) {
  try {
    if (t === "device") window.localStorage.removeItem("rz_theme");
    else window.localStorage.setItem("rz_theme", t);
  } catch {}
  const root = document.documentElement;
  if (t === "device") {
    delete root.dataset.theme;
    root.style.colorScheme = "";
  } else {
    root.dataset.theme = t;
    root.style.colorScheme = t;
  }
  themeListeners.forEach((fn) => fn());
}

/** The Appearance choice (Light, Dark or Device) on this device. */
export const useTheme = () => useSyncExternalStore(subscribeTheme, readTheme, () => "device" as Theme);
