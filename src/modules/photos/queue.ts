import { supabaseRest } from "../../integrations/supabase/rest.ts";

/**
 * Creators whose photo a screen needed but Rezekii hasn't saved yet (owner, 1 Nov 2026: every creator shows a profile photo).
 * The daily photo task saves these first. Kept for 7 days; a saved photo drops out on its own.
 */
const KEY = "photo_queue";
const KEEP_DAYS = 7;

async function read(): Promise<Record<string, string>> {
  const [row] = (await (await supabaseRest(`app_settings?key=eq.${KEY}&select=value&limit=1`)).json().catch(() => [])) as { value: Record<string, string> }[];
  return row?.value ?? {};
}

/** Adds creators (TikTok usernames) to the front of the photo queue. */
export async function queuePhotos(users: string[]): Promise<void> {
  const add = [...new Set(users.map((u) => u.toLowerCase()).filter((u) => /^[a-z0-9._]{1,40}$/.test(u)))];
  if (!add.length) return;
  const now = await read();
  const day = new Date().toISOString().slice(0, 10);
  let changed = false;
  for (const u of add) if (!now[u]) { now[u] = day; changed = true; }
  if (!changed) return;
  await supabaseRest("app_settings?on_conflict=key", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ key: KEY, value: now, updated_at: new Date().toISOString() }),
  });
}

/** The queued creators from the last 7 days. */
export async function queuedPhotos(): Promise<string[]> {
  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString().slice(0, 10);
  return Object.entries(await read()).filter(([, day]) => day >= cutoff).map(([u]) => u);
}
