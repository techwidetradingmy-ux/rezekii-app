import { rankings, savedLevels } from "./store.ts";

let cache: { at: number; map: Map<string, number> } | null = null;
let fromBuilt: { asOf: string; map: Map<string, number> } | null = null;

/**
 * TikTok Shop creator levels (0-8) by lower-case username, from the built rankings (the daily build reads them once).
 * Rankings built before levels were added read them straight from the creators table, kept 10 minutes. Creators the
 * monthly level pass hasn't reached yet are missing (no ring is shown for them).
 */
export async function levelMap(): Promise<Map<string, number>> {
  const built = await rankings().catch(() => null);
  if (built?.lv) {
    if (fromBuilt?.asOf !== built.asOf) fromBuilt = { asOf: built.asOf, map: new Map(Object.entries(built.lv)) };
    return fromBuilt.map;
  }
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.map;
  cache = { at: Date.now(), map: new Map(Object.entries(await savedLevels())) };
  return cache.map;
}
