import { NextResponse, type NextRequest } from "next/server";
import { handoffCode, takeHandoff } from "@/modules/accounts/handoff.ts";
import { signInDevice } from "../device.ts";

export const dynamic = "force-dynamic";

/**
 * The Home Screen app claims a sign-in finished in the phone's browser: { code }. Ready: a session of its own (90 days) and
 * where to go. Not yet: { waiting: true }, and the app asks again in a moment.
 */
export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && origin !== req.nextUrl.origin) return NextResponse.json({ error: "Wrong site." }, { status: 403 });
  const code = handoffCode(((await req.json().catch(() => ({}))) as { code?: string }).code);
  if (!code) return NextResponse.json({ error: "Which sign-in?" }, { status: 400 });
  const done = await takeHandoff(code);
  if (!done) return NextResponse.json({ waiting: true }, { headers: { "cache-control": "no-store" } });
  const res = NextResponse.json({ to: done.next }, { headers: { "cache-control": "no-store" } });
  // The account the app was using stays signed in, to switch back to (owner, 4 Nov 2026: Add Account).
  await signInDevice(req, res, done.userId);
  return res;
}
