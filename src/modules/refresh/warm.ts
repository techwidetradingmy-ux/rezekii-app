import { isTimerToken } from "../posting/store.ts";

/** The signed-in pages: opened without a session they only redirect, which still starts their server (the slow part). */
const PAGES = ["/", "/signin", "/app", "/app/marketplace", "/app/my-tap", "/app/sales", "/app/accounts", "/app/levels", "/app/rankings", "/app/lookup", "/app/links", "/app/posts"];
/** Routes that also load their data when warmed, so the first creator after a quiet spell gets it from memory. */
const DATA = ["/api/rankings/daily", "/api/rankings/top", "/api/rankings/sellers", "/api/rankings/list", "/api/rankings/creator"];

/**
 * Keeps the site quick on a first visit (owner, 15 Oct 2026): the timer opens each page and the Rankings data routes, so their
 * servers and caches are already running when a creator arrives. Every 15 minutes from 7 am to 1 am Malaysia time (owner,
 * 23 Oct 2026: fewer warm-ups, less server use; the timer calls on every quarter hour). A failed warm-up changes nothing.
 * The pages only start their servers, so they go together. The Rankings data routes read the two biggest tables, and five at
 * once overloaded the database every quarter hour: Rankings timed out, and on 6 Nov 2026 the database stopped answering for
 * about 7 minutes (owner: "why rezekii.com keep crashing?"). So they go one after another, at most 15 s each.
 */
export async function warmSite(origin: string, token: string, now = Date.now()): Promise<number> {
  if (!warmDue(now)) return 0;
  const hit = (path: string, headers: Record<string, string> = {}, ms = 20_000) =>
    fetch(origin + path, { redirect: "manual", cache: "no-store", headers, signal: AbortSignal.timeout(ms) }).then((r) => r.body?.cancel(), () => undefined);
  const data = async () => {
    for (const p of DATA) await hit(p, { "x-warm": token }, 15_000);
  };
  await Promise.all([...PAGES.map((p) => hit(p)), data()]);
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
