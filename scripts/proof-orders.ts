/**
 * v0.1 proof, read-only. Nothing is changed on TikTok.
 *  - Creator: ALL order history TikTok returns for @tinawellnesshacks (no start date given), summarised.
 *  - TAP: per-creator performance across Techwide's TAP campaigns (TikTok retired TAP order search on 2026-06-30).
 *    Only registered creators are named in the report.
 *
 *   node --env-file=.env.local scripts/proof-orders.ts [--creator-only | --tap-only] [--max-pages 200] [--max-campaigns N]
 */
import { setTimeout as sleep } from "node:timers/promises";
import { searchCreatorOrders, type AffiliateOrder } from "../src/integrations/tiktok-shop/creator.ts";
import { listCampaignProductStats, listCampaigns, listCreatorContent, listProductCreators, type Campaign, type CreatorContent } from "../src/integrations/tiktok-shop/partner.ts";
import { isAllowedDuringProof } from "../src/modules/creator-accounts/affiliate-connections.ts";
import { summarizeCreatorPerformance, type CreatorTotals, type PerformanceRow } from "../src/modules/stats/creator-performance.ts";
import { summarizeOrders, type OrdersSummary, type Row } from "../src/modules/stats/orders-summary.ts";
import { cell, creatorToken, mytDate, mytNow, partnerSession, status, writeReport } from "./proof-lib.ts";

const args = process.argv.slice(2);
const maxPages = Number(args[args.indexOf("--max-pages") + 1]) || 200;
const maxCampaigns = args.includes("--max-campaigns") ? Number(args[args.indexOf("--max-campaigns") + 1]) || 1000 : 1000;
const PAUSE_MS = 150;
const CONTENT_CHECKS = 3;
const doCreator = !args.includes("--tap-only");
const doTap = !args.includes("--creator-only");
const HANDLE = process.env.PROOF_HANDLE ?? "tinawellnesshacks";
type Reply = { code: number; message: string; request_id?: string; data?: { orders?: AffiliateOrder[]; next_page_token?: string } };

/** Pages through everything; tries a bigger page first and falls back to 20 if TikTok refuses it. */
async function pullAll(fetchPage: (pageSize: number, pageToken?: string) => Promise<Reply>, firstSize: number) {
  let size = firstSize;
  let first = await fetchPage(size);
  if (first.code !== 0 && size !== 20) { size = 20; first = await fetchPage(size); }
  const orders: AffiliateOrder[] = [...(first.data?.orders ?? [])];
  let token = first.data?.next_page_token;
  let pages = 1, last = first;
  while (first.code === 0 && token && pages < maxPages) {
    last = await fetchPage(size, token);
    if (last.code !== 0) break;
    orders.push(...(last.data?.orders ?? []));
    token = last.data?.next_page_token;
    pages++;
  }
  return { first, last, orders, pages, pageSize: size, capped: !!token && pages >= maxPages, stoppedOnError: last.code !== 0 };
}

const money = (v: number, cur: string) => `${cur || ""} ${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`.trim();
const table = (title: string, rows: Row[], cur: string, limit = 10) => [
  `**${title}**`, "", "| | Orders | Units | GMV | Commission |", "|---|---|---|---|---|",
  ...rows.slice(0, limit).map((r) => `| ${cell(r.label)} | ${r.orders} | ${r.units} | ${money(r.gmv, cur)} | ${money(r.commission, cur)} |`),
  rows.length ? "" : "_none_", "",
];
const summaryLines = (s: OrdersSummary, run: { pages: number; pageSize: number; capped: boolean; stoppedOnError: boolean }) => [
  `- Orders: **${s.orders}** (${run.pages} pages of ${run.pageSize})${run.capped ? " · **stopped at the page limit; more history exists**" : ""}${run.stoppedOnError ? " · **a later page failed, see raw reply**" : ""}`,
  `- History covered: **${mytDate(s.earliest)} → ${mytDate(s.latest)}** (oldest order TikTok returned = how far back we can see)`,
  `- GMV (price × quantity, before refunds): **${money(s.gmv, s.currency)}** · units ${s.units} · refunded/returned units ${s.refundedUnits}`,
  `- Commission (actual when settled, else estimated): **${money(s.commission, s.currency)}**`,
  `- Order status: ${Object.entries(s.byStatus).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}`,
  "",
];

const out: string[] = [`# Affiliate orders proof — ${mytNow()} (Malaysia time)`, "", "Read-only. No start date was sent, so TikTok returns everything it has."];
const console_: string[] = [];

if (doCreator) {
  const token = await creatorToken(HANDLE);
  const run = await pullAll((pageSize, pageToken) => searchCreatorOrders(token, { pageSize, pageToken }), 50);
  const s = summarizeOrders(run.orders);
  out.push("", `## @${HANDLE}'s own affiliate orders`, "", `\`POST /affiliate_creator/202410/orders/search\` → ${status(run.first)}`, "", ...summaryLines(s, run),
    ...table("By month", s.byMonth, s.currency, 60), ...table("Top products", s.byProduct, s.currency), ...table("Top videos / LIVEs (by content ID)", s.byContent, s.currency), ...table("Sales by link tag", s.byTag, s.currency),
    "First raw page:", "", "```json", JSON.stringify(run.first, null, 2).slice(0, 20000), "```", "");
  console_.push(`Creator orders: ${status(run.first)} · ${s.orders} orders · ${mytDate(s.earliest)} → ${mytDate(s.latest)} · GMV ${money(s.gmv, s.currency)}`);
}

if (doTap) {
  // TAP order search was retired by TikTok on 2026-06-30; this reads its replacement, campaign product performance.
  const p = await partnerSession();
  const started = Date.now();
  let calls = 0;
  const errors: string[] = [];
  /** One call, a short pause, and one retry if TikTok says we're going too fast. */
  const call = async <R extends { code: number; message: string }>(label: string, fn: () => Promise<R>): Promise<R> => {
    await sleep(PAUSE_MS);
    calls++;
    let r = await fn();
    if (r.code !== 0 && /rate|limit|too many|frequen/i.test(r.message)) { await sleep(2000); calls++; r = await fn(); }
    if (r.code !== 0 && errors.length < 10) errors.push(`${label}: ${r.code} ${r.message.slice(0, 120)}`);
    return r;
  };

  const campaigns: Campaign[] = [];
  let ctok: string | undefined;
  do {
    const r = await call("campaigns", () => listCampaigns(p.token, p.cipher, { status: "UNSPECIFIED", pageSize: 50, pageToken: ctok }));
    campaigns.push(...(r.data?.campaigns ?? []));
    ctok = r.code === 0 ? r.data?.next_page_token : undefined;
  } while (ctok && campaigns.length < maxCampaigns);
  const scanned = campaigns.slice(0, maxCampaigns);

  const rows: PerformanceRow[] = [];
  const productNames = new Map<string, string>();
  let productsSeen = 0, productsWithCreators = 0;
  const contentChecks: { product: string; creator: string; sample: string; videos: CreatorContent[] }[] = [];
  for (const c of scanned) {
    let ptok: string | undefined;
    do {
      const ps = await call("product stats", () => listCampaignProductStats(p.token, p.cipher, c.id, { pageToken: ptok }));
      for (const s of ps.data?.campaign_product_statistics ?? []) {
        productsSeen++;
        const pid = s.campaign_product_detail?.product_id;
        if (!pid || !(s.promoted_creator_num ?? 0)) continue;
        productsWithCreators++;
        productNames.set(c.id + "/" + pid, s.campaign_product_detail?.product_name ?? pid);
        let rtok: string | undefined;
        do {
          const pc = await call("product creators", () => listProductCreators(p.token, p.cipher, c.id, pid, { pageToken: rtok }));
          for (const pcRow of pc.data?.promotion_creators ?? []) {
            rows.push({ ...pcRow, campaignId: c.id, productId: pid });
            // Content-on-time check for a few creators who posted videos (creator_temp_id expires after an hour, so ask now).
            if (contentChecks.length < CONTENT_CHECKS && (pcRow.video_count ?? 0) > 0) {
              const cs = await call("creator content", () => listCreatorContent(p.token, p.cipher, c.id, pid, pcRow, "VIDEO"));
              const who = pcRow.creator.user_name ?? "?";
              contentChecks.push({ product: productNames.get(c.id + "/" + pid) ?? pid, creator: isAllowedDuringProof(who) ? "@" + who : "(not registered)", sample: pcRow.free_sample_status ?? "—", videos: cs.data?.creator_content_statistics ?? [] });
            }
          }
          rtok = pc.code === 0 ? pc.data?.next_page_token : undefined;
        } while (rtok);
      }
      ptok = ps.code === 0 ? ps.data?.next_page_token : undefined;
    } while (ptok);
  }

  const creators = summarizeCreatorPerformance(rows, isAllowedDuringProof);
  const cur = creators.find((c) => c.currency)?.currency ?? "";
  const totalGmv = creators.reduce((t, c) => t + c.gmv, 0);
  const sumOf = (k: "videos" | "lives" | "samples") => creators.reduce((t, c) => t + c[k], 0);
  const seconds = Math.round((Date.now() - started) / 1000);
  // Only registered creators are named; everyone else is numbered (owner rule, 2026-10-11).
  let n = 0;
  const label = (c: CreatorTotals) => (c.registered ? `**@${c.username}**` : `Creator #${++n}`);
  const creatorTable = (list: CreatorTotals[]) => [
    "| Creator | GMV (lifetime) | Videos | LIVEs | Products | Campaigns | Samples |", "|---|---|---|---|---|---|---|",
    ...list.map((c) => `| ${label(c)} | ${money(c.gmv, c.currency)} | ${c.videos} | ${c.lives} | ${c.products} | ${c.campaigns} | ${c.samples} |`),
  ];
  const registered = creators.filter((c) => c.registered);
  out.push("", `## Techwide TAP campaigns: creator performance — ${p.name}`, "",
    "TikTok retired TAP order search on 2026-06-30. This reads its replacement: `GET 202501/campaigns/{id}/products/performance` and `…/products/{pid}/performance`. **No date filter exists, so every amount is a lifetime total.**", "",
    `- Campaigns scanned: **${scanned.length}**${campaigns.length > scanned.length || ctok ? ` (limit ${maxCampaigns}; more exist)` : ""} · products seen ${productsSeen} · products with promoting creators ${productsWithCreators}`,
    `- Creator rows ${rows.length} · unique creators **${creators.length}** · registered with Rezekii **${registered.length}**`,
    `- GMV across all creators: **${money(totalGmv, cur)}** · videos ${sumOf("videos")} · LIVEs ${sumOf("lives")} · samples requested ${sumOf("samples")}`,
    `- ${calls} TikTok calls in ${seconds}s (${PAUSE_MS} ms pause between calls)${errors.length ? ` · ${errors.length} errors (first ones below)` : " · no errors"}`, "",
    "### Registered creators", "", ...(registered.length ? creatorTable(registered) : ["_none in these campaigns_"]), "",
    "### Top 20 creators (unregistered ones are numbered, not named)", "", ...creatorTable(creators.slice(0, 20)), "",
    "### Content-on-time check (per-video data, version 202501)", "",
    ...(contentChecks.length ? ["| Product | Creator | Sample status | Videos | Published dates | Views | Orders | Sales |", "|---|---|---|---|---|---|---|---|",
      ...contentChecks.map((k) => {
        const dates = k.videos.map((v) => Number(v.published_date)).filter(Boolean).sort((a, b) => a - b);
        // paid_amount comes formatted ("RM12.30"), so keep only the number.
        const sum = (f: "view_count" | "paid_order_num" | "paid_amount") => k.videos.reduce((t, v) => t + (parseFloat((v[f] ?? "").replace(/[^0-9.-]/g, "")) || 0), 0);
        return `| ${cell(k.product)} | ${k.creator} | ${cell(k.sample)} | ${k.videos.length} | ${dates.length ? mytDate(dates[0]) + (dates.length > 1 ? " → " + mytDate(dates[dates.length - 1]) : "") : "—"} | ${sum("view_count")} | ${sum("paid_order_num")} | ${money(sum("paid_amount"), cur)} |`;
      })] : ["_no creator with videos found_"]), "",
    ...(errors.length ? ["### Errors", "", ...errors.map((e) => "- " + e), ""] : []));
  console_.push(`TAP creator performance: ${scanned.length} campaigns · ${productsWithCreators} products with creators · ${creators.length} creators (${registered.length} registered) · GMV ${money(totalGmv, cur)} · ${calls} calls in ${seconds}s${errors.length ? ` · ${errors.length} errors` : ""}`);
}

const file = writeReport("affiliate-orders", out);
console_.forEach((l) => console.log(l));
console.log(`Report written to ${file}`);
