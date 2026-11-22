"use client";

/** True in the Home Screen app, which keeps its own sign-in apart from the phone's browser. */
export const homeScreenApp = (): boolean => {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; }
};

// A pass for her account (good for 10 minutes), fetched ahead so tapping Connect can open the browser at once: phones block a
// window opened after waiting for the server.
let ready: { pass: string; at: number } | null = null;
const FRESH_MS = 7 * 60_000;

async function fetchPass(): Promise<string | null> {
  const r = await fetch("/api/auth/connect-pass", { method: "POST", cache: "no-store" }).catch(() => null);
  const d = r?.ok ? ((await r.json().catch(() => null)) as { pass?: string } | null) : null;
  if (d?.pass) ready = { pass: d.pass, at: Date.now() };
  return d?.pass ?? null;
}

/** Fetches a pass ahead of time, in the Home Screen app only (DemoProvider does this while she's signed in). */
export function warmPass(): void {
  if (homeScreenApp() && (!ready || Date.now() - ready.at > FRESH_MS)) void fetchPass();
}

const withPass = (url: string, pass: string) => `${url}${url.includes("?") ? "&" : "?"}pass=${encodeURIComponent(pass)}`;

/**
 * Starts connecting an app: TikTok Shop, TikTok, Facebook, Instagram or Threads (owner, 23 Nov 2026: Re-link from the Home Screen
 * app ended on the sign-in page). In the Home Screen app it opens in the phone's browser with her pass, so what she connects
 * there is saved to her account and the app stays on this page; anywhere else it opens here, as before.
 */
export function openConnect(url: string): void {
  if (!homeScreenApp()) {
    window.location.href = url;
    return;
  }
  if (ready && Date.now() - ready.at < FRESH_MS) {
    window.open(withPass(url, ready.pass), "_blank");
    ready = null;
    void fetchPass();
    return;
  }
  // No pass yet: open the window now (allowed only straight from the tap), then send it on once the pass arrives.
  const win = window.open("about:blank", "_blank");
  void fetchPass().then((pass) => {
    const to = pass ? withPass(url, pass) : url;
    if (win) win.location.href = to;
    else window.location.href = to;
  });
}
