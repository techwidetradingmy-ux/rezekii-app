import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, SIGNED_IN_COOKIE, createSession, sessionCookieOptions, signedInCookieOptions } from "@/modules/accounts/session.ts";
import { handoffCode, takeHandoff } from "@/modules/accounts/handoff.ts";

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
  const { token, expires } = await createSession(done.userId);
  const res = NextResponse.json({ to: done.next }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expires));
  res.cookies.set(SIGNED_IN_COOKIE, "1", signedInCookieOptions(expires));
  return res;
}
