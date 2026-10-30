import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { accessFor } from "@/modules/creator-accounts/access.ts";
import { connectionForUser } from "@/modules/creator-accounts/affiliate-connections.ts";
import { myPhoto } from "@/modules/photos/store.ts";

export const dynamic = "force-dynamic";

const NO_STORE = { headers: { "cache-control": "private, no-store" } };

/**
 * Who is signed in to Rezekii 2.0, for every screen (owner, 30 Oct 2026: real data, same design). Null when signed out, and
 * the screens keep their sample data. `shop` is the creator's TikTok Shop link, null when not linked.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ me: null }, NO_STORE);
  const [link, access] = await Promise.all([connectionForUser(user.id).catch(() => null), accessFor(user.id).catch(() => null)]);
  return NextResponse.json(
    {
      me: {
        id: user.id,
        name: user.display_name,
        email: user.email,
        role: user.role,
        photo: myPhoto(user) ?? user.avatar_url,
        handle: user.tiktok_username,
        shop: link ? { handle: link.username, access: access?.status ?? null } : null,
      },
    },
    NO_STORE,
  );
}
