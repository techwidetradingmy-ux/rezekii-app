import { supabaseRest } from "../../integrations/supabase/rest.ts";
import type { StoryPage } from "../../lib/daily-story.ts";
import { wallet } from "../rewards/ledger.ts";
import { codeFor } from "../rewards/referrals.ts";
import { REFERRAL_REWARD } from "../rewards/rules.ts";
import { linesBetween, productImages } from "../sales/frames.ts";
import { lineEarned, lineGmv } from "../sales/summary.ts";
import { commissionRaises } from "../tap/raises.ts";

const DAY = 86_400_000;
const MYT = 8 * 3_600_000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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
export async function storyOf(user: User, origin: string): Promise<StoryPage[]> {
  // The story day starts at 8 AM Malaysia time (00:00 UTC), when the last Malaysia day is complete: "yesterday" is that day.
  const today = Math.floor(Date.now() / DAY);
  const yStart = (today - 1) * DAY - MYT;
  const yEnd = today * DAY - MYT;
  const d = new Date(yStart + MYT);
  const date = `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
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

  const good: StoryPage[] = [];
  const heads: StoryPage[] = [];
  const steady: StoryPage[] = [];
  if (avg > 0 && gmv >= avg * 1.5) good.push({ id: "gmv", tone: "good", pose: "dance", motion: "bounce", kick: "GMV spike", big: `+${change}%`, head: "GMV jumped yesterday", sub: `${rm(gmv)} vs your usual ${rm(avg)}`, money: true, cta: { label: "See what sold", href: "/app/data" }, caption: `My TikTok Shop GMV jumped ${change}% yesterday 🕺 ${tags}${invite}` });
  if (top) good.push({ id: "top", tone: "good", pose: "love", motion: "pop", kick: "Best seller yesterday", big: `${top.orders.size} order${top.orders.size === 1 ? "" : "s"}`, head: top.name, img: img(topId), cta: { label: "Performance", href: "/app/data/performance#product" }, caption: `My best seller yesterday: ${top.name} 🛍️ ${tags}${invite}` });
  if (sorted.length && best) {
    good.push({ id: "scan", tone: "good", pose: "found", motion: "wiggle", kick: "Showcase scan", big: String(sorted.length), head: `product${sorted.length === 1 ? "" : "s"} can pay you more`, sub: "Found in your TikTok Shop showcase", cta: { label: "Add them", href: "/app" }, caption: `Rezekii found ${sorted.length} products in my showcase that can pay me more 👀 ${tags}${invite}` });
    good.push({ id: "best", tone: "good", pose: "love", motion: "pop", kick: "Best raise", big: `${pct(best.nowRate)} → ${pct(best.tapRate)}`, head: short(best.name), sub: "Same product, more commission", img: best.image ?? undefined, cta: { label: "See raises", href: "/app" }, caption: `${best.name}: ${pct(best.nowRate)} → ${pct(best.tapRate)} commission with Rezekii 🙌 ${tags}${invite}` });
  }
  if (postedY > 0) good.push({ id: "posted", tone: "good", pose: "posted", motion: "wiggle", kick: "Posted", big: `${postedY} post${postedY === 1 ? "" : "s"}`, head: "went out with Rezekii yesterday", sub: [...(postsY ? ["TikTok"] : []), ...apps.filter((a) => a !== "TikTok")].join(", ") || undefined, cta: { label: "See posts", href: "/app/publish/calendar" }, caption: `${postedY} posts out yesterday, all from Rezekii 📲 ${tags}${invite}` });
  if (commission > 0) good.push({ id: "commission", tone: "good", pose: "money", motion: "bounce", kick: "Commission", big: rm(commission, 2), head: "earned yesterday", sub: `From ${yOrders.size} order${yOrders.size === 1 ? "" : "s"} on TikTok Shop`, money: true, cta: { label: "See payouts", href: "/app/data/payouts" }, caption: `Earned ${rm(commission, 2)} commission yesterday 💰 ${tags}${invite}` });
  if (joinedY > 0) good.push({ id: "friends", tone: "good", pose: "love", motion: "pop", kick: "Invites", big: String(joinedY), head: `friend${joinedY === 1 ? "" : "s"} joined with your link`, sub: "It counts once they link TikTok Shop", cta: { label: "See invites", href: "/app/account#referral" }, caption: `${joinedY} friends joined Rezekii with my link 🐯 ${tags}${invite}` });
  if (streak >= 3) good.push({ id: "streak", tone: "good", pose: "party", motion: "bounce", kick: "Streak", big: `${streak} day${streak === 1 ? "" : "s"}`, head: "in a row, and counting", sub: "Check in today to keep it", cta: { label: "Missions", href: "/app/rewards" }, caption: `${streak}-day streak on Rezekii 👑 ${tags}${invite}` });

  if (avg > 0 && gmv <= avg * 0.6) heads.push({ id: "drop", tone: "heads", pose: "sad", motion: "sway", kick: "Slow day", big: `${change}%`, head: "GMV below your usual", sub: `${rm(gmv)} vs your usual ${rm(avg)}`, money: true, cta: { label: "See why", href: "/app/data" }, caption: `Slow day yesterday. Back stronger today 💪 ${tags}${invite}` });
  if (risk) heads.push({ id: "cancel", tone: "heads", pose: "worried", motion: "shake", kick: "Heads-up", big: `${riskRate}%`, head: `of ${risk.name} orders were cancelled`, sub: "Over 10% in the last 8 days. Check it before it hurts your account.", img: img(riskId), cta: { label: "Risk Check", href: "/app/data/risk" }, caption: `Rimau caught a high cancel rate before it hurt my account 🐯 ${tags}${invite}` });
  if (failed > 0) heads.push({ id: "failed", tone: "heads", pose: "worried", motion: "shake", kick: "Posting", big: String(failed), head: `post${failed === 1 ? "" : "s"} didn't go out yesterday`, sub: "Try them again from your Content Calendar", cta: { label: "See posts", href: "/app/publish/calendar" }, caption: `Rimau keeps an eye on my posts 🐯 ${tags}${invite}` });

  if (avg > 0 && gmv > avg * 0.6 && gmv < avg * 1.5) steady.push({ id: "steady", tone: "steady", pose: "tehtarik", motion: "sway", kick: "Steady day", big: rm(gmv), head: "GMV yesterday, close to your usual", sub: `Your usual: ${rm(avg)} a day`, money: true, cta: { label: "See what sold", href: "/app/data" }, caption: `Steady day on TikTok Shop ☕ ${tags}${invite}` });
  if (!yOrders.size && !postedY) steady.push({ id: "quiet", tone: "steady", pose: "sleep", motion: "float", kick: "Quiet day", big: "Zzz…", head: "No orders or posts yesterday", sub: "A fresh day to post again", cta: { label: "Today's Ideas", href: "/app/publish/plan" }, caption: `Rest day, then back at it 😴 ${tags}${invite}` });

  const posts = postsAll + socialAll;
  const totals: StoryPage = posts
    ? { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: "So far", big: `${posts} post${posts === 1 ? "" : "s"}`, head: "made with Rezekii", sub: `${rm(total)} commission in your TikTok Shop orders on Rezekii`, money: true, cta: { label: "My stats", href: "/app/data" }, caption: `${posts} posts made with Rezekii 🏆 ${tags}${invite}` }
    : { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: "So far", big: rm(total), head: "commission in your TikTok Shop orders on Rezekii", sub: "Post Everywhere sends one video to all your apps", money: true, cta: { label: "New Post", href: "/app/publish" }, caption: `My TikTok Shop journey on Rezekii 🏆 ${tags}${invite}` };

  // Only the tip: the pages now come out one at a time through the day (owner, 2 Nov 2026), so the intro doesn't give them away.
  const summary = [
    { tag: "Tip" as const, text: sorted.length ? `Add the ${sorted.length} product${sorted.length === 1 ? "" : "s"} that pay more` : !postedY ? "Post a video today to keep your streak going" : "Check Today's Ideas for what to film next" },
  ];
  const intro: StoryPage = { id: "intro", tone: "intro", pose: "wave", motion: "bounce", kick: `Your day · ${date}`, big: `Hi ${first}!`, head: "Your day, a new story every 2 hours", lines: summary, caption: `My Rezekii daily story is here 🐯 ${tags}${invite}` };
  const end: StoryPage = { id: "end", tone: "end", pose: "love", motion: "pop", kick: "That's your day", big: "See you tomorrow", head: "Share Rezekii with a friend", sub: `You get ${REFERRAL_REWARD.inviter} credits when they link TikTok Shop`, caption: `My daily story on Rezekii 🐯 Join me, you get ${REFERRAL_REWARD.friend} credits: ${link} ${tags}` };

  return [intro, ...good, ...heads, ...steady, totals, end];
}
