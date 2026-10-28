export type Theme = "Light" | "Dark" | "Auto";

/** The saved theme, or what the page is showing now. Browser only. */
export function readTheme(): Theme {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("rz2_theme");
  } catch {}
  const attr = document.documentElement.getAttribute("data-theme");
  return saved === "Light" || saved === "Dark" ? saved : attr === "light" ? "Light" : attr === "dark" ? "Dark" : "Auto";
}

/** Sets the theme on the page and remembers it on this device. Auto follows the phone. */
export function applyTheme(t: Theme) {
  const html = document.documentElement;
  if (t === "Auto") html.removeAttribute("data-theme");
  else html.setAttribute("data-theme", t.toLowerCase());
  try {
    localStorage.setItem("rz2_theme", t);
  } catch {}
}
