/**
 * v0.1 proof: TAP campaigns. Through Techwide's Partner Connection: lists Techwide's real TAP campaigns,
 * the products in one campaign, and makes a campaign product link. With --showcase it also adds that
 * product to @tinawellnesshacks' showcase by the campaign link (a real change on TikTok — only on request).
 *
 *   node --env-file=.env.local scripts/proof-tap.ts [--campaign <id>] [--product <id>] [--showcase]
 */
import { addShowcaseByLink } from "../src/integrations/tiktok-shop/creator.ts";
import { campaignProductLink, listCampaignProducts, listCampaigns } from "../src/integrations/tiktok-shop/partner.ts";
import { cell, creatorToken, mytDate, mytNow, partnerSession, pct, status, writeReport } from "./proof-lib.ts";

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf("--" + name); return i >= 0 ? args[i + 1] : undefined; };
const wantShowcase = args.includes("--showcase");
const HANDLE = process.env.PROOF_HANDLE ?? "tinawellnesshacks";

const p = await partnerSession();
const camps = await listCampaigns(p.token, p.cipher);
const clist = camps.data?.campaigns ?? [];
const campaign = flag("campaign") ? clist.find((c) => c.id === flag("campaign")) : clist.find((c) => c.status === "ONGOING") ?? clist[0];
const prods = campaign ? await listCampaignProducts(p.token, p.cipher, campaign.id) : null;
const plist = prods?.data?.products ?? [];
const product = flag("product") ? plist.find((x) => x.id === flag("product")) : plist.find((x) => x.review_status === "APPROVED") ?? plist[0];
const link = campaign && product ? await campaignProductLink(p.token, p.cipher, campaign.id, product.id) : null;
const promo = link?.data?.product_promotion_link;
const showcase = wantShowcase && promo ? await addShowcaseByLink(await creatorToken(HANDLE), promo) : null;

const out = [
  `# TAP campaign proof — ${mytNow()} (Malaysia time)`,
  "",
  `Partner: **${p.name}** · category "${p.category}" · market ${p.market}`,
  "",
  "## Techwide's TAP campaigns",
  "",
  `\`GET /affiliate_partner/202405/campaigns\` (MY_CAMPAIGNS) → ${status(camps)} · ${camps.data?.total_count ?? clist.length} campaigns`,
  "",
  "| Campaign | ID | Status | Runs | Registration |",
  "|---|---|---|---|---|",
  ...clist.map((c) => `| ${cell(c.name)}${campaign && c.id === campaign.id ? " ← used below" : ""} | ${c.id} | ${cell(c.status)} | ${mytDate(c.campaign_start_time)} – ${mytDate(c.campaign_end_time)} | ${mytDate(c.registration_start_time)} – ${mytDate(c.registration_end_time)} |`),
  "",
  `## Products in "${campaign?.name ?? "—"}"`,
  "",
  `\`GET /affiliate_partner/202405/campaigns/{id}/products\` → ${status(prods)} · ${plist.length} on the first page`,
  "",
  "| Product | ID | Shop | Review | Open | Partner (TAP) | Creator | Sales | Sample quota |",
  "|---|---|---|---|---|---|---|---|---|",
  ...plist.map((x) => `| ${cell(x.name)}${product && x.id === product.id ? " ← link made" : ""} | ${x.id} | ${cell(x.shop_name)} | ${cell(x.review_status)} | ${pct(x.open_collaboration_commission_rate)} | ${pct(x.partner_commission_rate)} | ${pct(x.creator_commission_rate)} | ${cell(x.product_sales)} | ${cell(x.sample_quota)} |`),
  "",
  "## Campaign product link",
  "",
  `\`POST …/promotion_link/generate\` → ${status(link)}`,
  "",
  promo ? `Link: ${promo}` : "No link returned.",
  "",
  "## Add to showcase by campaign link",
  "",
  wantShowcase ? `\`POST /affiliate_creator/202405/showcases/products/add\` (PRODUCT_LINK) for @${HANDLE} → ${status(showcase)}${showcase?.data?.errors?.length ? " · errors: " + JSON.stringify(showcase.data.errors) : ""}` : "Not run (needs --showcase). It adds the product to the creator's real TikTok showcase.",
  "",
  "## Raw TikTok replies",
  "",
  "```json",
  JSON.stringify({ campaigns: camps, products: prods, link, showcase }, null, 2),
  "```",
  "",
];
const file = writeReport("tap-campaigns", out);
console.log(`Campaigns: ${status(camps)} · ${clist.length} found`);
console.log(`Products: ${status(prods)} · ${plist.length} found`);
console.log(`Campaign link: ${status(link)}`);
if (wantShowcase) console.log(`Showcase add: ${status(showcase)}`);
console.log(`Report written to ${file}`);
