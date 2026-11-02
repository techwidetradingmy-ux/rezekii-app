import { getMarketplaceCreator } from "../../integrations/tiktok-shop/seller.ts";
import { storedSessions } from "../refresh/sessions.ts";
import { photoSources } from "../refresh/store.ts";
import { freshUrl, photoPath, saveCreatorPhoto } from "./store.ts";

/**
 * Saves creators' photos now, for a screen that must show them (owner, 1 Nov 2026: Creators Like You always shows a profile
 * photo). A saved profile or marketplace address that still works is copied; otherwise the creator's profile is read again for
 * a new one (a second apart, TikTok's shared limit). Returns the photo address for each creator it saved.
 */
export async function ensurePhotos(users: string[], budgetMs = 9000): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!users.length) return out;
  const deadline = Date.now() + budgetMs;
  const day = new Date().toISOString().slice(0, 10);
  const src = new Map((await photoSources(users).catch(() => [])).map((r) => [r.username.toLowerCase(), r]));
  const soon = (url: string | null | undefined) => freshUrl(url, Date.now(), 10 * 60_000);
  let seller: Awaited<ReturnType<ReturnType<typeof storedSessions>["seller"]>> | null = null;
  for (const u of users.map((x) => x.toLowerCase())) {
    if (Date.now() > deadline) break;
    const r = src.get(u);
    let url = soon(r?.da) ?? soon(r?.ma);
    if (!url && r?.open_id) {
      seller ??= await storedSessions().seller().catch(() => null);
      if (!seller) continue;
      const p = await getMarketplaceCreator(seller.token, seller.cipher, r.open_id).catch(() => null);
      url = p?.code === 0 ? soon((p.data?.creator?.avatar as { url?: string } | undefined)?.url) : null;
      await new Promise((res) => setTimeout(res, 1000));
    }
    if (url && (await saveCreatorPhoto(u, url).catch(() => false))) out.set(u, photoPath(u, day));
  }
  return out;
}
