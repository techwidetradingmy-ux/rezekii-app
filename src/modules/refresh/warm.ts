import { isTimerToken } from "../posting/store.ts";

/** The signed-in pages: opened without a session they only redirect, which still starts their server (the slow part). */
const PAGES = ["/", "/signin", "/app", "/app/marketplace", "/app/my-tap", "/app/sales", "/app/accounts", "/app/levels", "/app/rankings", "/app/lookup", "/app/links", "/app/posts"];
/** Routes that also load their data when warmed, so the first creator after a quiet spell gets it from memory. */
const DATA = ["/api/rankings/daily", "/api/rankings/top", "/api/rankings/sellers", "/api/rankings/list", "/api/rankings/creator"];

/**
 * Keeps the site quick on a first visit (owner, 15 Oct 2026): the timer opens each page and the Rankings data routes, so their
 * servers and caches are already running when a creator arrives. Every 15 minutes from 7 am to 1 am Malaysia time (owner,
 * 23 Oct 2026: fewer warm-ups, less server use; the timer calls on every quarter hour). A failed warm-up changes nothing.
 */
export async function warmSite(origin: string, token: string, now = Date.now()): Promise<number> {
  if (!warmDue(now)) return 0;
  const hit = (path: string, headers: Record<string, string> = {}) =>
    fetch(origin + path, { redirect: "manual", cache: "no-store", headers, signal: AbortSignal.timeout(20_000) }).then((r) => r.body?.cancel(), () => undefined);
  await Promise.all([...PAGES.map((p) => hit(p)), ...DATA.map((p) => hit(p, { "x-warm": token }))]);
  return PAGES.length + DATA.length;
}

/** Whether this tick warms the site: every quarter hour from 7 am to 1 am Malaysia time. */
export function warmDue(now: number): boolean {
  const at = new Date(now);
  const hour = (at.getUTCHours() + 8) % 24;
  return at.getUTCMinutes() % 15 === 0 && !(hour >= 1 && hour < 7);
}

/** True for the timer's warm-up request (it carries the timer's own token). */
export async function isWarmCall(req: Request): Promise<boolean> {
  const token = req.headers.get("x-warm");
  return !!token && (await isTimerToken(token));
}
