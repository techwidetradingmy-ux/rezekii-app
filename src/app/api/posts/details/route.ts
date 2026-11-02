import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { postDetails } from "@/modules/posting/edit.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Everything a post was scheduled with (?key= the TikTok post or the group), for its Details on My posts and All channels. */
export async function GET(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const details = await postDetails(user.id, req.nextUrl.searchParams.get("key") ?? "");
  return details ? NextResponse.json(details, { headers: { "cache-control": "private, no-store" } }) : NextResponse.json({ error: t("That post wasn't found.") }, { status: 404 });
}
