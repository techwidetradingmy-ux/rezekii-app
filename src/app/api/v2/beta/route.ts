import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { joinBeta, tappedGroup, type BetaSide } from "@/modules/beta/access.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * The beta queue for the signed-in account (owner, 2 Nov 2026). { side } joins it (keeping an earlier place) and returns where
 * they stand; { side, group: true } notes that they tapped Join Our WhatsApp Group.
 */
export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: t("Please do this from Rezekii.") }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { side?: unknown; group?: unknown };
  if (b.side !== "creator" && b.side !== "seller") return NextResponse.json({ error: t("Say which app.") }, { status: 400 });
  const side = b.side as BetaSide;
  if (b.group === true) {
    await tappedGroup(user.id, side);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ beta: await joinBeta(user.id, side) }, { headers: { "cache-control": "private, no-store" } });
}
