/**
 * Picking channels in New post (docs/flows/social-posting.md B1–B8), kept free of I/O. A channel key is a social account
 * id or "tiktok:<open_id>". A post goes to at most one TikTok account, since each TikTok post is its own upload.
 */
export const TIKTOK_PREFIX = "tiktok:";
export const tiktokKey = (openId: string) => TIKTOK_PREFIX + openId;
export const isTikTokKey = (key: string) => key.startsWith(TIKTOK_PREFIX);
export const openIdOf = (key: string) => key.slice(TIKTOK_PREFIX.length);
export const BRAND_NAME_MAX = 60;
export const BRANDS_MAX = 50;

/** Only connected channels count; a second TikTok account replaces the first. */
export function cleanPick(keys: Iterable<string>, connected: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const k of keys) {
    if (!connected.has(k)) continue;
    if (isTikTokKey(k)) for (const o of out) if (isTikTokKey(o)) out.delete(o);
    out.add(k);
  }
  return out;
}

/** Turns one channel on or off. */
export function toggleChannel(picked: Set<string>, key: string, connected: Set<string>): Set<string> {
  if (picked.has(key)) return new Set([...picked].filter((k) => k !== key));
  return cleanPick([...picked, key], connected);
}

/** A brand's channels that are still connected. */
export const brandChannels = (channels: string[], connected: Set<string>) => channels.filter((k) => connected.has(k));

/** A brand shows as picked when every one of its connected channels is picked. */
export function brandPicked(channels: string[], picked: Set<string>, connected: Set<string>): boolean {
  const live = brandChannels(channels, connected);
  return live.length > 0 && live.every((k) => picked.has(k));
}

/** Picking a brand adds its channels; picking it again takes them off. */
export function toggleBrand(picked: Set<string>, channels: string[], connected: Set<string>): Set<string> {
  const live = brandChannels(channels, connected);
  if (brandPicked(channels, picked, connected)) return new Set([...picked].filter((k) => !live.includes(k)));
  return cleanPick([...picked, ...live], connected);
}

/** Checks a brand from the browser: a name and at least one of the owner's own channels. */
export function brandInput(body: { name?: unknown; channels?: unknown }, mine: Set<string>): { name: string; channels: string[] } | { error: string } {
  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  if (!name) return { error: "Give the brand a name." };
  if (name.length > BRAND_NAME_MAX) return { error: `Brand names can be up to ${BRAND_NAME_MAX} characters.` };
  const list = Array.isArray(body.channels) ? body.channels.filter((k): k is string => typeof k === "string") : [];
  const channels = [...new Set(list)].filter((k) => mine.has(k));
  if (!channels.length) return { error: "Pick at least one channel for the brand." };
  return { name, channels };
}
