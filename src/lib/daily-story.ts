import { ANALYTICS, CREATOR, PRODUCTS, RAISES, REFERRAL_REWARD, product } from "@/lib/mock";

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
const tags = "#RezekiiStory #TikTokShopMY";
const rm = (n: number, d = 0) => `RM ${n.toLocaleString("en-MY", { minimumFractionDigits: d, maximumFractionDigits: d })}`;

/** Yesterday, for the sample story. A good day and a slow day, so both moods can be seen. */
const DAYS = {
  good: { date: "Wed 29 Oct", gmv: 2316.8, avg: 1340, commission: 231.6 },
  slow: { date: "Wed 29 Oct", gmv: 612.4, avg: 1340, commission: 58.9 },
};
export type SampleDay = keyof typeof DAYS;

export function storyFor(day: SampleDay = "good"): StoryPage[] {
  const y = DAYS[day];
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
    { id: "scan", tone: "good", pose: "found", motion: "wiggle", kick: "Showcase scan", big: String(raises.length), head: "products can pay you more", sub: `Rimau checked all ${CREATOR.showcaseSize.toLocaleString("en-MY")} products you promote`, cta: { label: "Add them", href: "/app" }, caption: `Rezekii found ${raises.length} products in my showcase that can pay me more 👀 ${tags}${invite}` },
    { id: "best", tone: "good", pose: "love", motion: "pop", kick: "Best raise", big: `${best.nowRate}% → ${best.tapRate}%`, head: bestP.name, sub: "Same product, more commission", img: bestP.img, cta: { label: "See raises", href: "/app" }, caption: `${bestP.name}: ${best.nowRate}% → ${best.tapRate}% commission with Rezekii 🙌 ${tags}${invite}` },
  ];

  const intro: StoryPage = {
    id: "intro", tone: "intro", pose: "wave", motion: "bounce",
    kick: `Your day · ${y.date}`, big: `Hi ${CREATOR.first}!`, head: "Here's yesterday in 30 seconds",
    lines: day === "good"
      ? [{ tag: "Good", text: `GMV up ${change}% and your thermos video took off` }, { tag: "Watch", text: `${cancel.cancel}% of ${cancelP.name} orders were cancelled` }, { tag: "Tip", text: "Post at 8 PM tonight, your golden time" }]
      : [{ tag: "Good", text: "Your streak is still going strong" }, { tag: "Watch", text: `GMV was ${Math.abs(change)}% below your usual` }, { tag: "Tip", text: "Repost your thermos video, it sold well before" }],
    caption: `My Rezekii daily story is here 🐯 ${tags}${invite}`,
  };

  const good: StoryPage[] = day === "good" ? [
    { id: "gmv", tone: "good", pose: "dance", motion: "bounce", kick: "GMV spike", big: `+${change}%`, head: "GMV jumped yesterday", sub: `${rm(y.gmv)} vs your usual ${rm(y.avg)}`, money: true, cta: { label: "See what sold", href: "/app/data" }, caption: `My TikTok Shop GMV jumped ${change}% yesterday 🕺 ${tags}${invite}` },
    { id: "viral", tone: "good", pose: "viral", motion: "pop", kick: "Gone viral", big: `${Math.round(top.views / 1000)}K`, head: `views on "${top.title}"`, sub: "5× your usual views", img: topP.img, cta: { label: "Post it again", href: "/app/publish" }, caption: `My video hit ${Math.round(top.views / 1000)}K views 🔥 ${tags}${invite}` },
    ...scan,
    { id: "sample", tone: "good", pose: "parcel", motion: "pop", kick: "Free sample", big: "Approved", head: product("p13").name, sub: "Arriving in 3–5 days", img: product("p13").img, cta: { label: "See sample", href: "/app/account#samples" }, caption: `Got a free sample approved through Rezekii 📦 ${tags}${invite}` },
    { id: "posted", tone: "good", pose: "posted", motion: "wiggle", kick: "Posted everywhere", big: "4 apps", head: "got your new video in one click", sub: "TikTok, Facebook, Instagram and Threads", cta: { label: "See posts", href: "/app/publish/calendar" }, caption: `One video, 4 apps, one click 📲 ${tags}${invite}` },
    { id: "commission", tone: "good", pose: "money", motion: "bounce", kick: "Commission", big: rm(y.commission, 2), head: "earned yesterday", sub: "From your TikTok Shop sales", money: true, cta: { label: "See payouts", href: "/app/data/payouts" }, caption: `Earned ${rm(y.commission, 2)} commission yesterday 💰 ${tags}${invite}` },
  ] : [
    ...scan,
    { id: "streak", tone: "good", pose: "party", motion: "bounce", kick: "Streak", big: `${CREATOR.streak} days`, head: "in a row, and counting", sub: "Check in today to keep it", cta: { label: "Missions", href: "/app/rewards" }, caption: `${CREATOR.streak}-day streak on Rezekii 👑 ${tags}${invite}` },
  ];

  const heads: StoryPage[] = day === "good" ? [
    { id: "cancel", tone: "heads", pose: "worried", motion: "shake", kick: "Heads-up", big: `${cancel.cancel}%`, head: `of ${cancelP.name} orders were cancelled`, sub: "Over 10%. Check it before it hurts your account.", img: cancelP.img, cta: { label: "Risk Check", href: "/app/data/risk" }, caption: `Rimau caught a high cancel rate before it hurt my account 🐯 ${tags}${invite}` },
    { id: "low", tone: "heads", pose: "detective", motion: "wiggle", kick: "Low rating found", big: `★ ${low.rating.toFixed(1)}`, head: `${low.name} is in 2 of your videos`, sub: "Low ratings can bring violations", img: low.img, cta: { label: "Fix it", href: "/app/data/risk" }, caption: `Rimau spotted a low-rated product in my videos 🕵️ ${tags}${invite}` },
  ] : [
    { id: "drop", tone: "heads", pose: "sad", motion: "sway", kick: "Slow day", big: `${change}%`, head: "GMV below your usual", sub: `${rm(y.gmv)} vs your usual ${rm(y.avg)}`, money: true, cta: { label: "See why", href: "/app/data" }, caption: `Slow day yesterday. Back stronger today 💪 ${tags}${invite}` },
    { id: "declined", tone: "heads", pose: "sad", motion: "sway", kick: "Sample", big: "Not this time", head: `${product("p08").name} sample`, sub: "The seller wants 10K followers. Try a similar one.", img: product("p08").img, cta: { label: "Similar samples", href: "/app/market" }, caption: `Not every sample says yes, on to the next 📦 ${tags}${invite}` },
  ];

  const steady: StoryPage[] = day === "good"
    ? [{ id: "golden", tone: "steady", pose: "cheeky", motion: "wiggle", kick: "Golden time", big: "8–10 PM", head: "is when your followers shop most", sub: "Post tonight to go FYP", cta: { label: "Plan a post", href: "/app/publish/calendar" }, caption: `My golden time to go FYP is 8–10 PM ⏰ ${tags}${invite}` }]
    : [{ id: "quiet", tone: "steady", pose: "sleep", motion: "float", kick: "Quiet night", big: "Zzz…", head: "Rimau rested, so can you", sub: "A fresh day to post again", cta: { label: "Today's Ideas", href: "/app/publish/plan" }, caption: `Rest day, then back at it 😴 ${tags}${invite}` }];

  const trend: StoryPage = { id: "trend", tone: "trend", pose: "think", motion: "float", kick: "Rising in Home & Living", big: "+68%", head: `${product("p24").name} is selling fast this week`, sub: "Picked for your account by Rezekii AI", img: product("p24").img, cta: { label: "Today's Ideas", href: "/app/publish/plan" }, caption: `Rezekii AI told me what's rising in my niche 💡 ${tags}${invite}` };

  const cleaned: StoryPage = { id: "cleaned", tone: "total", pose: "cheeky", motion: "wiggle", kick: "Shop cleaned up", big: "6", head: "low-rated products removed this month", sub: "Fewer refunds, a safer account", cta: { label: "Risk Check", href: "/app/data/risk" }, caption: `Rimau helped me clear 6 low-rated products. My account is safer now 🛡️ ${tags}${invite}` };
  const total: StoryPage = { id: "total", tone: "total", pose: "cheeky", motion: "bounce", kick: "Since you joined", big: "128 posts", head: "made with Rezekii", sub: `${rm(3480)} earned through Rezekii · 14 products raised`, money: true, cta: { label: "My stats", href: "/app/data" }, caption: `128 posts and ${rm(3480)} earned through Rezekii 🏆 ${tags}${invite}` };

  const end: StoryPage = { id: "end", tone: "end", pose: "love", motion: "pop", kick: "That's your day", big: "See you tomorrow", head: "Share Rezekii with a friend", sub: `You each get ${REFERRAL_REWARD.inviter} credits when they join`, caption: `My daily story on Rezekii 🐯 Join me, we both get ${REFERRAL_REWARD.friend} credits: ${LINK} ${tags}` };

  return [intro, ...good, ...heads, ...steady, trend, cleaned, total, end];
}

/** Where this device remembers that today's story was watched. */
export const STORY_SEEN = "rz_story_seen";
/** Story day key: a new story at 8 AM Malaysia time (UTC+8), so 00:00 UTC. */
export function storyDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
/** Hours until the story ends (the next 8 AM Malaysia time). */
export function hoursLeft(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  return Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 3600000));
}
