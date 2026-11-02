import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { userTikTokAccounts } from "@/modules/posting/store.ts";
import { balanceOf } from "@/modules/rewards/ledger.ts";
import { postSide, settlePostRefunds } from "@/modules/rewards/post-credits.ts";
import { listAccounts } from "@/modules/social/accounts.ts";
import { boardPosts } from "@/modules/social/board.ts";
import { lastPostChannels, listBrands } from "@/modules/social/brands.ts";
import { tiktokKey } from "@/modules/social/picker.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };
const COLOR = { tiktok: "#00a862", facebook: "#1877f2", instagram: "#e1306c", threads: "#111111" } as const;
const SUB = { tiktok: "TikTok", facebook: "Facebook Page", instagram: "Instagram", threads: "Threads" } as const;
const initials = (s: string) => s.replace(/^@/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/**
 * Post Everywhere on real data (owner, 31 Oct 2026). ?part=setup: her connected channels, brands, last post's channels and
 * credits (?side=creator or seller wallet). ?part=posts: every post with each channel's status, after giving back credits for
 * channels that failed or were cancelled.
 */
export async function GET(req: NextRequest) {
  const lang = await getLang();
  const t = tFor(lang);
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  await settlePostRefunds(user.id).catch((e) => console.error("[post credits] refunds", e instanceof Error ? e.message : e));
  if (q.get("part") === "posts") return NextResponse.json(await boardPosts(user.id, lang), NO_STORE);

  const [tiktok, social, brands, last, credits] = await Promise.all([
    userTikTokAccounts(user.id),
    listAccounts(user.id),
    listBrands(user.id),
    lastPostChannels(user.id),
    balanceOf(user.id, postSide(q.get("side"))),
  ]);
  const channels = [
    ...tiktok.map((acc) => {
      const name = acc.username ? `@${acc.username}` : t("TikTok account");
      return { key: tiktokKey(acc.open_id), app: "tiktok" as const, name, sub: SUB.tiktok, initials: initials(name), color: COLOR.tiktok, status: acc.status };
    }),
    ...social.map((a) => {
      const name = a.name ?? a.username ?? (a.platform === "facebook" ? t("Facebook Page") : SUB[a.platform]);
      const sub = a.platform === "facebook" ? t("Facebook Page") : a.username ? `@${a.username}` : SUB[a.platform];
      return { key: a.id, app: a.platform, name, sub, initials: initials(name), color: COLOR[a.platform], status: a.status === "reconnect" ? ("reconnect" as const) : ("active" as const) };
    }),
  ];
  return NextResponse.json({ channels, brands, last, credits }, NO_STORE);
}
