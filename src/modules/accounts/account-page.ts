import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { dateLocale, type Lang } from "../../lib/i18n/lang.ts";
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
  /** `ttLevel`: TikTok Shop creator level 0-8; `agency`: how TikTok's Creator Marketplace lists them (null until checked). */
  /** `cancelled`: TikTok has cancelled Rezekii's access to it ("deauthorized"), so it has to be linked again. */
  shop: { username: string; avatar: string | null; linkedAt: string | null; approvedAt: string | null; region: string | null; permissions: string[]; ttLevel: number | null; agency: "managed" | "independent" | null; cancelled: boolean } | null;
  sales: SalesSummary | null;
  level: { level: Level; monthSales: number; keep: number; lifetime: number };
  samples: { requested: number; approved: number; shipping: number; toPost: number; posted: number; recent: { name: string; image: string | null; stage: number; status: string | null }[] };
  showcase: number | null;
  now: number;
};

const REGION: Record<string, string> = { MY: "Malaysia", SG: "Singapore", ID: "Indonesia", TH: "Thailand", PH: "Philippines", VN: "Vietnam" };
const PERMISSION: Record<string, string> = { ADD_AFFILIATE_PERMISSION: "Can add affiliate products", LIVE_STREAM_PERMISSION: "Can go LIVE" };
const day = (iso: string | null | undefined, lang: Lang) => (iso ? new Date(iso).toLocaleDateString(dateLocale(lang), { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur" }) : null);

/** TikTok's "your token has been deauthorized": TikTok cancelled the link (seen several times on 16 Oct 2026). */
const DEAUTHORIZED = 36009005;
const profiles = new Map<string, { at: number; region: string | null; permissions: string[]; cancelled: boolean }>();
/** Region and permissions from TikTok Shop's creator profile, kept an hour; and whether TikTok has cancelled the link (not kept). */
async function shopProfile(userId: string) {
  const hit = profiles.get(userId);
  if (hit && Date.now() - hit.at < 3600_000) return hit;
  const token = await approvedCreatorToken(userId);
  const r = token ? await getCreatorProfile(token).catch(() => null) : null;
  const out = { at: Date.now(), region: r?.data?.register_region ? REGION[r.data.register_region] ?? r.data.register_region : null, permissions: (r?.data?.permissions ?? []).map((p) => PERMISSION[p]).filter(Boolean), cancelled: r?.code === DEAUTHORIZED };
  if (r?.code === 0) profiles.set(userId, out);
  return out;
}

/** Everything the Account page shows: profile and TikTok Shop link, 30-day sales, level, samples and settings (dates in `lang`). */
export async function accountPage(user: AppUser, lang: Lang = "en"): Promise<AccountPageData> {
  const tapRows = myTapRows(user.id, user.tiktok_username);
  const [overview, [conn], [access], sales, level, tap, showcase, profile] = await Promise.all([
    accountOverview(user, tapRows, lang),
    supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=username,avatar_url,connected_at,tt_level,agency&limit=1`).then((r) => r.json() as Promise<{ username: string; avatar_url: string | null; connected_at: string; tt_level: number | null; agency: "managed" | "independent" | null }[]>),
    supabaseRest(`creator_access?user_id=eq.${user.id}&select=decided_at,status&limit=1`).then((r) => r.json() as Promise<{ decided_at: string | null; status: string }[]>),
    user.role === "creator" ? salesSummary(user.id, 30) : Promise.resolve(null),
    levelPage(user.id, user.tiktok_username),
    tapRows,
    savedShowcase(user.id),
    user.role === "creator" ? shopProfile(user.id) : Promise.resolve({ region: null, permissions: [] as string[], cancelled: false }),
  ]);
  const withSample = tap.rows.filter((r) => r.stage > 0);
  return {
    overview,
    shop: conn ? { username: conn.username, avatar: conn.avatar_url, linkedAt: day(conn.connected_at, lang), approvedAt: access?.status === "approved" ? day(access.decided_at, lang) : null, region: profile.region, permissions: profile.permissions, ttLevel: conn.tt_level, agency: conn.agency, cancelled: profile.cancelled } : null,
    sales,
    level: { level: level.level, monthSales: level.month?.sales ?? 0, keep: KEEP_MONTHLY, lifetime: level.lifetime },
    samples: {
      requested: withSample.filter((r) => r.stage === 1).length,
      approved: withSample.filter((r) => r.stage === 2).length,
      shipping: withSample.filter((r) => r.stage === 3).length,
      toPost: withSample.filter((r) => r.stage === 4).length,
      posted: withSample.filter((r) => r.stage === 5).length,
      recent: withSample.slice(0, 3).map((r) => ({ name: r.name, image: r.image, stage: r.stage, status: r.request?.tiktok ?? r.status ?? null })),
    },
    showcase: showcase?.count ?? null,
    now: Date.now(),
  };
}
