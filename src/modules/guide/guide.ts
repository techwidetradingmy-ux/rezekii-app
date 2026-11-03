import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { connectionForUser } from "../creator-accounts/affiliate-connections.ts";

/**
 * Beginner guide (owner, 4 Nov 2026): the Welcome Tour shows once per account, and the Getting Started card ticks each first
 * step from real data (nothing is ticked by hand) until it's all done or she closes it. Kept in app_users.guide_seen.
 */
export type GuideSide = "creator" | "seller";
export type GuideMark = "tour" | "list";
export type GuideStep = { id: string; done: boolean };

const rows = async <T>(path: string): Promise<T[]> => (await supabaseRest(path)).json() as Promise<T[]>;

export async function guideSeen(userId: string): Promise<Record<string, string>> {
  const [u] = await rows<{ guide_seen: Record<string, string> | null }>(`app_users?id=eq.${userId}&select=guide_seen&limit=1`);
  return u?.guide_seen ?? {};
}

/** Notes that she finished or skipped the tour, or closed the Getting Started card, on this side. */
export async function markGuide(userId: string, side: GuideSide, mark: GuideMark): Promise<void> {
  const seen = await guideSeen(userId);
  const key = `${mark}_${side}`;
  if (seen[key]) return;
  await supabaseRest(`app_users?id=eq.${userId}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ guide_seen: { ...seen, [key]: new Date().toISOString() } }) });
}

/** The first steps, in order, each done or not from what Rezekii can really see. */
export async function firstSteps(userId: string, side: GuideSide): Promise<GuideStep[]> {
  if (side === "creator") {
    const [prof, link, conn, samples] = await Promise.all([
      rows<{ complete: boolean }>(`profiles?user_id=eq.${userId}&side=eq.creator&complete=is.true&select=complete&limit=1`),
      // Linked the way the rest of the app counts it, so this agrees with the Link TikTok Shop banner.
      connectionForUser(userId),
      rows<{ showcase_at: string | null }>(`affiliate_connections?user_id=eq.${userId}&select=showcase_at&order=updated_at.desc&limit=1`),
      rows<{ id: string }>(`sample_requests?user_id=eq.${userId}&select=id&limit=1`),
    ]);
    return [
      { id: "profile", done: prof.length > 0 },
      { id: "shop", done: !!link },
      { id: "scan", done: !!link && !!conn[0]?.showcase_at },
      { id: "sample", done: samples.length > 0 },
    ];
  }
  const [shops, subs, invites] = await Promise.all([
    rows<{ shop_id: string }>(`seller_connections?connected_by=eq.${userId}&select=shop_id&limit=1`),
    rows<{ product_id: string }>(`tap_submissions?submitted_by=eq.${userId}&select=product_id&limit=1`),
    rows<{ friend_id: string }>(`referrals?inviter_id=eq.${userId}&select=friend_id&limit=1`),
  ]);
  return [
    { id: "connect", done: shops.length > 0 },
    { id: "register", done: subs.length > 0 },
    { id: "invite", done: invites.length > 0 },
  ];
}
