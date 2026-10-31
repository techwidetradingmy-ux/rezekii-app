import { after } from "next/server";
import { supabaseRest } from "../../integrations/supabase/rest.ts";

/**
 * Her TikTok data in real time (owner, 31 Oct 2026: "all creator data should reflect instantly; 1 AM is just a new batch; never
 * show empty data"). Each read of her orders (TikTok Shop) or videos (TikTok) is noted with its time, which her pages show as
 * "Updated 3:42 pm".
 */
export type Kind = "orders" | "videos";
export type ReadTimes = Record<Kind, string | null>;

const STALE = 30 * 60_000;
const key = (userId: string) => encodeURIComponent(`read_at:${userId}`);

export async function readTimes(userId: string): Promise<ReadTimes> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${key(userId)}&select=value&limit=1`)).json()) as { value: Partial<ReadTimes> }[];
  return { orders: row?.value?.orders ?? null, videos: row?.value?.videos ?? null };
}

/** Notes that her `kind` was just read from TikTok. */
export async function noteRead(userId: string, kind: Kind): Promise<void> {
  const value = { ...(await readTimes(userId)), [kind]: new Date().toISOString() };
  await supabaseRest("app_settings?on_conflict=key", { method: "POST", headers: { prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify({ key: `read_at:${userId}`, value, updated_at: value[kind] }) });
}

/** Reads running in this server right now, so two pages opened together read once. */
const running = new Map<string, Promise<unknown>>();
function readOnce(userId: string, kind: Kind): Promise<unknown> {
  const k = `${userId}:${kind}`;
  const had = running.get(k);
  if (had) return had;
  const p = (async () => {
    if (kind === "orders") {
      const [{ approvedCreatorToken }, { syncCreatorOrders }] = await Promise.all([import("./access.ts"), import("../sales/orders.ts")]);
      const token = await approvedCreatorToken(userId);
      if (token) await syncCreatorOrders(userId, token, Date.now() + 25_000);
    } else {
      const { syncMyVideos } = await import("../admin/videos.ts");
      await syncMyVideos(userId);
    }
  })()
    .catch((err) => console.error(`[fresh] ${kind}`, err instanceof Error ? err.message : err))
    .finally(() => running.delete(k));
  running.set(k, p);
  return p;
}

/**
 * Keeps her data current before a page shows it: what was never read is read now, so the page isn't empty; what's over 30
 * minutes old is read again right after the answer, so it's current a moment later. Returns when each was last read.
 */
export async function keepFresh(userId: string, kinds: Kind[] = ["orders", "videos"]): Promise<ReadTimes> {
  const t = await readTimes(userId).catch((): ReadTimes => ({ orders: null, videos: null }));
  const never = kinds.filter((k) => !t[k]);
  const old = kinds.filter((k) => t[k] && Date.now() - Date.parse(t[k]!) > STALE);
  if (old.length) after(() => Promise.all(old.map((k) => readOnce(userId, k))));
  if (!never.length) return t;
  await Promise.all(never.map((k) => readOnce(userId, k)));
  return readTimes(userId).catch(() => t);
}
