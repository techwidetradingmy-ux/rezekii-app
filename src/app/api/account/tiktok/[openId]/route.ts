import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import { disconnectTikTokAccount } from "@/modules/accounts/manage.ts";

export const dynamic = "force-dynamic";

/** Disconnect one TikTok account (Channels): its scheduled posts move to drafts; the user's other TikTok accounts stay. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ openId: string }> }) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { openId } = await params;
  try {
    const r = await disconnectTikTokAccount(user.id, decodeURIComponent(openId));
    if (!r) return NextResponse.json({ error: "That TikTok account isn't connected." }, { status: 404 });
    return NextResponse.json(r);
  } catch (err) {
    console.error("[account] disconnect failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not disconnect TikTok right now. Please try again." }, { status: 500 });
  }
}
