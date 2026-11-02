import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { approvedCreatorToken } from "@/modules/creator-accounts/access.ts";
import { lookupLinks } from "@/modules/tap/convert.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Product facts for up to 20 pasted TikTok product links (TikTok Shop's Product Lookup, or Techwide's TAP catalog). */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { links?: unknown };
  const lines = (Array.isArray(body.links) ? body.links : []).filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim().slice(0, 500)).slice(0, 20);
  if (!lines.length) return NextResponse.json({ error: t("Paste at least one product link.") }, { status: 400 });
  const token = await approvedCreatorToken(user.id);
  try {
    // Rezekii's notes in her language.
    return NextResponse.json({ rows: (await lookupLinks(token, lines)).map((r) => (r.note ? { ...r, note: t(r.note) } : r)), linked: !!token });
  } catch (err) {
    console.error("[lookup]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: t("TikTok Shop did not answer. Please try again.") }, { status: 502 });
  }
}
