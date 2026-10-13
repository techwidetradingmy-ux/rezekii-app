import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { disconnectTikTok } from "@/modules/accounts/manage.ts";

export const dynamic = "force-dynamic";

/** Disconnect TikTok (My accounts). Same-origin only. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  try {
    return NextResponse.json(await disconnectTikTok(user.id));
  } catch (err) {
    console.error("[account] disconnect failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not disconnect TikTok right now. Please try again." }, { status: 500 });
  }
}
