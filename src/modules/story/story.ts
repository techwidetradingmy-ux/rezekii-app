import { supabaseRest } from "../../integrations/supabase/rest.ts";
import { dateLocale, tx, type Lang, type Vars } from "../../lib/i18n/lang.ts";
import { translate } from "../../lib/i18n/translate.ts";
import type { StoryPage } from "../../lib/daily-story.ts";
import { wallet } from "../rewards/ledger.ts";
import { codeFor } from "../rewards/referrals.ts";
import { REFERRAL_REWARD } from "../rewards/rules.ts";
import { linesBetween, productImages } from "../sales/frames.ts";
import { lineEarned, lineGmv } from "../sales/summary.ts";
import { commissionRaises } from "../tap/raises.ts";

/**
 * A story page as it's saved (owner, 3 Nov 2026: the story follows her language): its words are English lines with {names},
 * and `vars` holds what fills them (`day` is the story's date). They're written in her language each time the story is read
 * (storyIn), so switching language changes the saved story too. Share captions are kept as written.
 */
export type SavedPage = StoryPage & { vars?: Vars };

/** The saved story in `lang`. Pages saved before vars existed are English already: their fixed lines still translate. */
export function storyIn(pages: SavedPage[], lang: Lang): StoryPage[] {
  return pages.map(({ vars, ...p }) => {
    const v: Vars = { ...vars };
    if (typeof v.day === "string") v.date = new Date(`${v.day}T12:00:00Z`).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const w = (s: string) => translate(lang, s, v);
    return {
      ...p, kick: w(p.kick), big: w(p.big), head: w(p.head),
      ...(p.sub !== undefined ? { sub: w(p.sub) } : {}),
      ...(p.lines ? { lines: p.lines.map((l) => ({ ...l, text: w(l.text) })) } : {}),
      ...(p.cta ? { cta: { ...p.cta, label: w(p.cta.label) } } : {}),
    };
  });
}

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const tags = "#RezekiiAffiliate #RezekiiMY";
const rm = (n: number, d = 0) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
/** A product title short enough for a story page: no [promo] prefix, first part only, 40 characters at most. */
const short = (n: string) => {
  const t = n.replace(/^(\s*[\[(【][^\])】]*[\])】]\s*)+/, "").split(/\s[\/|(（,]\s?|\s-\s/)[0].replace(/\s+/g, " ").trim() || n;
  return t.length > 40 ? `${t.slice(0, 38).trimEnd()}…` : t;
};
const cancelled = (s: string | null) => /REFUND|RETURN|CANCEL|INELIGIBLE|INVALID/i.test(s ?? "");
const APPS: Record<string, string> = { tiktok: "TikTok", facebook: "Facebook", instagram: "Instagram", threads: "Threads" };
const count = async (path: string) => {
  const res = await supabaseRest(path, { headers: { prefer: "count=exact", range: "0-0" } });
  return Number((res.headers.get("content-range") ?? "*/0").split("/")[1]) || 0;
};

type User = { id: string; display_name: string | null; tiktok_username: string | null };

/**
 * Her Daily Story from real data (owner, 31 Oct 2026): yesterday (Malaysia day) against her usual, what sold, what went out,
 * what needs her, and totals. Only pages with something true to say are shown; the sample story's trend and golden-time pages
 * have no real source yet, so they're left out.
 */
export async function storyOf(user: User, origin: string): Promise<SavedPage[]> {
  // The story day starts at 8 AM Malaysia time (00:00 UTC), when the last Malaysia day is complete: "yesterday" is that day.
  const today = Math.floor(Date.now() / DAY);
  const yStart = (today - 1) * DAY - MYT;
  const yEnd = today * DAY - MYT;
  // Yesterday's Malaysia date (YYYY-MM-DD), written in her language when the story is read.
  const day = new Date(yStart + MYT).toISOString().slice(0, 10);
  const yIso = [new Date(yStart).toISOString(), new Date(yEnd).toISOString()].map(encodeURIComponent);

  const [lines, w, code, raises, postsY, socialY, failedY, socialFailedY, joinedY, postsAll, socialAll, total] = await Promise.all([
    linesBetween(user.id, yStart - 7 * DAY, yEnd).catch(() => []),
    wallet(user.id, "creator").catch(() => null),
    codeFor(user),
    // From her last scan: the story never scans her showcase itself (owner, 2 Nov 2026).
    commissionRaises(user.id).catch(() => null),
    count(`posts?user_id=eq.${user.id}&status=eq.posted&posted_at=gte.${yIso[0]}&posted_at=lt.${yIso[1]}&select=id`),
    (await supabaseRest(`social_posts?user_id=eq.${user.id}&posted_at=gte.${yIso[0]}&posted_at=lt.${yIso[1]}&select=platform`)).json() as Promise<{ platform: string }[]>,
    count(`posts?user_id=eq.${user.id}&status=eq.failed&updated_at=gte.${yIso[0]}&updated_at=lt.${yIso[1]}&select=id`),
    count(`social_posts?user_id=eq.${user.id}&status=eq.failed&updated_at=gte.${yIso[0]}&updated_at=lt.${yIso[1]}&select=id`),
    count(`referrals?inviter_id=eq.${user.id}&side=eq.creator&joined_at=gte.${yIso[0]}&joined_at=lt.${yIso[1]}&select=friend_id`),
    count(`posts?user_id=eq.${user.id}&status=eq.posted&select=id`),
    count(`social_posts?user_id=eq.${user.id}&posted_at=not.is.null&select=id`),
    supabaseRest("rpc/commission_total", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ p_user: user.id }) }).then((r) => r.json()).then(Number).catch(() => 0),
  ]);

  // Nothing yet (a new creator: no orders in 8 days, no posts, no friends joined): no story at all.
  if (!lines.length && !postsY && !socialY.length && !joinedY && !postsAll && !socialAll) return [];

  // Yesterday against the 7 days before it.
  const startOf = (t: string) => Math.floor((Date.parse(t) + MYT) / DAY);
  let gmv = 0, commission = 0;
  const yOrders = new Set<string>();
  const before = [0, 0, 0, 0, 0, 0, 0];
  const byProduct = new Map<string, { name: string; orders: Set<string>; bad: Set<string> }>();
  const yProduct = new Map<string, { name: string; orders: Set<string> }>();
  for (const l of lines) {
    const day = startOf(l.created_at);
    if (l.product_id) {
      const p = byProduct.get(l.product_id) ?? byProduct.set(l.product_id, { name: short(l.product_name ?? "Product"), orders: new Set(), bad: new Set() }).get(l.product_id)!;
      p.orders.add(l.order_id);
      if (cancelled(l.status)) p.bad.add(l.order_id);
    }
    if (day === today - 1) {
      gmv += lineGmv(l);
      commission += lineEarned(l);
      if (lineGmv(l) > 0) yOrders.add(l.order_id);
      if (l.product_id && lineGmv(l) > 0) (yProduct.get(l.product_id) ?? yProduct.set(l.product_id, { name: short(l.product_name ?? "Product"), orders: new Set() }).get(l.product_id)!).orders.add(l.order_id);
    } else if (day >= today - 8 && day < today - 1) before[today - 2 - day] += lineGmv(l);
  }
  const avg = before.reduce((a, b) => a + b, 0) / 7;
  const change = avg > 0 ? Math.round(((gmv - avg) / avg) * 100) : 0;
  const [topId, top] = [...yProduct.entries()].sort((a, b) => b[1].orders.size - a[1].orders.size)[0] ?? [];
  const [riskId, risk] = [...byProduct.entries()].filter(([, p]) => p.orders.size >= 5 && p.bad.size / p.orders.size > 0.1).sort((a, b) => b[1].bad.size / b[1].orders.size - a[1].bad.size / a[1].orders.size)[0] ?? [];
  const imgs = await productImages(user.id, [topId, riskId].filter((x): x is string => !!x)).catch(() => new Map<string, string | null>());
  const img = (id?: string) => (id ? imgs.get(id) ?? undefined : undefined);
  const riskRate = risk ? Math.round((risk.bad.size / risk.orders.size) * 100) : 0;

  const link = `${origin.replace(/^https?:\/\//, "")}/r/${code}`;
  const invite = ` Try it free with my link: ${link}`;
  const first = (user.display_name ?? user.tiktok_username ?? "there").split(/\s+/)[0];
  const streak = w?.streak ?? 0;
  const apps = [...new Set(socialY.map((s) => APPS[s.platform] ?? s.platform))];
  const postedY = postsY + socialY.length;
  const failed = failedY + socialFailedY;
  const sorted = (raises ?? []).sort((a, b) => b.tapRate - b.nowRate - (a.tapRate - a.nowRate));
  const best = sorted[0];
  const pct = (r: number) => `${r / 100}%`;

  // Every line is a whole English line with {names}, filled in her language when the story is read (storyIn). Product and app
  // names, RM amounts and percentages are kept as they are. Share captions stay as written (they're what she posts).
  const good: SavedPage[] = [];
  const heads: SavedPage[] = [];
  const steady: SavedPage[] = [];
  const vs = { gmv: rm(gmv), avg: rm(avg) };
  if (avg > 0 && gmv >= avg * 1.5) good.push({ id: "gmv", tone: "good", pose: "dance", motion: "bounce", kick: tx("GMV spike"), big: `+${change}%`, head: tx("GMV jumped yesterday"), sub: tx("{gmv} vs your usual {avg}"), vars: vs, money: true, cta: { label: tx("See what sold"), href: "/app/data" }, caption: `My TikTok Shop GMV jumped ${change}% yesterday 🕺 ${tags}${invite}` });
  if (top) good.push({ id: "top", tone: "good", pose: "love", motion: "pop", kick: tx("Best seller yesterday"), big: top.orders.size === 1 ? tx("{n} order") : tx("{n} orders"), vars: { n: top.orders.size }, head: top.name, img: img(topId), cta: { label: tx("Performance"), href: "/app/data/performance#product" }, caption: `My best seller yesterday: ${top.name} 🛍️ ${tags}${invite}` });
  if (sorted.length && best) {
    good.push({ id: "scan", tone: "good", pose: "found", motion: "wiggle", kick: tx("Showcase scan"), big: String(sorted.length), head: sorted.length === 1 ? tx("product can pay you more") : tx("products can pay you more"), sub: tx("Found in your TikTok Shop showcase"), cta: { label: tx("Add them"), href: "/app" }, caption: `Rezekii found ${sorted.length} products in my showcase that can pay me more 👀 ${tags}${invite}` });
    good.push({ id: "best", tone: "good", pose: "love", motion: "pop", kick: tx("Best raise"), big: `${pct(best.nowRate)} → ${pct(best.tapRate)}`, head: short(best.name), sub: tx("Same product, more commission"), img: best.image ?? undefined, cta: { label: tx("See raises"), href: "/app" }, caption: `${best.name}: ${pct(best.nowRate)} → ${pct(best.tapRate)} commission with Rezekii 🙌 ${tags}${invite}` });
  }
  if (postedY > 0) good.push({ id: "posted", tone: "good", pose: "posted", motion: "wiggle", kick: tx("Posted"), big: postedY === 1 ? tx("{n} post") : tx("{n} posts"), vars: { n: postedY }, head: tx("went out with Rezekii yesterday"), sub: [...(postsY ? ["TikTok"] : []), ...apps.filter((a) => a !== "TikTok")].join(", ") || undefined, cta: { label: tx("See posts"), href: "/app/publish/calendar" }, caption: `${postedY} posts out yesterday, all from Rezekii 📲 ${tags}${invite}` });
  if (commission > 0) good.push({ id: "commission", tone: "good", pose: "money", motion: "bounce", kick: tx("Commission"), big: rm(commission, 2), head: tx("earned yesterday"), sub: yOrders.size === 1 ? tx("From {n} order on TikTok Shop") : tx("From {n} orders on TikTok Shop"), vars: { n: yOrders.size }, money: true, cta: { label: tx("See payouts"), href: "/app/data/payouts" }, caption: `Earned ${rm(commission, 2)} commission yesterday 💰 ${tags}${invite}` });
  if (joinedY > 0) good.push({ id: "friends", tone: "good", pose: "love", motion: "pop", kick: tx("Invites"), big: String(joinedY), head: joinedY === 1 ? tx("friend joined with your link") : tx("friends joined with your link"), sub: tx("It counts once they link TikTok Shop"), cta: { label: tx("See invites"), href: "/app/account#referral" }, caption: `${joinedY} friends joined Rezekii with my link 🐯 ${tags}${invite}` });
  if (streak >= 3) good.push({ id: "streak", tone: "good", pose: "party", motion: "bounce", kick: tx("Streak"), big: streak === 1 ? tx("{n} day") : tx("{n} days"), vars: { n: streak }, head: tx("in a row, and counting"), sub: tx("Check in today to keep it"), cta: { label: tx("Missions"), href: "/app/rewards" }, caption: `${streak}-day streak on Rezekii 👑 ${tags}${invite}` });

  if (avg > 0 && gmv <= avg * 0.6) heads.push({ id: "drop", tone: "heads", pose: "sad", motion: "sway", kick: tx("Slow day"), big: `${change}%`, head: tx("GMV below your usual"), sub: tx("{gmv} vs your usual {avg}"), vars: vs, money: true, cta: { label: tx("See why"), href: "/app/data" }, caption: `Slow day yesterday. Back stronger today 💪 ${tags}${invite}` });
  if (risk) heads.push({ id: "cancel", tone: "heads", pose: "worried", motion: "shake", kick: tx("Heads-up"), big: `${riskRate}%`, head: tx("of {name} orders were cancelled"), vars: { name: risk.name }, sub: tx("Over 10% in the last 8 days. Check it before it hurts your account."), img: img(riskId), cta: { label: tx("Risk Check"), href: "/app/data/risk" }, caption: `Rimau caught a high cancel rate before it hurt my account 🐯 ${tags}${invite}` });
  if (failed > 0) heads.push({ id: "failed", tone: "heads", pose: "worried", motion: "shake", kick: tx("Posting"), big: String(failed), head: failed === 1 ? tx("post didn't go out yesterday") : tx("posts didn't go out yesterday"), sub: tx("Try them again from your Content Calendar"), cta: { label: tx("See posts"), href: "/app/publish/calendar" }, caption: `Rimau keeps an eye on my posts 🐯 ${tags}${invite}` });

  if (avg > 0 && gmv > avg * 0.6 && gmv < avg * 1.5) steady.push({ id: "steady", tone: "steady", pose: "tehtarik", motion: "sway", kick: tx("Steady day"), big: rm(gmv), head: tx("GMV yesterday, close to your usual"), sub: tx("Your usual: {avg} a day"), vars: vs, money: true, cta: { label: tx("See what sold"), href: "/app/data" }, caption: `Steady day on TikTok Shop ☕ ${tags}${invite}` });
  if (!yOrders.size && !postedY) steady.push({ id: "quiet", tone: "steady", pose: "sleep", motion: "float", kick: tx("Quiet day"), big: "Zzz…", head: tx("No orders or posts yesterday"), sub: tx("A fresh day to post again"), cta: { label: tx("Today's Ideas"), href: "/app/publish/plan" }, caption: `Rest day, then back at it 😴 ${tags}${invite}` });

  const posts = postsAll + socialAll;
  const totals: SavedPage = posts
    ? { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: tx("So far"), big: posts === 1 ? tx("{n} post") : tx("{n} posts"), head: tx("made with Rezekii"), sub: tx("{total} commission in your TikTok Shop orders on Rezekii"), vars: { n: posts, total: rm(total) }, money: true, cta: { label: tx("My stats"), href: "/app/data" }, caption: `${posts} posts made with Rezekii 🏆 ${tags}${invite}` }
    : { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: tx("So far"), big: rm(total), head: tx("commission in your TikTok Shop orders on Rezekii"), sub: tx("Post Everywhere sends one video to all your apps"), money: true, cta: { label: tx("New Post"), href: "/app/publish" }, caption: `My TikTok Shop journey on Rezekii 🏆 ${tags}${invite}` };

  // Only the tip: the pages now come out one at a time through the day (owner, 2 Nov 2026), so the intro doesn't give them away.
  const summary = [
    { tag: "Tip" as const, text: sorted.length ? (sorted.length === 1 ? tx("Add the {n} product that pays more") : tx("Add the {n} products that pay more")) : !postedY ? tx("Post a video today to keep your streak going") : tx("Check Today's Ideas for what to film next") },
  ];
  const intro: SavedPage = { id: "intro", tone: "intro", pose: "wave", motion: "bounce", kick: tx("Your day · {date}"), big: user.display_name || user.tiktok_username ? tx("Hi {name}!") : tx("Hi there!"), head: tx("Your day, a new story every 2 hours"), lines: summary, vars: { day, name: first, n: sorted.length }, caption: `My Rezekii daily story is here 🐯 ${tags}${invite}` };
  const end: SavedPage = { id: "end", tone: "end", pose: "love", motion: "pop", kick: tx("That's your day"), big: tx("See you tomorrow"), head: tx("Share Rezekii with a friend"), sub: tx("You get {n} credits when they link TikTok Shop"), vars: { n: REFERRAL_REWARD.inviter }, caption: `My daily story on Rezekii 🐯 Join me, you get ${REFERRAL_REWARD.friend} credits: ${link} ${tags}` };

  return [intro, ...good, ...heads, ...steady, totals, end];
}
