import { NextResponse, type NextRequest } from "next/server";
import { detailsMissing } from "@/modules/rewards/profiles.ts";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { keepFresh } from "@/modules/creator-accounts/fresh.ts";
import { aiPicks, type Pick } from "@/modules/picks/ai.ts";
import type { Channel } from "@/modules/picks/mine.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { herOffers, type HerOffers } from "@/modules/tap/for-creator.ts";
import { keepRatings } from "@/modules/tap/product-facts.ts";
import { getLang, tFor } from "@/lib/i18n/server";
import type { T } from "@/lib/i18n/lang";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const FRESH_MS = 6 * 3600_000;
const NO_STORE = { headers: { "cache-control": "private, no-store" } };
const FREE = "Free sample through Rezekii";

/**
 * Free samples from her own TikTok check, as the Marketplace shows them, and no product TikTok refused to add for her (owner,
 * 2 Nov 2026). Applied to saved picks too; a pick's reason says the same as its badge.
 */
function forHer(picks: Pick[], her: HerOffers): Pick[] {
  return picks.filter((p) => !her.refused[p.id]).map((p) => {
    if (p.source !== "rezekii" || !her.offers) return p;
    const samples = her.offers[p.id] === 2 ? 1 : 0;
    return { ...p, samples, why: p.why.map((w) => (w === FREE && !samples ? "Rezekii campaign" : w === "Rezekii campaign" && samples ? FREE : w)) };
  });
}

/**
 * A pick's reason in her language (owner, 3 Nov 2026). Picks are saved in English for 6 hours, so each reason is read back
 * from that and written as a whole line; the category names are TikTok's own.
 */
function whyLine(t: T, w: string): string {
  let m: RegExpExecArray | null;
  if ((m = /^(.+) is (\d+)% of your sales$/.exec(w))) return t("{category} is {n}% of your sales", { category: m[1], n: m[2] });
  if ((m = /^In (.+), your main category$/.exec(w))) return t("In {category}, your main category", { category: m[1] });
  if ((m = /^Top (\d+) on TikTok in (.+), last 30 days$/.exec(w))) return t("Top {n} on TikTok in {category}, last 30 days", { n: m[1], category: m[2] });
  if ((m = /^In (\d+) of TikTok's top-selling videos this week$/.exec(w))) return t("In {n} of TikTok's top-selling videos this week", { n: m[1] });
  if ((m = /^Rated (.+)★$/.exec(w))) return t("Rated {n}★", { n: m[1] });
  if (w === "In your price range") return t("In your price range");
  if (w === FREE) return t("Free sample through Rezekii");
  if (w === "Rezekii campaign") return t("Rezekii campaign");
  return w;
}
const local = <D extends { picks?: Pick[]; peersWhy?: string }>(t: T, d: D): D => ({ ...d, picks: d.picks?.map((p) => ({ ...p, why: p.why.map((w) => whyLine(t, w)) })), ...(d.peersWhy ? { peersWhy: t(d.peersWhy) } : {}) });

/**
 * AI Picks (owner, 31 Oct 2026): her account analysed from the last 30 days, and the products that fit her best.
 * ?channel=all|video|live (Overall by default). Saved per account and tab (owner, 1 Nov 2026): a reload shows the saved picks
 * at once (`saved: true`); they run again after 6 hours or on ?fresh=1. `ms` is how long the last run took, so the page can
 * pace its steps to it.
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams.get("channel");
  const channel: Channel = q === "video" || q === "live" ? q : "all";
  // Locked until her details are complete (owner, 31 Oct 2026).
  const [missing, [hit], her] = await Promise.all([
    detailsMissing(user.id).catch(() => null),
    supabaseRest(`ai_picks_cache?user_id=eq.${user.id}&channel=eq.${channel}&select=data,at,ms&limit=1`).then((r) => r.json() as Promise<{ data: Awaited<ReturnType<typeof aiPicks>>; at: string; ms: number | null }[]>).catch(() => []),
    herOffers(user.id),
  ]);
  if (missing) return NextResponse.json({ linked: true, locked: missing });
  if (hit && !req.nextUrl.searchParams.get("fresh") && Date.now() - Date.parse(hit.at) < FRESH_MS) return NextResponse.json(local(t, { ...hit.data, picks: forHer(hit.data.picks ?? [], her), saved: true, ms: hit.ms }), NO_STORE);
  const token = await approvedCreatorToken(user.id);
  if (!token) return NextResponse.json({ linked: false });
  const started = Date.now();
  await keepFresh(user.id, ["orders"]);
  const r = await aiPicks(user.id, token, user.tiktok_username ?? null, channel);
  const ms = Date.now() - started;
  // Their TikTok ratings are kept too, so Marketplace cards can show them (owner, 2 Nov 2026).
  await Promise.all([
    supabaseRest("ai_picks_cache?on_conflict=user_id,channel", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ user_id: user.id, channel, data: r, at: r.at, ms }),
    }).catch(() => undefined),
    keepRatings(r.picks).catch(() => undefined),
  ]);
  return NextResponse.json(local(t, { ...r, picks: forHer(r.picks, her), saved: false, ms }), NO_STORE);
}
