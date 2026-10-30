import { NextResponse } from "next/server";
import { currentUser } from "@/app/current-user";
import { badgesFor } from "@/modules/rewards/badges.ts";

export const dynamic = "force-dynamic";

/** Her level, TikTok Shop level, streak and badges (owner, 31 Oct 2026: real data). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.json(await badgesFor(user.id), { headers: { "cache-control": "private, no-store" } });
}
