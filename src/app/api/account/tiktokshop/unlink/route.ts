import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { unlinkCreator } from "@/modules/creator-accounts/access.ts";

export const dynamic = "force-dynamic";

/** Unlink TikTok Shop: the link and the approval go, and the place frees up for the next creator on the waitlist. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (user.role === "admin") return NextResponse.json({ error: "Techwide accounts don't link TikTok Shop here." }, { status: 400 });
  await unlinkCreator(user.id, user.tiktok_username);
  return NextResponse.json({ ok: true });
}
