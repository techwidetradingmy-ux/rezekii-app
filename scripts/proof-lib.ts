/** Shared helpers for the v0.1 proof scripts: load + refresh stored tokens, format replies, write reports to docs/proof/. */
import { mkdirSync, writeFileSync } from "node:fs";
import { refreshTokens } from "../src/integrations/tiktok-shop/auth.ts";
import { TAP_CATEGORY, getCategoryAssets, tapAsset } from "../src/integrations/tiktok-shop/partner.ts";
import { getAffiliateConnection, saveAffiliateConnection } from "../src/modules/creator-accounts/affiliate-connections.ts";
import { getPartnerConnection, savePartnerConnection } from "../src/modules/marketplace/partner-connection.ts";

const soon = (d: Date) => d.getTime() < Date.now() + 10 * 60 * 1000;

export function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

/** Access token for a creator's Affiliate Connection, refreshed if it expires within 10 minutes. */
export async function creatorToken(handle: string): Promise<string> {
  const conn = await getAffiliateConnection(handle);
  if (!conn) fail(`@${handle} has not linked TikTok Shop yet. Open https://rezekii.com/api/auth/tiktokshop/start first.`);
  if (!soon(conn.accessExpiresAt)) return conn.accessToken;
  const r = await refreshTokens(conn.refreshToken);
  if (r.code !== 0 || !r.data) fail(`Token refresh failed: ${r.code} ${r.message}`);
  await saveAffiliateConnection({ openId: conn.openId, username: conn.username }, r.data);
  return r.data.access_token;
}

/** Techwide's partner token plus the category-asset cipher every partner API needs (Malaysia market preferred). */
export async function partnerSession(): Promise<{ token: string; cipher: string; name: string; market: string; category: string }> {
  const conn = await getPartnerConnection();
  if (!conn) fail("Techwide's Partner Center account has not linked yet. Open https://rezekii.com/api/auth/tiktokshop/start?as=partner first.");
  let token = conn.accessToken;
  if (soon(conn.accessExpiresAt)) {
    const r = await refreshTokens(conn.refreshToken);
    if (r.code !== 0 || !r.data) fail(`Partner token refresh failed: ${r.code} ${r.message}`);
    await savePartnerConnection({ openId: conn.openId, name: conn.name }, r.data);
    token = r.data.access_token;
  }
  let assets = conn.assets;
  if (!assets.length) {
    const a = await getCategoryAssets(token);
    if (a.code !== 0) fail(`Get Authorized Category Assets failed: ${a.code} ${a.message} (request ${a.request_id})`);
    assets = a.data?.category_assets ?? [];
  }
  const pick = tapAsset(assets);
  if (!pick) fail(`The partner's "${TAP_CATEGORY}" (TAP) category for MY was not authorized. Re-authorize and tick it.`);
  return { token, cipher: pick.cipher, name: conn.name, market: pick.target_market ?? "?", category: pick.category?.name ?? "?" };
}

export const status = (r: { code: number; message: string; request_id?: string } | null | undefined) =>
  r ? `code \`${r.code}\` · ${r.code === 0 ? "success" : r.message} · request_id \`${r.request_id ?? "—"}\`` : "not called";

export const cell = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v).replace(/\|/g, "%7C"));
export const pct = (rateTimes100?: number) => (typeof rateTimes100 === "number" ? (rateTimes100 / 100).toFixed(rateTimes100 % 100 ? 2 : 0) + "%" : "—");
export const mytNow = () => new Date().toLocaleString("en-GB", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" });
export const mytDate = (unix?: number) => (unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short", year: "numeric" }) : "—");

/** Writes docs/proof/<name>-<UTC timestamp>.md and returns the path. Replies never contain tokens. */
export function writeReport(name: string, lines: string[]): string {
  mkdirSync("docs/proof", { recursive: true });
  const file = `docs/proof/${name}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
  writeFileSync(file, lines.join("\n"), "utf8");
  return file;
}
