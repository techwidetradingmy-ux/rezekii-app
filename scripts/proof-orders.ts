/**
 * v0.1 proof: affiliate orders, read-only. Pulls ALL order history TikTok returns (no start date given,
 * so TikTok starts from its earliest data) for @tinawellnesshacks and for Techwide's TAP campaigns,
 * then summarises GMV, commission, months, top products/content/tags and (TAP) creators.
 * Only the first raw page of each is saved, plus the summaries. Nothing is changed on TikTok.
 *
 *   node --env-file=.env.local scripts/proof-orders.ts [--creator-only | --tap-only] [--max-pages 200]
 */
import { searchCreatorOrders, type AffiliateOrder } from "../src/integrations/tiktok-shop/creator.ts";
import { searchTapOrders } from "../src/integrations/tiktok-shop/partner.ts";
import { summarizeOrders, type OrdersSummary, type Row } from "../src/modules/stats/orders-summary.ts";
import { cell, creatorToken, mytDate, mytNow, partnerSession, status, writeReport } from "./proof-lib.ts";

const args = process.argv.slice(2);
const maxPages = Number(args[args.indexOf("--max-pages") + 1]) || 200;
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
  const p = await partnerSession();
  const run = await pullAll((pageSize, pageToken) => searchTapOrders(p.token, p.cipher, { pageSize, pageToken }), 100);
  const s = summarizeOrders(run.orders);
  out.push("", `## Techwide TAP campaign orders (all creators) — ${p.name}`, "", `\`POST /affiliate_partner/202411/orders/search\` → ${status(run.first)}`, "", ...summaryLines(s, run),
    ...table("Top creators (TAP sales)", s.byCreator, s.currency, 20), ...table("By month", s.byMonth, s.currency, 60), ...table("Top products", s.byProduct, s.currency), ...table("Top videos / LIVEs (by content ID)", s.byContent, s.currency),
    "First raw page:", "", "```json", JSON.stringify(run.first, null, 2).slice(0, 20000), "```", "");
  console_.push(`TAP orders: ${status(run.first)} · ${s.orders} orders · ${mytDate(s.earliest)} → ${mytDate(s.latest)} · GMV ${money(s.gmv, s.currency)} · ${s.byCreator.length} creators`);
}

const file = writeReport("affiliate-orders", out);
console_.forEach((l) => console.log(l));
console.log(`Report written to ${file}`);
