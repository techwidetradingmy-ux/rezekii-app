import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { cleanTags, convertLink, type ConvertRow } from "@/modules/tap/convert.ts";

export const dynamic = "force-dynamic";

/**
 * Pasted TikTok product links (up to 5 per call) and platform tags. With the creator's TikTok Shop link: one affiliate link per tag.
 * Without it: products in Techwide's TAP campaigns get a TAP link; others need the TikTok Shop link.
 */
export async function POST(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { links?: unknown; tags?: unknown };
  const lines = (Array.isArray(body.links) ? body.links : []).filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim().slice(0, 500)).slice(0, 5);
  if (!lines.length) return NextResponse.json({ error: "Paste at least one product link." }, { status: 400 });
  const token = await approvedCreatorToken(user.id);
  const tags = cleanTags(body.tags);
  const rows: ConvertRow[] = [];
  for (const input of lines) rows.push(...(await convertLink(user, token, input, tags)));
  return NextResponse.json({ rows, linked: !!token });
}
