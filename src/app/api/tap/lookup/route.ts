import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { creatorTokenFor, lookupLinks } from "@/modules/tap/convert.ts";

export const dynamic = "force-dynamic";

/** Product facts for up to 20 pasted TikTok product links (TikTok Shop's Product Lookup, or Techwide's TAP catalog). */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { links?: unknown };
  const lines = (Array.isArray(body.links) ? body.links : []).filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim().slice(0, 500)).slice(0, 20);
  if (!lines.length) return NextResponse.json({ error: "Paste at least one product link." }, { status: 400 });
  const token = await creatorTokenFor(user.tiktok_username);
  try {
    return NextResponse.json({ rows: await lookupLinks(token, lines), linked: !!token });
  } catch (err) {
    console.error("[lookup]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "TikTok Shop did not answer. Please try again." }, { status: 502 });
  }
}
