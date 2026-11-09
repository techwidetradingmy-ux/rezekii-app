import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/app/current-user";
import type { CommentAction } from "@/integrations/meta/comments.ts";
import { channelComments, commentAction } from "@/modules/social/comments.ts";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Comments: the latest comments on one of the signed-in account's Facebook Pages or Instagram accounts (?account=…). */
export async function GET(req: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const account = req.nextUrl.searchParams.get("account") ?? "";
  try {
    const data = await channelComments(user.id, account);
    if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[comments] read failed", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Meta didn't answer. Try again." }, { status: 502 });
  }
}

/** Reply to, hide, show again or delete a comment: { account, comment, action, message? }. */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Please do this from rezekii.com." }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { account?: string; comment?: string; action?: CommentAction; message?: string };
  const r = await commentAction(user.id, String(b.account ?? ""), String(b.comment ?? ""), b.action as CommentAction, String(b.message ?? ""));
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
