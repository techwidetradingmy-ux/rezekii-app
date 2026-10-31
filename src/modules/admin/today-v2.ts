import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { systemHealth } from "./health.ts";
import { pendingProducts } from "./tap.ts";
import { supabaseRest as rest } from "../../integrations/supabase/rest.ts";

/** Products waiting for Techwide in every shop's own campaign (read from TikTok). */
async function waitingForReview(): Promise<number> {
  const shops = (await (await rest("seller_connections?campaign_id=not.is.null&select=campaign_id")).json()) as { campaign_id: string }[];
  const n = await Promise.all(shops.map((s) => pendingProducts(s.campaign_id).then((r) => r.products.length).catch(() => 0)));
  return n.reduce((t, x) => t + x, 0);
}
import { listActivity } from "./admins.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const enc = encodeURIComponent;
const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};
const rows = async <T>(path: string): Promise<T[]> => (await (await supabaseRest(path)).json()) as T[];

export type Queue = { key: string; n: number; label: string; note: string };
export type Kpi = { label: string; today: number; yesterday: number; series: number[]; note: string };
export type Mine = { key: string; title: string; note: string; tag: string; late: boolean };
export type AdminTodayV2 = { queues: Queue[]; kpis: Kpi[]; mine: Mine[]; actions: { at: string; actor: string; what: string }[]; at: string };

/** 14 Malaysia days of one count, oldest first, from a list of timestamps. */
function perDay(times: (string | null)[]): number[] {
  const today = Math.floor((Date.now() + MYT) / DAY);
  const out = Array<number>(14).fill(0);
  for (const t of times) {
    if (!t) continue;
    const ago = today - Math.floor((Date.parse(t) + MYT) / DAY);
    if (ago >= 0 && ago < 14) out[13 - ago] += 1;
  }
  return out;
}

/**
 * The admin Today page on real data (owner, 31 Oct 2026): what's waiting for a person, today's numbers against yesterday
 * with 14 days of trend, what's assigned to this admin, and the latest staff actions. All from Rezekii's own records.
 */
export async function adminTodayV2(actor: string): Promise<AdminTodayV2> {
  const since = new Date(Date.now() - 14 * DAY).toISOString();
  const twoDays = new Date(Date.now() - 2 * DAY).toISOString();
  const week = new Date(Date.now() - 7 * DAY).toISOString();
  const [submitted, inReview, overdue, samples, waitlist, custom, failedPosts, failedSocial, wishes, users, links, posted, social, joined, open, actions] = await Promise.all([
    count("tap_submissions?status=eq.submitted&select=id"),
    count("tap_submissions?status=in.(in_review,approved)&select=id"),
    count(`tap_submissions?status=in.(submitted,in_review)&created_at=lt.${enc(twoDays)}&select=id`),
    count("sample_requests?status=eq.requested&select=id"),
    count("creator_access?status=eq.waitlist&select=user_id"),
    count("custom_requests?status=eq.new&select=id"),
    count(`posts?status=eq.failed&updated_at=gte.${enc(week)}&select=id`),
    count(`social_posts?status=eq.failed&updated_at=gte.${enc(week)}&select=id`),
    count("wishes?declined_at=is.null&launched_at=is.null&select=id"),
    rows<{ created_at: string; role: string }>(`app_users?created_at=gte.${enc(since)}&select=created_at,role&limit=5000`),
    rows<{ connected_at: string | null }>(`affiliate_connections?connected_at=gte.${enc(since)}&select=connected_at&limit=5000`),
    rows<{ posted_at: string | null }>(`posts?status=eq.posted&posted_at=gte.${enc(since)}&select=posted_at&limit=5000`),
    rows<{ posted_at: string | null }>(`social_posts?posted_at=gte.${enc(since)}&select=posted_at&limit=5000`),
    rows<{ joined_at: string | null }>(`referrals?joined_at=gte.${enc(since)}&select=joined_at&limit=5000`),
    rows<{ id: string; product_name: string | null; status: string; created_at: string; owner_name: string | null }>(
      `tap_submissions?owner_name=eq.${enc(actor)}&status=in.(submitted,in_review,approved,with_tiktok)&select=id,product_name,status,created_at,owner_name&order=created_at&limit=20`,
    ),
    listActivity(6).catch(() => []),
  ]);
  // Something to fix (owner, 31 Oct 2026: who tells us when the daily refresh fails?): failed refresh steps, a lost connection,
  // and products shops registered that wait for Techwide.
  const [health, toReview] = await Promise.all([systemHealth().catch(() => null), waitingForReview().catch(() => 0)]);
  const problems = health ? health.lines.filter((l) => !l.ok).length : 1;

  const queues: Queue[] = [
    { key: "tap-new", n: submitted, label: "New TAP requests", note: "Sent by sellers, not reviewed yet" },
    { key: "tap-late", n: overdue, label: "Overdue reviews", note: "Waiting over 2 days" },
    { key: "tap-review", n: inReview, label: "In review", note: "Being checked or ready for TikTok" },
    { key: "samples", n: samples, label: "Sample requests", note: "Asked for on Rezekii" },
    { key: "access", n: waitlist, label: "Creators waiting", note: "On the waitlist for access" },
    { key: "custom", n: custom, label: "Custom Service requests", note: "New, not contacted yet" },
    { key: "posts", n: failedPosts + failedSocial, label: "Failed posts", note: "Last 7 days" },
    { key: "wishes", n: wishes, label: "Wish List", note: "Wishes for products not on Rezekii" },
    { key: "system", n: problems, label: "System problems", note: health ? health.lines.filter((l) => !l.ok).map((l) => `${l.label}: ${l.value}`).join(" · ") || "All running" : "Couldn't check" },
    { key: "review", n: toReview, label: "Products to review", note: "Shops registered them in Seller Center" },
  ];

  const kpi = (label: string, times: (string | null)[], note: string): Kpi => {
    const series = perDay(times);
    return { label, today: series[13], yesterday: series[12], series, note };
  };
  const signups = users.filter((u) => u.role !== "admin");
  const kpis: Kpi[] = [
    kpi("Sign-ups", signups.map((u) => u.created_at), "New accounts"),
    kpi("TikTok Shop links", links.map((l) => l.connected_at), "Creators who linked"),
    kpi("Posts", [...posted.map((p) => p.posted_at), ...social.map((p) => p.posted_at)], "Sent out with Post Everywhere"),
    kpi("Invites joined", joined.map((j) => j.joined_at), "Friends who signed up with a link"),
  ];

  const mine: Mine[] = open.map((r) => {
    const late = (r.status === "submitted" || r.status === "in_review") && r.created_at < twoDays;
    return { key: r.id, title: r.product_name ?? "TAP request", note: `${r.status.replace("_", " ")} · since ${new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kuala_Lumpur" })}`, tag: late ? "Overdue" : "Open", late };
  });

  return { queues, kpis, mine, actions: actions.map((a) => ({ at: a.at, actor: a.actor, what: a.what })), at: new Date().toISOString() };
}
