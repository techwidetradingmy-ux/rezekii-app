import { supabaseRest } from "../../integrations/supabase/rest.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const enc = encodeURIComponent;
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];
const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};
const distinct = (list: { id: string | null }[]) => new Set(list.map((r) => r.id).filter(Boolean)).size;

/** 30 Malaysia days of one event, oldest first. */
function perDay(times: (string | null)[]): number[] {
  const today = Math.floor((Date.now() + MYT) / DAY);
  const out = Array<number>(30).fill(0);
  for (const t of times) {
    if (!t) continue;
    const ago = today - Math.floor((Date.parse(t) + MYT) / DAY);
    if (ago >= 0 && ago < 30) out[29 - ago] += 1;
  }
  return out;
}

/**
 * Platform analytics from Rezekii's own records (owner, 31 Oct 2026): how far creators and sellers get (all time), and the
 * main events per day for the last 30 days. Nothing estimated.
 */
export async function analyticsV2() {
  const since = new Date(Date.now() - 30 * DAY).toISOString();
  const [creators, linked, approved, posted, socialPosted, sampled, sellerProfiles, shops, submitted, live, users, links, posts, social, samples, wishes] = await Promise.all([
    count("app_users?role=eq.creator&select=id"),
    rows<{ id: string | null }>("affiliate_connections?user_id=not.is.null&select=id:user_id&limit=10000"),
    count("creator_access?status=eq.approved&select=user_id"),
    rows<{ id: string | null }>("posts?status=eq.posted&select=id:user_id&limit=10000"),
    rows<{ id: string | null }>("social_posts?posted_at=not.is.null&select=id:user_id&limit=10000"),
    rows<{ id: string | null }>("sample_requests?select=id:user_id&limit=10000"),
    count("profiles?side=eq.seller&complete=eq.true&select=user_id"),
    count("seller_connections?select=shop_id"),
    rows<{ id: string | null }>("tap_submissions?select=id:shop_id&limit=10000"),
    rows<{ id: string | null }>("tap_submissions?status=eq.live&select=id:shop_id&limit=10000"),
    rows<{ created_at: string }>(`app_users?role=neq.admin&created_at=gte.${enc(since)}&select=created_at&limit=10000`),
    rows<{ connected_at: string | null }>(`affiliate_connections?connected_at=gte.${enc(since)}&select=connected_at&limit=10000`),
    rows<{ posted_at: string | null }>(`posts?status=eq.posted&posted_at=gte.${enc(since)}&select=posted_at&limit=10000`),
    rows<{ posted_at: string | null }>(`social_posts?posted_at=gte.${enc(since)}&select=posted_at&limit=10000`),
    rows<{ created_at: string }>(`sample_requests?created_at=gte.${enc(since)}&select=created_at&limit=10000`),
    rows<{ created_at: string }>(`wishes?created_at=gte.${enc(since)}&select=created_at&limit=10000`),
  ]);
  const postedPeople = new Set([...posted, ...socialPosted].map((r) => r.id).filter(Boolean)).size;
  return {
    funnels: {
      Creators: [["Signed up", creators], ["Linked TikTok Shop", distinct(linked)], ["Approved", approved], ["Posted with Rezekii", postedPeople], ["Asked for a sample", distinct(sampled)]] as [string, number][],
      Sellers: [["Filled in details", sellerProfiles], ["Connected Seller Center", shops], ["Submitted products", distinct(submitted)], ["Product live in TAP", distinct(live)]] as [string, number][],
    },
    events: {
      "Sign-ups": perDay(users.map((u) => u.created_at)),
      "TikTok Shop links": perDay(links.map((l) => l.connected_at)),
      Posts: perDay([...posts.map((p) => p.posted_at), ...social.map((p) => p.posted_at)]),
      "Sample requests": perDay(samples.map((s) => s.created_at)),
      "Wishes": perDay(wishes.map((w) => w.created_at)),
    } as Record<string, number[]>,
  };
}
