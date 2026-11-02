import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { cardOf, cleanCard, saveCardFor } from "@/modules/creator-details/card.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** Her rate card (owner, 31 Oct 2026: real storage): prices per app, up to 3 packages and what sellers see. */
export async function GET() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  return NextResponse.json((await cardOf(user.id)) ?? { card: null, savedAt: null }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(req: NextRequest) {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  const card = cleanCard((await req.json().catch(() => ({}))) as Record<string, unknown>);
  if (!(await saveCardFor(user.id, card))) return NextResponse.json({ error: t("Didn't save. Please try again.") }, { status: 500 });
  return NextResponse.json({ card });
}
