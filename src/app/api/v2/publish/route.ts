import { after, NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { userTikTokAccounts } from "@/modules/posting/store.ts";
import { balanceOf } from "@/modules/rewards/ledger.ts";
import { postSide, postsFree, settlePostRefunds } from "@/modules/rewards/post-credits.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { boardPosts } from "@/modules/social/board.ts";
import { lastPostChannels, listBrands } from "@/modules/social/brands.ts";
import { tiktokKey } from "@/modules/social/picker.ts";
import { listShopee, shopeeLabel } from "@/modules/shopee/connections.ts";
import { freshUrl } from "@/modules/photos/store.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };
const COLOR = { tiktok: "#00a862", facebook: "#1877f2", instagram: "#e1306c", threads: "#111111", shopee: "#ee4d2d" } as const;
const SUB = { tiktok: "TikTok", facebook: "Facebook Page", instagram: "Instagram", threads: "Threads" } as const;
const initials = (s: string) => s.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/**
 * Post Everywhere on real data (owner, 31 Oct 2026). ?part=setup: her connected channels, brands, last post's channels and
 * credits (?side=creator or seller wallet). ?part=posts: every post with each channel's status. Credits for channels that
 * failed or were cancelled come back after the answer is sent (owner, 23 Nov 2026: Publish and the Content Calendar were slow).
 */
export async function GET(req: NextRequest) {
  const lang = await getLang();
  const t = tFor(lang);
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const started = Date.now();
  after(() => settlePostRefunds(user.id).catch((e) => console.error("[post credits] refunds", e instanceof Error ? e.message : e)));
  if (q.get("part") === "posts") {
    const board = await boardPosts(user.id, lang);
    console.info(`[publish] posts ${board.posts.length} in ${Date.now() - started}ms`);
    return NextResponse.json(board, NO_STORE);
  }

  // Shopee shows only where the Shopee app's keys are set (as on rezekii.com's Shopee build).
  const shopeeOn = !!process.env.SHOPEE_PARTNER_ID;
  const [tiktok, social, brands, last, credits, free, shopee] = await Promise.all([
    userTikTokAccounts(user.id),
    listAccounts(user.id),
    listBrands(user.id),
    lastPostChannels(user.id),
    balanceOf(user.id, postSide(q.get("side"))),
    postsFree(user.id),
    shopeeOn ? listShopee(user.id).catch(() => []) : Promise.resolve([]),
  ]);
  // Each account's profile picture (owner, 22 Nov 2026): TikTok's own link while it works, else Rezekii's saved copy (TikTok's
  // links expire within days); Meta's and Shopee's links as kept fresh by the timer. Initials show when a picture won't load.
  const channels = [
    ...tiktok.map((acc) => {
      const name = acc.username ? `@${acc.username}` : t("TikTok account");
      return { key: tiktokKey(acc.open_id), app: "tiktok" as const, name, sub: SUB.tiktok, initials: initials(name), color: COLOR.tiktok, status: acc.status, photo: freshUrl(acc.avatar_url) ?? (acc.username ? `/api/img/c/${encodeURIComponent(acc.username.toLowerCase())}` : null) };
    }),
    ...social.map((a) => {
      const name = a.name ?? a.username ?? (a.platform === "facebook" ? t("Facebook Page") : SUB[a.platform]);
      const sub = a.platform === "facebook" ? t("Facebook Page") : a.username ? `@${a.username}` : SUB[a.platform];
      return { key: a.id, app: a.platform, name, sub, initials: initials(name), color: COLOR[a.platform], status: a.status === "reconnect" ? ("reconnect" as const) : ("active" as const), photo: a.avatar_url ?? null };
    }),
    ...shopee.map((c) => {
      const name = shopeeLabel(c);
      // Shopee gives apps no username for an affiliate, only its account number.
      const sub = c.role === "seller" ? t("Shopee Shop") : t("Shopee Affiliate · ID {id}", { id: c.shopee_user_id });
      return { key: `shopee:${c.id}`, app: "shopee" as const, name, sub, initials: initials(name), color: COLOR.shopee, status: c.status, role: c.role, shopId: c.shop_id, photo: c.avatar_url ?? null };
    }),
  ];
  console.info(`[publish] setup ${channels.length} channels in ${Date.now() - started}ms`);
  return NextResponse.json({ channels, brands, last, credits, free, shopeeOn }, NO_STORE);
}
