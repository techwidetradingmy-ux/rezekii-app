import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { levelOf, markCelebrated } from "@/modules/levels/store.ts";
import { getLang, tFor } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/** The creator closed the level-up screen: it does not show again for this level. */
export async function POST() {
  const t = tFor(await getLang());
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: t("Sign in first.") }, { status: 401 });
  await markCelebrated(user.id, await levelOf(user.id));
  return NextResponse.json({ ok: true });
}
