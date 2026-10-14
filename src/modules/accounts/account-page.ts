import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { getCreatorProfile } from "../../integrations/tiktok-shop/creator.ts";
import { approvedCreatorToken } from "../creator-accounts/access.ts";
import { KEEP_MONTHLY, type Level } from "../levels/rules.ts";
import { levelPage } from "../levels/store.ts";
import { salesSummary, type SalesSummary } from "../sales/summary.ts";
import { savedShowcase } from "../tap/showcase.ts";
import { myTapRows } from "../tap/mytap.ts";
import { accountOverview, type AccountOverview } from "./manage.ts";
import type { AppUser } from "./users.ts";

export type AccountPageData = {
  overview: AccountOverview;
  /** The linked TikTok Shop creator account, as TikTok Shop describes it. */
  shop: { username: string; avatar: string | null; linkedAt: string | null; approvedAt: string | null; region: string | null; permissions: string[] } | null;
  sales: SalesSummary | null;
  level: { level: Level; monthSales: number; keep: number; lifetime: number };
  samples: { requested: number; shipping: number; toPost: number; posted: number; recent: { name: string; image: string | null; stage: number }[] };
  showcase: number | null;
  now: number;
};

const REGION: Record<string, string> = { MY: "Malaysia", SG: "Singapore", ID: "Indonesia", TH: "Thailand", PH: "Philippines", VN: "Vietnam" };
const PERMISSION: Record<string, string> = { ADD_AFFILIATE_PERMISSION: "Can add affiliate products", LIVE_STREAM_PERMISSION: "Can go LIVE" };
const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null);

const profiles = new Map<string, { at: number; region: string | null; permissions: string[] }>();
/** Region and permissions from TikTok Shop's creator profile, kept an hour. */
async function shopProfile(userId: string) {
  const hit = profiles.get(userId);
  if (hit && Date.now() - hit.at < 3600_000) return hit;
  const token = await approvedCreatorToken(userId);
  const r = token ? await getCreatorProfile(token).catch(() => null) : null;
  const out = { at: Date.now(), region: r?.data?.register_region ? REGION[r.data.register_region] ?? r.data.register_region : null, permissions: (r?.data?.permissions ?? []).map((p) => PERMISSION[p]).filter(Boolean) };
  if (r?.code === 0) profiles.set(userId, out);
  return out;
}

/** Everything the Account page shows: profile and TikTok Shop link, 30-day sales, level, samples and settings. */
export async function accountPage(user: AppUser): Promise<AccountPageData> {
  const [overview, [conn], [access], sales, level, tap, showcase, profile] = await Promise.all([
    accountOverview(user),
    supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=username,avatar_url,connected_at&limit=1`).then((r) => r.json() as Promise<{ username: string; avatar_url: string | null; connected_at: string }[]>),
    supabaseRest(`creator_access?user_id=eq.${user.id}&select=decided_at,status&limit=1`).then((r) => r.json() as Promise<{ decided_at: string | null; status: string }[]>),
    user.role === "creator" ? salesSummary(user.id, 30) : Promise.resolve(null),
    levelPage(user.id, user.tiktok_username),
    myTapRows(user.id, user.tiktok_username),
    savedShowcase(user.id),
    user.role === "creator" ? shopProfile(user.id) : Promise.resolve({ region: null, permissions: [] as string[] }),
  ]);
  const withSample = tap.rows.filter((r) => r.stage > 0);
  return {
    overview,
    shop: conn ? { username: conn.username, avatar: conn.avatar_url, linkedAt: day(conn.connected_at), approvedAt: access?.status === "approved" ? day(access.decided_at) : null, region: profile.region, permissions: profile.permissions } : null,
    sales,
    level: { level: level.level, monthSales: level.month?.sales ?? 0, keep: KEEP_MONTHLY, lifetime: level.lifetime },
    samples: {
      requested: withSample.filter((r) => r.stage === 1).length,
      shipping: withSample.filter((r) => r.stage === 2).length,
      toPost: withSample.filter((r) => r.stage === 3).length,
      posted: withSample.filter((r) => r.stage === 4).length,
      recent: withSample.slice(0, 3).map((r) => ({ name: r.name, image: r.image, stage: r.stage })),
    },
    showcase: showcase?.count ?? null,
    now: Date.now(),
  };
}
