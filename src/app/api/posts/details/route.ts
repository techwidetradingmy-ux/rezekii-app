import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { postDetails } from "@/modules/posting/edit.ts";

export const dynamic = "force-dynamic";

/** Everything a post was scheduled with (?key= the TikTok post or the group), for its Details on My posts and All channels. */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const details = await postDetails(user.id, req.nextUrl.searchParams.get("key") ?? "");
  return details ? NextResponse.json(details, { headers: { "cache-control": "private, no-store" } }) : NextResponse.json({ error: "That post wasn't found." }, { status: 404 });
}
