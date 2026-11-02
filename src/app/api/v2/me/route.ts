import { after, NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { connectionForUser } from "@/modules/creator-accounts/affiliate-connections.ts";
import { sellerShopName } from "@/modules/marketplace/seller-connection.ts";
import { levelOf } from "@/modules/levels/store.ts";
import { myPhoto } from "@/modules/photos/store.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";
import { profileOf, type CreatorDetails } from "@/modules/rewards/profiles.ts";
import { betaRows, betaState } from "@/modules/beta/access.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Who is signed in to Rezekii 2.0, for every screen (owner, 30 Oct 2026: real data, same design). Null when signed out, and
 * the screens keep their sample data. `shop` is the creator's TikTok Shop link, null when not linked.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ me: null }, NO_STORE);
  // When she last used Rezekii, noted at most once an hour (owner, 2 Nov 2026: the nightly refresh does active creators first).
  const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
  after(() => supabaseRest(`app_users?id=eq.${user.id}&or=${encodeURIComponent(`(last_seen_at.is.null,last_seen_at.lt."${hourAgo}")`)}`, { method: "PATCH", headers: { prefer: "return=minimal" }, body: JSON.stringify({ last_seen_at: new Date().toISOString() }) }).catch(() => null));
  const [link, access, level, sellerShop, tt, profile, beta] = await Promise.all([
    connectionForUser(user.id).catch(() => null), accessFor(user.id).catch(() => null), levelOf(user.id).catch(() => "bronze" as const), sellerShopName(user).catch(() => null),
    // Her TikTok Shop creator level, read by the refresh queue after linking (owner, 14 Oct 2026).
    supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=tt_level&limit=1`).then((r) => r.json() as Promise<{ tt_level: number | null }[]>).catch(() => []),
    // The name she gave at sign-up is the one the app uses everywhere (owner, 1 Nov 2026), not her Google or TikTok name.
    profileOf<CreatorDetails>(user.id, "creator").catch(() => null),
    // Beta sign-up approval for the creator and the seller app (owner, 2 Nov 2026); null on a side she hasn't opened yet.
    betaRows(user.id).then(async (rows) => ({ creator: await betaState(rows.find((r) => r.side === "creator")), seller: await betaState(rows.find((r) => r.side === "seller")) })).catch(() => null),
  ]);
  // How she can sign in (owner, 31 Oct 2026: Settings shows the real ways in). No secrets leave the server.
  const [ways] = (await supabaseRest(`app_users?id=eq.${user.id}&select=google_sub,tiktok_open_id,tiktok_username,password_hash,login_email,email&limit=1`).then((r) => r.json()).catch(() => [])) as { google_sub: string | null; tiktok_open_id: string | null; tiktok_username: string | null; password_hash: string | null; login_email: string | null; email: string | null }[];
  return NextResponse.json(
    {
      me: {
        id: user.id,
        name: profile?.details.name?.trim() || user.display_name,
        email: user.email,
        role: user.role,
        photo: myPhoto(user) ?? user.avatar_url,
        handle: user.tiktok_username,
        level,
        shop: link ? { handle: link.username, access: access?.status ?? null, expired: link.refreshExpiresAt.getTime() < Date.now() } : null,
        ttLevel: link ? tt[0]?.tt_level ?? null : null,
        signIn: {
          tiktok: ways?.tiktok_open_id ? (ways.tiktok_username ? `@${ways.tiktok_username}` : "Linked") : null,
          google: ways?.google_sub ? ways.email ?? "Linked" : null,
          email: ways?.login_email ?? null,
          password: !!ways?.password_hash,
        },
        // The Seller Center shop this account authorized, for the seller app (owner, 30 Oct 2026).
        sellerShop,
        beta,
      },
    },
    NO_STORE,
  );
}
