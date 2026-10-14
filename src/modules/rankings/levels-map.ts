import { supabaseRest } from "../../integrations/supabase/rest.ts";

let cache: { at: number; map: Map<string, number> } | null = null;

/**
 * TikTok Shop creator levels (0-8) found by the monthly Creator Marketplace level pass, by lower-case username; kept 10 minutes.
 * Creators the pass hasn't reached yet are missing (no ring is shown for them).
 */
export async function levelMap(): Promise<Map<string, number>> {
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.map;
  const map = new Map<string, number>();
  for (let offset = 0; ; offset += 1000) {
    const page = (await (await supabaseRest(`market_creators?tt_level=not.is.null&select=username,tt_level&order=username&offset=${offset}&limit=1000`)).json()) as { username: string | null; tt_level: number }[];
    for (const r of page) if (r.username) map.set(r.username.toLowerCase(), r.tt_level);
    if (page.length < 1000) break;
  }
  cache = { at: Date.now(), map };
  return map;
}
