import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { levelOf, markCelebrated } from "@/modules/levels/store.ts";

export const dynamic = "force-dynamic";

/** The creator closed the level-up screen: it does not show again for this level. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  await markCelebrated(user.id, await levelOf(user.id));
  return NextResponse.json({ ok: true });
}
