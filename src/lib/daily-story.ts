import { ANALYTICS, CREATOR, PRODUCTS, RAISES, REFERRAL_REWARD, product } from "@/lib/mock";
import { dateLocale, makeT, type Lang, type T } from "@/lib/i18n/lang";

/**
 * Daily Story (owner, 30 Oct 2026). Every morning at 8 AM (Malaysia time) each creator gets a story of yesterday, told by
 * Rimau the tiger cub: an AI summary first, then good news, heads-ups, steady news, trends for her niche and all-time totals.
 * It lasts 24 hours. Every page can be shared and carries her invite link. All numbers come from her own TikTok Shop data and
 * Rezekii's records; in this preview they are sample data.
 */

/** Rimau's poses, one image each in /public/mascot. */
export type Pose = "wave" | "dance" | "viral" | "found" | "parcel" | "money" | "party" | "posted" | "sad" | "worried" | "detective" | "sleep" | "tehtarik" | "cheeky" | "love" | "think";
/** How Rimau moves on the page. */
export type Motion = "bounce" | "pop" | "wiggle" | "sway" | "shake" | "float";
/** good = good news, heads = heads-up, steady = average, trend = for her niche, total = all-time, intro/end = first and last page. */
export type Tone = "intro" | "good" | "heads" | "steady" | "trend" | "total" | "end";

export type StoryPage = {
  id: string;
  tone: Tone;
  pose: Pose;
  motion: Motion;
  kick: string;
  big: string;
  head: string;
  sub?: string;
  /** Lines on the summary page. */
  lines?: { tag: "Good" | "Watch" | "Tip"; text: string }[];
  /** A product photo shown on the page. */
  img?: string;
  /** The page shows RM amounts, so she can hide them before sharing. */
  money?: boolean;
  cta?: { label: string; href: string };
  caption: string;
};

/**
 * The scenario library: when each page shows, and how Rimau feels. Admin can add more later; each one is a rule, a pose and
 * words. Thresholds are against her own numbers, so a small creator and a big one both get fair news.
 */
export const SCENARIOS: { key: string; group: string; when: string; pose: Pose; tone: Tone }[] = [
  { key: "gmv-spike", group: "Money", when: "GMV at least 1.5× her 7-day average", pose: "dance", tone: "good" },
  { key: "gmv-drop", group: "Money", when: "GMV 60% of her 7-day average or less", pose: "sad", tone: "heads" },
  { key: "gmv-steady", group: "Money", when: "GMV within her usual range", pose: "tehtarik", tone: "steady" },
  { key: "best-day", group: "Money", when: "Highest GMV day since she joined", pose: "party", tone: "good" },
  { key: "on-pace", group: "Money", when: "Month so far is ahead of last month", pose: "cheeky", tone: "good" },
  { key: "commission", group: "Money", when: "Commission earned yesterday", pose: "money", tone: "good" },
  { key: "viral", group: "Videos", when: "A video got 5× her usual views", pose: "viral", tone: "good" },
  { key: "first-sale", group: "Videos", when: "A video made its first sale", pose: "love", tone: "good" },
  { key: "stopped-selling", group: "Videos", when: "A video that sold has had no sales for 3 days", pose: "think", tone: "heads" },
  { key: "best-live", group: "Videos", when: "Best LIVE this month by orders", pose: "party", tone: "good" },
  { key: "raises", group: "Products", when: "Products got a better rate", pose: "found", tone: "good" },
  { key: "raise-ending", group: "Products", when: "A better rate ends in 3 days", pose: "worried", tone: "heads" },
  { key: "low-rated", group: "Products", when: "A product under 4★ is in her videos", pose: "detective", tone: "heads" },
  { key: "high-cancel", group: "Products", when: "Cancel rate over 10% on a product", pose: "worried", tone: "heads" },
  { key: "sample-approved", group: "Samples", when: "A sample request was approved", pose: "parcel", tone: "good" },
  { key: "sample-declined", group: "Samples", when: "A sample request was not approved", pose: "sad", tone: "heads" },
  { key: "sample-arrived", group: "Samples", when: "A sample was delivered", pose: "parcel", tone: "good" },
  { key: "sample-due", group: "Samples", when: "A sample video is due in 3 days or less", pose: "worried", tone: "heads" },
  { key: "posted", group: "Posting", when: "A video went out to several apps", pose: "posted", tone: "good" },
  { key: "post-failed", group: "Posting", when: "A post failed on an app", pose: "worried", tone: "heads" },
  { key: "golden-time", group: "Posting", when: "Her best posting time today", pose: "cheeky", tone: "steady" },
  { key: "trend", group: "Trends", when: "A product in her niche is rising fast", pose: "think", tone: "trend" },
  { key: "ideas", group: "Trends", when: "Today's Ideas are ready", pose: "think", tone: "trend" },
  { key: "streak", group: "You", when: "A streak milestone", pose: "party", tone: "good" },
  { key: "level-up", group: "You", when: "She moved up a level", pose: "party", tone: "good" },
  { key: "friend-joined", group: "You", when: "A friend joined with her link", pose: "love", tone: "good" },
  { key: "wish-reply", group: "You", when: "A seller replied to her Wish List", pose: "found", tone: "good" },
  { key: "quiet", group: "You", when: "No news yesterday", pose: "sleep", tone: "steady" },
  { key: "all-time", group: "All-time", when: "Totals since she joined", pose: "cheeky", tone: "total" },
];

const LINK = `rezekii.com/r/${CREATOR.handle.replace(/^@/, "")}`;
const tags = "#RezekiiAffiliate #RezekiiMY";
const rm = (n: number, d = 0) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Yesterday, for the sample story. A good day and a slow day, so both moods can be seen. */
const DAYS = {
  good: { date: "Wed 29 Oct", gmv: 2316.8, avg: 1340, commission: 231.6 },
  slow: { date: "Wed 29 Oct", gmv: 612.4, avg: 1340, commission: 58.9 },
};
export type SampleDay = keyof typeof DAYS;

/**
 * The sample story in her language (owner, 3 Nov 2026): `t` and `lang` come from the player. Captions stay as written, as
 * they're what she posts.
 */
export function storyFor(day: SampleDay = "good", t: T = makeT(null), lang: Lang = "en"): StoryPage[] {
  const y = DAYS[day];
  const date = lang === "en" ? y.date : new Date(Date.UTC(2026, 9, 29)).toLocaleDateString(dateLocale(lang), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
  const top = [...ANALYTICS.videos].sort((a, b) => b.views - a.views)[0];
  const topP = product(top.productId);
  const cancel = [...ANALYTICS.videos].sort((a, b) => b.cancel - a.cancel)[0];
  const cancelP = product(cancel.productId);
  const low = [...PRODUCTS].sort((a, b) => a.rating - b.rating)[0];
  const change = Math.round(((y.gmv - y.avg) / y.avg) * 100);
  const invite = ` Try it free with my link: ${LINK}`;
  // The showcase scan, in the story (owner, 30 Oct 2026): how many products can pay more, and the best raise.
  const raises = RAISES.filter((r) => r.eligible);
  const best = [...raises].sort((a, b) => b.tapRate - (b.nowRate ?? b.tapRate) - (a.tapRate - (a.nowRate ?? a.tapRate)))[0];
  const bestP = product(best.productId);
  const scan: StoryPage[] = [
    { id: "scan", tone: "good", pose: "found", motion: "wiggle", kick: t("Showcase scan"), big: String(raises.length), head: t("products can pay you more"), sub: t("Rimau checked all {n} products you promote", { n: CREATOR.showcaseSize.toLocaleString("en-MY") }), cta: { label: t("Add them"), href: "/app" }, caption: `Rezekii found ${raises.length} products in my showcase that can pay me more 👀 ${tags}${invite}` },
    { id: "best", tone: "good", pose: "love", motion: "pop", kick: t("Best raise"), big: `${best.nowRate}% → ${best.tapRate}%`, head: bestP.name, sub: t("Same product, more commission"), img: bestP.img, cta: { label: t("See raises"), href: "/app" }, caption: `${bestP.name}: ${best.nowRate}% → ${best.tapRate}% commission with Rezekii 🙌 ${tags}${invite}` },
  ];

  const intro: StoryPage = {
    id: "intro", tone: "intro", pose: "wave", motion: "bounce",
    kick: t("Your day · {date}", { date }), big: t("Hi {name}!", { name: CREATOR.first }), head: t("Here's yesterday in 30 seconds"),
    lines: day === "good"
      ? [{ tag: "Good", text: t("GMV up {pct}% and your thermos video took off", { pct: change }) }, { tag: "Watch", text: t("{pct}% of {product} orders were cancelled", { pct: cancel.cancel, product: cancelP.name }) }, { tag: "Tip", text: t("Post at 8 PM tonight, your golden time") }]
      : [{ tag: "Good", text: t("Your streak is still going strong") }, { tag: "Watch", text: t("GMV was {pct}% below your usual", { pct: Math.abs(change) }) }, { tag: "Tip", text: t("Repost your thermos video, it sold well before") }],
    caption: `My Rezekii daily story is here 🐯 ${tags}${invite}`,
  };

  const good: StoryPage[] = day === "good" ? [
    { id: "gmv", tone: "good", pose: "dance", motion: "bounce", kick: t("GMV spike"), big: `+${change}%`, head: t("GMV jumped yesterday"), sub: t("{gmv} vs your usual {usual}", { gmv: rm(y.gmv), usual: rm(y.avg) }), money: true, cta: { label: t("See what sold"), href: "/app/data" }, caption: `My TikTok Shop GMV jumped ${change}% yesterday 🕺 ${tags}${invite}` },
    { id: "viral", tone: "good", pose: "viral", motion: "pop", kick: t("Gone viral"), big: `${Math.round(top.views / 1000)}K`, head: t('views on "{title}"', { title: top.title }), sub: t("5× your usual views"), img: topP.img, cta: { label: t("Post it again"), href: "/app/publish" }, caption: `My video hit ${Math.round(top.views / 1000)}K views 🔥 ${tags}${invite}` },
    ...scan,
    { id: "sample", tone: "good", pose: "parcel", motion: "pop", kick: t("Free sample"), big: t("Approved"), head: product("p13").name, sub: t("Arriving in 3–5 days"), img: product("p13").img, cta: { label: t("See sample"), href: "/app/account#samples" }, caption: `Got a free sample approved through Rezekii 📦 ${tags}${invite}` },
    { id: "posted", tone: "good", pose: "posted", motion: "wiggle", kick: t("Posted everywhere"), big: t("{n} apps", { n: 4 }), head: t("got your new video in one click"), sub: t("TikTok, Facebook, Instagram and Threads"), cta: { label: t("See posts"), href: "/app/publish/calendar" }, caption: `One video, 4 apps, one click 📲 ${tags}${invite}` },
    { id: "commission", tone: "good", pose: "money", motion: "bounce", kick: t("Commission"), big: rm(y.commission, 2), head: t("earned yesterday"), sub: t("From your TikTok Shop sales"), money: true, cta: { label: t("See payouts"), href: "/app/data/payouts" }, caption: `Earned ${rm(y.commission, 2)} commission yesterday 💰 ${tags}${invite}` },
  ] : [
    ...scan,
    { id: "streak", tone: "good", pose: "party", motion: "bounce", kick: t("Streak"), big: t("{n} days", { n: CREATOR.streak }), head: t("in a row, and counting"), sub: t("Check in today to keep it"), cta: { label: t("Missions"), href: "/app/rewards" }, caption: `${CREATOR.streak}-day streak on Rezekii 👑 ${tags}${invite}` },
  ];

  const heads: StoryPage[] = day === "good" ? [
    { id: "cancel", tone: "heads", pose: "worried", motion: "shake", kick: t("Heads-up"), big: `${cancel.cancel}%`, head: t("of {product} orders were cancelled", { product: cancelP.name }), sub: t("Over 10%. Check it before it hurts your account."), img: cancelP.img, cta: { label: t("Risk Check"), href: "/app/data/risk" }, caption: `Rimau caught a high cancel rate before it hurt my account 🐯 ${tags}${invite}` },
    { id: "low", tone: "heads", pose: "detective", motion: "wiggle", kick: t("Low rating found"), big: `★ ${low.rating.toFixed(1)}`, head: t("{product} is in {n} of your videos", { product: low.name, n: 2 }), sub: t("Low ratings can bring violations"), img: low.img, cta: { label: t("Fix it"), href: "/app/data/risk" }, caption: `Rimau spotted a low-rated product in my videos 🕵️ ${tags}${invite}` },
  ] : [
    { id: "drop", tone: "heads", pose: "sad", motion: "sway", kick: t("Slow day"), big: `${change}%`, head: t("GMV below your usual"), sub: t("{gmv} vs your usual {usual}", { gmv: rm(y.gmv), usual: rm(y.avg) }), money: true, cta: { label: t("See why"), href: "/app/data" }, caption: `Slow day yesterday. Back stronger today 💪 ${tags}${invite}` },
    { id: "declined", tone: "heads", pose: "sad", motion: "sway", kick: t("Sample"), big: t("Not this time"), head: t("{product} sample", { product: product("p08").name }), sub: t("The seller wants 10K followers. Try a similar one."), img: product("p08").img, cta: { label: t("Similar samples"), href: "/app/market" }, caption: `Not every sample says yes, on to the next 📦 ${tags}${invite}` },
  ];

  const steady: StoryPage[] = day === "good"
    ? [{ id: "golden", tone: "steady", pose: "cheeky", motion: "wiggle", kick: t("Golden time"), big: t("8–10 PM"), head: t("is when your followers shop most"), sub: t("Post tonight to go FYP"), cta: { label: t("Plan a post"), href: "/app/publish/calendar" }, caption: `My golden time to go FYP is 8–10 PM ⏰ ${tags}${invite}` }]
    : [{ id: "quiet", tone: "steady", pose: "sleep", motion: "float", kick: t("Quiet night"), big: "Zzz…", head: t("Rimau rested, so can you"), sub: t("A fresh day to post again"), cta: { label: t("Today's Ideas"), href: "/app/publish/plan" }, caption: `Rest day, then back at it 😴 ${tags}${invite}` }];

  // "Home & Living" is TikTok Shop's own category name, so it stays as it is.
  const trend: StoryPage = { id: "trend", tone: "trend", pose: "think", motion: "float", kick: t("Rising in {category}", { category: "Home & Living" }), big: "+68%", head: t("{product} is selling fast this week", { product: product("p24").name }), sub: t("Picked for your account by Rezekii AI"), img: product("p24").img, cta: { label: t("Today's Ideas"), href: "/app/publish/plan" }, caption: `Rezekii AI told me what's rising in my niche 💡 ${tags}${invite}` };

  const cleaned: StoryPage = { id: "cleaned", tone: "total", pose: "cheeky", motion: "wiggle", kick: t("Shop cleaned up"), big: "6", head: t("low-rated products removed this month"), sub: t("Fewer refunds, a safer account"), cta: { label: t("Risk Check"), href: "/app/data/risk" }, caption: `Rimau helped me clear 6 low-rated products. My account is safer now 🛡️ ${tags}${invite}` };
  const total: StoryPage = { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: t("Since you joined"), big: t("{n} posts", { n: 128 }), head: t("made with Rezekii"), sub: t("{amount} earned through Rezekii · {n} products raised", { amount: rm(3480), n: 14 }), money: true, cta: { label: t("My stats"), href: "/app/data" }, caption: `128 posts and ${rm(3480)} earned through Rezekii 🏆 ${tags}${invite}` };

  const end: StoryPage = { id: "end", tone: "end", pose: "love", motion: "pop", kick: t("That's your day"), big: t("See you tomorrow"), head: t("Share Rezekii with a friend"), sub: t("You each get {n} credits when they join", { n: REFERRAL_REWARD.inviter }), caption: `My daily story on Rezekii 🐯 Join me, we both get ${REFERRAL_REWARD.friend} credits: ${LINK} ${tags}` };

  return [intro, ...good, ...heads, ...steady, trend, cleaned, total, end];
}

/** Where this device remembers that today's story was watched. */
export const STORY_SEEN = "rz_story_seen";
/** Story day key: a new story at 8 AM Malaysia time (UTC+8), so 00:00 UTC. */
export function storyDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
/**
 * One story page at a time (owner, 2 Nov 2026: something new through the day): the intro and the first page at 8 AM Malaysia
 * time, then one more every 2 hours until the whole day is out. How many of `total` pages are out at `now`.
 */
export const STORY_EVERY_MS = 2 * 3_600_000;
const dayStart = (now: number) => Math.floor(now / 86_400_000) * 86_400_000;
export const storyReleased = (total: number, now = Date.now()) => Math.min(total, 2 + Math.floor((now - dayStart(now)) / STORY_EVERY_MS));
/** When the next page comes out, once `released` pages are out. */
export const storyNextAt = (released: number, now = Date.now()) => dayStart(now) + (released - 1) * STORY_EVERY_MS;
/** How many of today's pages she has seen (saved as "day:count"; an older "day" alone meant the whole story). */
export function storySeen(now = new Date()): number {
  try {
    const [d, n] = (localStorage.getItem(STORY_SEEN) ?? "").split(":");
    return d === storyDayKey(now) ? (n ? Number(n) || 0 : Infinity) : 0;
  } catch {
    return 0;
  }
}
export function noteStorySeen(count: number, now = new Date()) {
  try {
    if (count > storySeen(now)) localStorage.setItem(STORY_SEEN, `${storyDayKey(now)}:${count}`);
  } catch {}
}

/** Hours until the story ends (the next 8 AM Malaysia time). */
export function hoursLeft(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 3600000));
}
