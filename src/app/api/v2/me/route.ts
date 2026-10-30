import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { connectionForUser } from "@/modules/creator-accounts/affiliate-connections.ts";
import { sellerShopName } from "@/modules/marketplace/seller-connection.ts";
import { levelOf } from "@/modules/levels/store.ts";
import { myPhoto } from "@/modules/photos/store.ts";
import { supabaseRest } from "@/integrations/supabase/rest.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Who is signed in to Rezekii 2.0, for every screen (owner, 30 Oct 2026: real data, same design). Null when signed out, and
 * the screens keep their sample data. `shop` is the creator's TikTok Shop link, null when not linked.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ me: null }, NO_STORE);
  const [link, access, level, sellerShop, tt] = await Promise.all([
    connectionForUser(user.id).catch(() => null), accessFor(user.id).catch(() => null), levelOf(user.id).catch(() => "bronze" as const), sellerShopName(user).catch(() => null),
    // Her TikTok Shop creator level, read by the refresh queue after linking (owner, 14 Oct 2026).
    supabaseRest(`affiliate_connections?user_id=eq.${user.id}&select=tt_level&limit=1`).then((r) => r.json() as Promise<{ tt_level: number | null }[]>).catch(() => []),
  ]);
  return NextResponse.json(
    {
      me: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        role: user.role,
        photo: myPhoto(user) ?? user.avatar_url,
        handle: user.tiktok_username,
        level,
        shop: link ? { handle: link.username, access: access?.status ?? null } : null,
        ttLevel: link ? tt[0]?.tt_level ?? null : null,
        // The Seller Center shop this account authorized, for the seller app (owner, 30 Oct 2026).
        sellerShop,
      },
    },
    NO_STORE,
  );
}
