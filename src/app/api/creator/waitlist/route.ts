import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { joinWaitlist } from "@/modules/creator-accounts/access.ts";

export const dynamic = "force-dynamic";

/** Join the waitlist while all of Rezekii's TikTok Shop places are taken. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const result = await joinWaitlist(user);
  if (result === "free") return NextResponse.json({ error: "A place just freed up. Link your TikTok Shop now." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
