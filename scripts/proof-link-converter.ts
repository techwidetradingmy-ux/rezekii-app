/**
 * v0.1 proof: converts real TikTok Shop product links into affiliate links through
 * @tinawellnesshacks' Affiliate Connection, using both TikTok Shop link APIs,
 * and writes every reply to docs/proof/ as evidence (no tokens are written).
 *
 *   node --env-file=.env.local scripts/proof-link-converter.ts <link> [<link> ...]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { refreshTokens } from "../src/integrations/tiktok-shop/auth.ts";
import { generateGeneralLinks, generateTaggedLinks, getCreatorProfile } from "../src/integrations/tiktok-shop/creator.ts";
import { resolveProductId } from "../src/integrations/tiktok-shop/product-id.ts";
import { getAffiliateConnection, saveAffiliateConnection } from "../src/modules/creator-accounts/affiliate-connections.ts";

const HANDLE = process.env.PROOF_HANDLE ?? "tinawellnesshacks";
const TAGS = ["threads", "whatsapp"];
const GENERAL_PATH = "/affiliate_creator/202505/affiliate_sharing_links/general_publishers/generate_batch";
const TAGGED_PATH = "/affiliate_creator/202501/affiliate_sharing_links/generate_batch";

const links = process.argv.slice(2);
if (links.length === 0) {
  console.error("Usage: node --env-file=.env.local scripts/proof-link-converter.ts <product link> [<product link> ...]");
  process.exit(1);
}

let conn = await getAffiliateConnection(HANDLE);
if (!conn) {
  console.error(`@${HANDLE} has not linked TikTok Shop yet. Open https://rezekii.com/api/auth/tiktokshop/start first.`);
  process.exit(1);
}
if (conn.accessExpiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
  const refreshed = await refreshTokens(conn.refreshToken);
  if (refreshed.code !== 0 || !refreshed.data) {
    console.error("Token refresh failed:", refreshed.code, refreshed.message);
    process.exit(1);
  }
  await saveAffiliateConnection({ openId: conn.openId, username: conn.username }, refreshed.data);
  conn = { ...conn, accessToken: refreshed.data.access_token };
}
const token = conn.accessToken;

const profile = await getCreatorProfile(token);
const tested = [];
for (const link of links) {
  tested.push({ link, productId: await resolveProductId(link).catch(() => null) });
}
const ids = tested.flatMap((t) => (t.productId ? [t.productId] : []));
const general = ids.length ? await generateGeneralLinks(token, ids) : null;
const tagged = [];
for (const id of ids) tagged.push({ id, reply: await generateTaggedLinks(token, id, TAGS) });

// ---- report ----
const now = new Date();
const myt = now.toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
const cell = (v?: string) => (v ? v.replace(/\|/g, "%7C") : "—");
const status = (r: { code: number; message: string; request_id?: string } | null) =>
  r ? `code \`${r.code}\` · ${r.code === 0 ? "success" : r.message} · request_id \`${r.request_id ?? "—"}\`` : "not called (no product IDs)";

const out: string[] = [
  `# Link converter proof — ${myt} (Malaysia time)`,
  "",
  `Account: **@${profile.data?.username ?? HANDLE}** · TikTok Shop profile API: ${status(profile)}`,
  "",
  "## Links tested",
  "",
  "| # | Link pasted | Product ID found |",
  "|---|---|---|",
  ...tested.map((t, i) => `| ${i + 1} | ${cell(t.link)} | ${t.productId ?? "**not found**"} |`),
  "",
  `## API 1 — Creator Generate General Link`,
  "",
  `\`POST ${GENERAL_PATH}\` → ${status(general)}`,
  "",
  "| Product ID | sharing_link | one_link | Failed reason |",
  "|---|---|---|---|",
  ...ids.map((id) => {
    const ok = general?.data?.sharing_links?.find((l) => l.material_id === id);
    const bad = general?.data?.failed_materials?.find((l) => l.material_id === id);
    return `| ${id} | ${cell(ok?.sharing_link)} | ${cell(ok?.one_link)} | ${cell(bad?.fail_reason)} |`;
  }),
  "",
  `## API 2 — Generate Affiliate Sharing Link (tags: ${TAGS.join(", ")})`,
  "",
  `\`POST ${TAGGED_PATH}\``,
  "",
  "| Product ID | Result | Tag | Link | Error |",
  "|---|---|---|---|---|",
  ...tagged.flatMap(({ id, reply }) =>
    TAGS.map((tag) => {
      const ok = reply.data?.affiliate_sharing_links?.find((l) => l.tag === tag);
      const bad = reply.data?.errors?.find((e) => e.detail?.tag === tag);
      return `| ${id} | ${status(reply)} | ${tag} | ${cell(ok?.affiliate_sharing_link)} | ${cell(bad?.detail?.fail_reason ?? bad?.message)} |`;
    }),
  ),
  "",
  "## Raw TikTok replies",
  "",
  "```json",
  JSON.stringify({ profile, general, tagged }, null, 2),
  "```",
  "",
  "## Owner check (on your phone)",
  "",
  "Open each returned link and confirm it lands on the right product page. Record the result here.",
  "",
];

mkdirSync("docs/proof", { recursive: true });
const file = `docs/proof/link-converter-${now.toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
writeFileSync(file, out.join("\n"), "utf8");
console.log(`Profile: ${status(profile)}`);
console.log(`API 1 (general link): ${status(general)}`);
for (const { id, reply } of tagged) console.log(`API 2 (tagged) ${id}: ${status(reply)}`);
console.log(`Report written to ${file}`);
