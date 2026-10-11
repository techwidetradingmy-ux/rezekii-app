/**
 * Proof: TikTok's seller-only creator data, through a connected seller shop (Zemvello Wellness).
 * Read-only: marketplace creator search (first page, no filters, plus an optional --keyword) and Bestselling Creators (30 days).
 *
 *   node --env-file=.env.local scripts/proof-seller.ts [--keyword <text>]
 */
import { getBestsellingCreators, searchMarketplaceCreators, type MarketplaceCreator } from "../src/integrations/tiktok-shop/seller.ts";
import { cell, mytNow, sellerSession, status, writeReport } from "./proof-lib.ts";

const args = process.argv.slice(2);
const keyword = args.includes("--keyword") ? args[args.indexOf("--keyword") + 1] : undefined;

const s = await sellerSession();
const search = await searchMarketplaceCreators(s.token, s.cipher, keyword ? { keyword } : {});
const creators = search.data?.creators ?? [];
// TikTok's latest ranking is two days old (Malaysia time); a later date is rejected.
const date = new Date(Date.now() + 8 * 3600e3 - 2 * 86400e3).toISOString().slice(0, 10);
const best = await getBestsellingCreators(s.token, s.cipher, { date });
const top = best.data?.creators ?? [];

const money = (c: MarketplaceCreator) =>
  c.gmv?.amount ? `${c.gmv.currency ?? ""}${c.gmv.amount}` : c.gmv_range ? (c.gmv_range.formatted_range ?? `${c.gmv_range.minimum_amount}–${c.gmv_range.maximum_amount}`) : "—";

const out = [
  `# Seller creator data proof — ${mytNow()} (Malaysia time)`,
  "",
  `Shop: **${s.shop}** · region ${s.region}`,
  "",
  `## Creator Marketplace search${keyword ? ` — keyword "${keyword}"` : " — no filters"}`,
  "",
  `\`POST /affiliate_seller/202508/marketplace_creators/search\` (page size 20) → ${status(search)} · ${creators.length} creators on the first page${search.data?.next_page_token ? " · more pages" : ""}`,
  "",
  "Last 30 days. GMV is exact only when the creator shares it; otherwise TikTok gives a range.",
  "",
  "| # | Username | Nickname | Followers | GMV | Video GMV | LIVE GMV | Units sold | Avg video views | Categories |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...creators.map((c, i) => `| ${i + 1} | @${cell(c.username)} | ${cell(c.nickname)} | ${cell(c.follower_count)} | ${cell(money(c))} | ${cell(c.video_gmv?.amount)} | ${cell(c.live_gmv?.amount)} | ${cell(c.units_sold_range?.formatted_range)} | ${cell(c.avg_ec_video_view_count)} | ${cell(c.category_ids?.length)} |`),
  "",
  `## Bestselling Creators (30 days to ${date})`,
  "",
  `\`GET /analytics/202511/creators/bestselling\` (time_slot 30D, author_type ALL) → ${status(best)} · ${top.length} creators`,
  "",
  "| Rank | Username | Nickname | Followers | Likes | GMV range |",
  "|---|---|---|---|---|---|",
  ...top.slice(0, 20).map((c) => `| ${cell(c.rank)} | @${cell(c.user_name)} | ${cell(c.nick_name)} | ${cell(c.followers_count)} | ${cell(c.likes_count)} | ${cell(c.gmv_range?.replace("~", " – "))} |`),
  "",
  top.length > 20 ? `${top.length - 20} more not shown.` : "",
];
console.log("Report:", writeReport("seller-creators", out));
