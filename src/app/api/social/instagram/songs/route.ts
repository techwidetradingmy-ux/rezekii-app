import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { MetaError } from "@/integrations/meta/graph.ts";
import { instagramSongs } from "@/integrations/meta/instagram.ts";
import { freshToken, getAccount, igAuth, markReconnect } from "@/modules/social/accounts.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Songs for an Instagram Reel (owner, 23 Nov 2026): Instagram's licensed songs matching ?q, or its trending songs when ?q is
 * empty, asked as the picked account (?account). Only for an account connected through Facebook: Meta's Audio API doesn't
 * work with Instagram Login.
 */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const q = req.nextUrl.searchParams;
  const id = q.get("account") ?? "";
  const acc = /^[0-9a-f-]{36}$/.test(id) ? await getAccount(id, user.id) : null;
  if (!acc || acc.platform !== "instagram" || acc.connected_via !== "facebook") return NextResponse.json({ error: t("Connect through Facebook to add music.") }, { status: 400 });
  try {
    const songs = await instagramSongs(acc.external_id, igAuth(acc, await freshToken(acc)), (q.get("q") ?? "").slice(0, 100));
    return NextResponse.json({ songs }, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    if (err instanceof MetaError && err.needsReconnect) {
      await markReconnect(acc.id);
      return NextResponse.json({ error: t("This channel needs connecting again (Publish → New Post).") }, { status: 409 });
    }
    console.error("[instagram songs]", err instanceof MetaError ? `${err.code}/${err.subcode}: ${err.message}` : err instanceof Error ? err.message : err);
    return NextResponse.json({ error: t("Meta didn't answer. Try again.") }, { status: 502 });
  }
}
