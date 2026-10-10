/**
 * v0.1 proof: Product Lookup. Gets real product facts from TikTok Shop for the given links
 * through @tinawellnesshacks' Affiliate Connection, and writes the replies to docs/proof/.
 *
 *   node --env-file=.env.local scripts/proof-lookup.ts <link> [<link> ...]
 */
import { lookupProducts } from "../src/integrations/tiktok-shop/creator.ts";
import { resolveProductId } from "../src/integrations/tiktok-shop/product-id.ts";
import { cell, creatorToken, fail, mytNow, pct, status, writeReport } from "./proof-lib.ts";

const HANDLE = process.env.PROOF_HANDLE ?? "tinawellnesshacks";
const PATH = "/affiliate_creator/202509/open_collaborations/products";
const links = process.argv.slice(2);
if (!links.length) fail("Usage: node --env-file=.env.local scripts/proof-lookup.ts <product link> [<product link> ...]");

const token = await creatorToken(HANDLE);
const tested = [];
for (const link of links.slice(0, 20)) tested.push({ link, id: await resolveProductId(link).catch(() => null) });
const ids = [...new Set(tested.flatMap((t) => (t.id ? [t.id] : [])))];
const reply = ids.length ? await lookupProducts(token, ids) : null;
const found = new Map((reply?.data?.products ?? []).map((p) => [p.id, p]));

const price = (p?: { currency: string; minimum_amount: string; maximum_amount: string }) =>
  p ? `${p.currency} ${p.minimum_amount}${p.maximum_amount && p.maximum_amount !== p.minimum_amount ? "–" + p.maximum_amount : ""}` : "—";

const out = [
  `# Product Lookup proof — ${mytNow()} (Malaysia time)`,
  "",
  `Account: **@${HANDLE}** · \`POST ${PATH}\` → ${status(reply)}`,
  "",
  "| # | Link | Product ID | Title | Price | Open commission | Units sold | In stock | Shop | Category |",
  "|---|---|---|---|---|---|---|---|---|---|",
  ...tested.map((t, i) => {
    const p = t.id ? found.get(t.id) : undefined;
    if (!t.id) return `| ${i + 1} | ${cell(t.link)} | **not found in link** | — | — | — | — | — | — | — |`;
    if (!p) return `| ${i + 1} | ${cell(t.link)} | ${t.id} | **not returned by TikTok** | — | — | — | — | — | — |`;
    return `| ${i + 1} | ${cell(t.link)} | ${t.id} | ${cell(p.title)} | ${price(p.sales_price)} | ${pct(p.commission?.rate)} | ${cell(p.units_sold)} | ${p.has_inventory ? "yes" : "no"} | ${cell(p.shop?.name)} | ${cell((p.category_chains ?? []).map((c) => c.local_name).join(" › "))} |`;
  }),
  "",
  "## Raw TikTok reply",
  "",
  "```json",
  JSON.stringify(reply, null, 2),
  "```",
  "",
];
const file = writeReport("product-lookup", out);
console.log(`Lookup: ${status(reply)} · ${found.size} of ${ids.length} products returned`);
console.log(`Report written to ${file}`);
